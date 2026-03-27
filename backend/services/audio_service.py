"""
Audio preprocessing — T2.08.

Extracts WAV from the recorded WebM/MP4 using ffmpeg, then chunks it
into 60-second segments for Whisper transcription.

Requires: ffmpeg on PATH.
"""
import subprocess
import os
import math


def extract_wav(video_path: str, out_path: str) -> str:
    """
    Extract audio from video as 16kHz mono WAV (optimal for Whisper).
    Returns path to the WAV file.
    Raises RuntimeError if ffmpeg is unavailable or conversion fails.
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        out_path,
    ]
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg audio extraction failed: {result.stderr[:400]}")
    return out_path


def chunk_wav(wav_path: str, out_dir: str, chunk_secs: int = 60) -> list[str]:
    """
    Split WAV into chunks of `chunk_secs` seconds.
    Returns ordered list of chunk file paths.
    """
    os.makedirs(out_dir, exist_ok=True)
    # Get duration first
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            wav_path,
        ],
        capture_output=True, text=True,
    )
    try:
        duration = float(probe.stdout.strip())
    except ValueError:
        # Can't probe; treat as single chunk
        return [wav_path]

    n_chunks = max(1, math.ceil(duration / chunk_secs))
    chunk_paths: list[str] = []
    for i in range(n_chunks):
        start = i * chunk_secs
        out = os.path.join(out_dir, f"chunk_{i:03d}.wav")
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start),
            "-t", str(chunk_secs),
            "-i", wav_path,
            out,
        ]
        subprocess.run(cmd, capture_output=True)
        if os.path.exists(out):
            chunk_paths.append(out)

    return chunk_paths if chunk_paths else [wav_path]
