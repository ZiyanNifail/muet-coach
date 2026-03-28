"""
Whisper transcription service — T2.10.

Primary:  Groq Whisper API (whisper-large-v3-turbo) — cloud inference, ~100x faster.
Fallback: local openai-whisper tiny model if Groq unavailable.

Groq Whisper processes chunks in parallel; local Whisper runs in a thread pool.
"""
import os
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

_local_model = None
_executor = ThreadPoolExecutor(max_workers=2)


# ── Groq Whisper (primary) ────────────────────────────────────────────────────

def _transcribe_chunk_groq(chunk_path: str) -> str:
    """Transcribe one audio chunk via Groq Whisper API."""
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return _transcribe_chunk_local(chunk_path)
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        with open(chunk_path, "rb") as f:
            file_bytes = f.read()
        result = client.audio.transcriptions.create(
            file=(os.path.basename(chunk_path), file_bytes),
            model="whisper-large-v3-turbo",
            language="en",
            response_format="text",
        )
        # response_format="text" returns a plain string
        text = result if isinstance(result, str) else getattr(result, "text", str(result))
        return text.strip()
    except Exception as exc:
        logger.warning("Groq Whisper failed for %s: %s — falling back to local Whisper", chunk_path, exc)
        return _transcribe_chunk_local(chunk_path)


# ── Local Whisper (fallback) ──────────────────────────────────────────────────

def _load_local_model():
    global _local_model
    if _local_model is None:
        try:
            import whisper
            model_name = os.getenv("WHISPER_MODEL", "tiny")
            logger.info("Loading local Whisper model: %s", model_name)
            _local_model = whisper.load_model(model_name)
        except ImportError:
            logger.warning(
                "openai-whisper not installed and Groq fallback failed. "
                "Install with: pip install openai-whisper torch"
            )
            _local_model = None
    return _local_model


def _transcribe_chunk_local(chunk_path: str) -> str:
    model = _load_local_model()
    if model is None:
        return ""
    try:
        result = model.transcribe(chunk_path, language="en", fp16=False)
        return result.get("text", "").strip()
    except Exception as exc:
        logger.warning("Local Whisper failed for %s: %s", chunk_path, exc)
        return ""


# ── Public API ────────────────────────────────────────────────────────────────

async def transcribe_chunks(chunk_paths: list[str]) -> str:
    """
    Transcribe audio chunks in parallel using Groq Whisper.
    Falls back to local Whisper if Groq is unavailable.
    Returns the concatenated transcript.
    """
    if not chunk_paths:
        return ""

    loop = asyncio.get_event_loop()
    # Process all chunks concurrently
    tasks = [
        loop.run_in_executor(_executor, _transcribe_chunk_groq, path)
        for path in chunk_paths
    ]
    texts = await asyncio.gather(*tasks)
    transcript = " ".join(t for t in texts if t).strip()
    logger.info("Transcription complete: %d words", len(transcript.split()))
    return transcript


async def transcribe(audio_path: str) -> dict:
    """Transcribe a single WAV file. Returns { transcript, audio_ok }."""
    try:
        text = await transcribe_chunks([audio_path])
        return {"transcript": text, "audio_ok": bool(text)}
    except Exception as exc:
        logger.error("transcribe failed: %s", exc)
        return {"transcript": "", "audio_ok": False, "error": str(exc)}
