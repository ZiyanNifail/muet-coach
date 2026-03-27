"""
Whisper transcription service — T2.10.

Loads openai-whisper tiny model once (lazy) and transcribes audio chunks
in a thread pool to avoid blocking the async event loop.
"""
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor

_model = None
_executor = ThreadPoolExecutor(max_workers=1)


def _load_model():
    global _model
    if _model is None:
        try:
            import whisper
            model_name = os.getenv("WHISPER_MODEL", "tiny")
            _model = whisper.load_model(model_name)
        except ImportError:
            _model = None
    return _model


def _transcribe_chunk(chunk_path: str) -> str:
    model = _load_model()
    if model is None:
        return ""
    result = model.transcribe(chunk_path, language="en", fp16=False)
    return result.get("text", "").strip()


async def transcribe_chunks(chunk_paths: list[str]) -> str:
    """
    Transcribe a list of audio chunk paths and concatenate the results.
    Runs in a background thread to avoid blocking the event loop.
    """
    if not chunk_paths:
        return ""

    loop = asyncio.get_event_loop()
    texts: list[str] = []
    for path in chunk_paths:
        text = await loop.run_in_executor(_executor, _transcribe_chunk, path)
        texts.append(text)

    return " ".join(t for t in texts if t).strip()


async def transcribe(audio_path: str) -> dict:
    """
    Transcribe a single WAV file.
    Returns { transcript: str, audio_ok: bool }
    """
    try:
        text = await transcribe_chunks([audio_path])
        return {"transcript": text, "audio_ok": bool(text)}
    except Exception as exc:
        return {"transcript": "", "audio_ok": False, "error": str(exc)}
