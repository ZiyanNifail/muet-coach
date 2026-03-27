"""
NLP analysis — T2.12 (filler detection) and T2.13 (WPM timeseries).

Pure-Python; no external AI dependencies.
"""
import re
from typing import Any

# Filler patterns (case-insensitive whole-word match)
FILLER_PATTERNS = re.compile(
    r"\b(um+|uh+|ah+|er+|like|you know|you know what i mean|so|basically|actually|right|okay|ok)\b",
    re.IGNORECASE,
)

# Words that are likely filler "like/so/actually/right/okay" — only count standalone
STANDALONE_FILLERS = {"um", "uh", "ah", "er", "like", "you know"}


def detect_fillers(transcript: str) -> dict:
    """
    Count filler words in transcript.
    Returns { filler_count: int, filler_positions: list[int], marked_transcript: str }
    where marked_transcript wraps each filler in [brackets].
    """
    if not transcript:
        return {"filler_count": 0, "filler_positions": [], "marked_transcript": ""}

    positions: list[int] = []
    marked = transcript

    # Simple word-level pass for core fillers
    words = transcript.split()
    core_filler_count = 0
    marked_words: list[str] = []
    for w in words:
        clean = re.sub(r"[^\w]", "", w).lower()
        if clean in STANDALONE_FILLERS:
            marked_words.append(f"[{clean}]")
            core_filler_count += 1
        else:
            marked_words.append(w)
    marked = " ".join(marked_words)

    return {
        "filler_count": core_filler_count,
        "marked_transcript": marked,
    }


def compute_wpm_timeseries(transcript: str, duration_secs: float, chunk_secs: int = 60) -> list[dict]:
    """
    Estimate WPM per `chunk_secs` window.
    Since transcript has no timestamps, words are spread uniformly across duration.
    Returns [{ time_sec: int, wpm: float }, ...].
    """
    if not transcript or duration_secs <= 0:
        return []

    words = transcript.split()
    total_words = len(words)
    if total_words == 0:
        return []

    n_chunks = max(1, int(duration_secs / chunk_secs))
    words_per_chunk = total_words / n_chunks

    result: list[dict] = []
    for i in range(n_chunks):
        time_sec = i * chunk_secs
        chunk_words = words_per_chunk
        wpm = (chunk_words / chunk_secs) * 60
        result.append({"time_sec": time_sec, "wpm": round(wpm, 1)})

    return result


def compute_wpm_avg(transcript: str, duration_secs: float) -> float:
    """Overall words-per-minute."""
    if not transcript or duration_secs <= 0:
        return 0.0
    words = len(transcript.split())
    return round((words / duration_secs) * 60, 1)


def compute_lexical_diversity(transcript: str) -> float:
    """Type-token ratio (unique words / total words). Capped at 1.0."""
    if not transcript:
        return 0.5
    words = re.findall(r"\b\w+\b", transcript.lower())
    if len(words) == 0:
        return 0.5
    return round(len(set(words)) / len(words), 3)
