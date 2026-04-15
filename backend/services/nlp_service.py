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


def compute_wpm_timeseries(transcript: str, duration_secs: float, chunk_secs: int = 30) -> list[dict]:
    """
    Estimate WPM per chunk window.
    Words are spread uniformly across duration (Whisper doesn't return per-word timestamps).
    WPM is calculated from each chunk's *actual* elapsed time so it matches compute_wpm_avg.

    Previously used chunk_secs=60 as the divisor even for recordings shorter than 60 s,
    producing WPM values far below the overall average and only 1 data point (chart invisible).
    Now chunk_secs is scaled down for short recordings to ensure >= 2 data points.

    Returns [{ time_sec: int, wpm: float }, ...].
    """
    if not transcript or duration_secs <= 0:
        return []

    words = transcript.split()
    total_words = len(words)
    if total_words == 0:
        return []

    # Scale chunk size down for short recordings so we produce >= 2 data points.
    if duration_secs < chunk_secs:
        chunk_secs = max(5, int(duration_secs / 2))

    n_chunks = max(1, int(duration_secs / chunk_secs))

    result: list[dict] = []
    for i in range(n_chunks):
        time_sec = i * chunk_secs
        # Last chunk may be shorter — use actual elapsed time, not fixed chunk_secs.
        actual_dur = chunk_secs if i < n_chunks - 1 else max(1.0, duration_secs - time_sec)
        # Words proportional to this chunk's share of total duration.
        # This ensures wpm == compute_wpm_avg for every chunk (uniform distribution).
        chunk_words = total_words * (actual_dur / duration_secs)
        wpm = (chunk_words / actual_dur) * 60
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
