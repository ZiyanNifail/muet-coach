"""
NLP analysis — T2.12 (filler detection) and T2.13 (WPM timeseries).

Pure-Python; no external AI dependencies.
"""
import re
from typing import Any

# Single-word fillers (matched after stripping punctuation)
STANDALONE_FILLERS = {"um", "uh", "ah", "er", "hmm", "like", "so", "basically",
                      "actually", "right", "okay", "ok", "well", "literally"}

# Multi-word filler phrases — checked first via regex substitution
PHRASE_FILLERS = re.compile(
    r"\b(you know what i mean|you know|i mean|sort of|kind of)\b",
    re.IGNORECASE,
)


def detect_fillers(transcript: str) -> dict:
    """
    Count filler words/phrases in transcript.
    Returns { filler_count: int, marked_transcript: str }
    where marked_transcript wraps each filler in [brackets].

    Multi-word phrases are matched first (regex), then single words.
    """
    if not transcript:
        return {"filler_count": 0, "marked_transcript": ""}

    filler_count = 0

    # Step 1: replace multi-word filler phrases with [phrase] tokens
    def _replace_phrase(m: re.Match) -> str:
        nonlocal filler_count
        filler_count += 1
        return f"[{m.group(0).lower()}]"

    marked = PHRASE_FILLERS.sub(_replace_phrase, transcript)

    # Step 2: word-level pass for single-word fillers
    tokens = marked.split()
    result_tokens: list[str] = []
    for tok in tokens:
        if tok.startswith("["):
            # Already a tagged phrase — preserve it
            result_tokens.append(tok)
            continue
        clean = re.sub(r"[^\w]", "", tok).lower()
        if clean in STANDALONE_FILLERS:
            result_tokens.append(f"[{clean}]")
            filler_count += 1
        else:
            result_tokens.append(tok)

    return {
        "filler_count": filler_count,
        "marked_transcript": " ".join(result_tokens),
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


_DISCOURSE_MARKERS = re.compile(
    r"\b(firstly|secondly|thirdly|finally|furthermore|moreover|however|therefore|"
    r"in addition|in conclusion|to summarise|to summarize|to conclude|for example|"
    r"for instance|on the other hand|in contrast|as a result|consequently|"
    r"in my opinion|to begin with|additionally|nevertheless|nonetheless|"
    r"having said that|that said|in other words|to illustrate)\b",
    re.IGNORECASE,
)


def count_discourse_markers(transcript: str) -> int:
    """Count occurrences of discourse markers/cohesive devices in transcript."""
    if not transcript:
        return 0
    return len(_DISCOURSE_MARKERS.findall(transcript))


def compute_sentence_stats(transcript: str) -> dict:
    """Return sentence_count and sentence_length_variance for grammatical range scoring."""
    if not transcript:
        return {"sentence_count": 0, "sentence_length_variance": 0.0}
    sentences = [s.strip() for s in re.split(r"[.!?]+", transcript) if s.strip()]
    if not sentences:
        return {"sentence_count": 0, "sentence_length_variance": 0.0}
    lengths = [len(s.split()) for s in sentences]
    mean = sum(lengths) / len(lengths)
    variance = sum((l - mean) ** 2 for l in lengths) / len(lengths) if len(lengths) > 1 else 0.0
    return {"sentence_count": len(sentences), "sentence_length_variance": round(variance, 1)}
