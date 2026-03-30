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

def _transcribe_chunk_groq(chunk_path: str, with_clarity: bool = False) -> tuple[str, float | None]:
    """
    Transcribe one audio chunk via Groq Whisper API.

    Args:
        chunk_path:   Path to the audio chunk file.
        with_clarity: When True, use verbose_json to extract avg_logprob.

    Returns:
        (text, avg_logprob) — avg_logprob is None unless with_clarity=True.
    """
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        text = _transcribe_chunk_local(chunk_path)
        avg_logprob = _local_chunk_logprob(chunk_path) if with_clarity else None
        return text, avg_logprob
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        with open(chunk_path, "rb") as f:
            file_bytes = f.read()

        if with_clarity:
            result = client.audio.transcriptions.create(
                file=(os.path.basename(chunk_path), file_bytes),
                model="whisper-large-v3-turbo",
                language="en",
                response_format="verbose_json",
            )
            text = getattr(result, "text", "") or ""
            segments = getattr(result, "segments", None) or []
            if segments:
                logprobs = [
                    seg.get("avg_logprob") if isinstance(seg, dict) else getattr(seg, "avg_logprob", None)
                    for seg in segments
                ]
                logprobs = [lp for lp in logprobs if lp is not None]
                avg_logprob = float(sum(logprobs) / len(logprobs)) if logprobs else None
            else:
                avg_logprob = None
            return text.strip(), avg_logprob
        else:
            result = client.audio.transcriptions.create(
                file=(os.path.basename(chunk_path), file_bytes),
                model="whisper-large-v3-turbo",
                language="en",
                response_format="text",
            )
            # response_format="text" returns a plain string
            text = result if isinstance(result, str) else getattr(result, "text", str(result))
            return text.strip(), None
    except Exception as exc:
        logger.warning("Groq Whisper failed for %s: %s — falling back to local Whisper", chunk_path, exc)
        text = _transcribe_chunk_local(chunk_path)
        avg_logprob = _local_chunk_logprob(chunk_path) if with_clarity else None
        return text, avg_logprob


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


def _local_chunk_logprob(chunk_path: str) -> float | None:
    """Extract avg_logprob from local Whisper transcription for voice clarity."""
    model = _load_local_model()
    if model is None:
        return None
    try:
        result = model.transcribe(chunk_path, language="en", fp16=False)
        segments = result.get("segments", [])
        if segments:
            logprobs = [seg.get("avg_logprob") for seg in segments if seg.get("avg_logprob") is not None]
            return float(sum(logprobs) / len(logprobs)) if logprobs else None
        return None
    except Exception as exc:
        logger.warning("Local Whisper logprob failed for %s: %s", chunk_path, exc)
        return None


# ── Public API ────────────────────────────────────────────────────────────────

async def transcribe_chunks(chunk_paths: list[str]) -> str:
    """
    Transcribe audio chunks in parallel using Groq Whisper.
    Falls back to local Whisper if Groq is unavailable.
    Returns the concatenated transcript.
    Kept unchanged for backward compatibility.
    """
    if not chunk_paths:
        return ""

    loop = asyncio.get_event_loop()
    # Process all chunks concurrently — with_clarity=False (default behaviour)
    tasks = [
        loop.run_in_executor(_executor, _transcribe_chunk_groq, path, False)
        for path in chunk_paths
    ]
    results = await asyncio.gather(*tasks)
    texts = [text for text, _ in results]
    transcript = " ".join(t for t in texts if t).strip()
    logger.info("Transcription complete: %d words", len(transcript.split()))
    return transcript


async def transcribe_chunks_with_clarity(chunk_paths: list[str]) -> tuple[str, float | None]:
    """
    Transcribe audio chunks and extract voice clarity (avg_logprob).

    Returns:
        (transcript, avg_logprob) where avg_logprob is the mean across all chunks,
        or None if it could not be extracted.
        The clarity_score conversion (0–100) is performed by the caller.
    """
    if not chunk_paths:
        return "", None

    loop = asyncio.get_event_loop()
    tasks = [
        loop.run_in_executor(_executor, _transcribe_chunk_groq, path, True)
        for path in chunk_paths
    ]
    results = await asyncio.gather(*tasks)

    texts = []
    logprobs = []
    for text, lp in results:
        if text:
            texts.append(text)
        if lp is not None:
            logprobs.append(lp)

    transcript = " ".join(texts).strip()
    avg_logprob = float(sum(logprobs) / len(logprobs)) if logprobs else None

    logger.info(
        "Transcription+clarity complete: %d words, avg_logprob=%s",
        len(transcript.split()),
        avg_logprob,
    )
    return transcript, avg_logprob


async def transcribe(audio_path: str) -> dict:
    """Transcribe a single WAV file. Returns { transcript, audio_ok }."""
    try:
        text = await transcribe_chunks([audio_path])
        return {"transcript": text, "audio_ok": bool(text)}
    except Exception as exc:
        logger.error("transcribe failed: %s", exc)
        return {"transcript": "", "audio_ok": False, "error": str(exc)}
