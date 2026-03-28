"""
AI pipeline orchestrator — T2.08–T2.19.

Called as a FastAPI BackgroundTask after video upload.
Runs: audio extraction → Whisper → MediaPipe → NLP → CEFR → Groq → DB write.
"""
import os
import shutil
import asyncio
import logging

from services.audio_service import extract_wav, chunk_wav
from services.video_service import extract_frames
from services.whisper_service import transcribe_chunks
from services.mediapipe_service import analyse_video
from services.nlp_service import (
    detect_fillers,
    compute_wpm_avg,
    compute_wpm_timeseries,
    compute_lexical_diversity,
)
from services.cefr_evaluator import compute_band_score
from services.groq_service import generate_feedback
from services.supabase_client import (
    db_update_presentation,
    db_insert_report,
    db_insert_session_history,
)
from services.storage_service import compress_video_for_storage, upload_video

logger = logging.getLogger(__name__)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")


async def run_pipeline(
    presentation_id: str,
    student_id: str,
    video_path: str,
    duration_secs: float,
    topic: str = "",
) -> None:
    """
    Full AI analysis pipeline. Writes results to Supabase.
    Called as a background task — errors are caught and status set to 'failed'.
    """
    work_dir = os.path.join(UPLOAD_DIR, presentation_id)
    os.makedirs(work_dir, exist_ok=True)

    try:
        # ── T2.08  Audio extraction ──────────────────────────────────────────
        wav_path = os.path.join(work_dir, "audio.wav")
        audio_ok = True
        try:
            extract_wav(video_path, wav_path)
            chunk_dir = os.path.join(work_dir, "chunks")
            chunk_paths = chunk_wav(wav_path, chunk_dir)
        except Exception as exc:
            logger.warning("Audio extraction failed: %s", exc)
            audio_ok = False
            chunk_paths = []

        # ── T2.10  Whisper transcription ─────────────────────────────────────
        transcript = ""
        if audio_ok and chunk_paths:
            try:
                transcript = await transcribe_chunks(chunk_paths)
            except Exception as exc:
                logger.warning("Whisper failed: %s", exc)

        # ── T2.14 / T2.15  MediaPipe ─────────────────────────────────────────
        vision_results = await _run_mediapipe(video_path)
        eye_contact_pct: float | None = vision_results["eye_contact_pct"]
        posture_score: float | None = vision_results["posture_score"]
        confidence_flags = vision_results["confidence_flags"]
        confidence_flags["audio_ok"] = audio_ok and bool(transcript)

        # ── T2.12 / T2.13  NLP ───────────────────────────────────────────────
        filler_data = detect_fillers(transcript)
        filler_count: int = filler_data["filler_count"]
        marked_transcript: str = filler_data.get("marked_transcript", transcript)
        filler_density = round((filler_count / duration_secs) * 60, 2) if duration_secs > 0 else 0.0

        wpm_avg = compute_wpm_avg(transcript, duration_secs)
        pace_timeseries = compute_wpm_timeseries(transcript, duration_secs)
        lexical_diversity = compute_lexical_diversity(transcript)

        # ── T2.16  CEFR band (rule-based) ────────────────────────────────────
        # Pass None through for N/A metrics — cefr_evaluator skips them
        # rather than defaulting to 0 (CRIT-04 fix).
        rule_band = compute_band_score(
            wpm_avg=wpm_avg,
            eye_contact_pct=eye_contact_pct,
            filler_density=filler_density,
            posture_score=posture_score,
            lexical_diversity=lexical_diversity,
        )

        # ── T2.18  Groq feedback ──────────────────────────────────────────────
        metrics_for_groq = {
            "wpm_avg": wpm_avg,
            "eye_contact_pct": eye_contact_pct,
            "filler_density": filler_density,
            "posture_score": posture_score,
            "lexical_diversity": lexical_diversity,
            "duration_secs": duration_secs,
        }
        groq_result = await generate_feedback(transcript, metrics_for_groq)

        # LLM band takes precedence if available; otherwise rule-based
        final_band = groq_result["band_score"] or rule_band
        advice_cards = groq_result["advice_cards"]

        # ── T2.19  Persist report ─────────────────────────────────────────────
        report = {
            "presentation_id": presentation_id,
            "band_score": final_band,
            "wpm_avg": wpm_avg,
            "filler_count": filler_count,
            "filler_density": filler_density,
            "eye_contact_pct": eye_contact_pct,
            "posture_score": posture_score,
            "transcript": marked_transcript,
            "pace_timeseries": pace_timeseries,
            "advice_cards": advice_cards,
            "confidence_flags": confidence_flags,
        }
        report_id = await db_insert_report(report)

        if report_id and student_id:
            await db_insert_session_history(student_id, report_id)

        # ── T4.06  Compress + upload video to Supabase Storage ───────────────
        await _store_video(presentation_id, student_id, video_path, work_dir)

        await db_update_presentation(presentation_id, {"status": "complete"})
        logger.info("Pipeline complete for %s — band %.1f", presentation_id, final_band)

    except Exception as exc:
        logger.error("Pipeline failed for %s: %s", presentation_id, exc, exc_info=True)
        await db_update_presentation(presentation_id, {"status": "failed"})
    finally:
        # Clean up temp frames/chunks to save disk space; keep wav + video
        _cleanup(os.path.join(work_dir, "chunks"))
        _cleanup(os.path.join(work_dir, "frames"))


async def _store_video(
    presentation_id: str,
    student_id: str,
    video_path: str,
    work_dir: str,
) -> None:
    """
    Compress the recording to 480p H.264 then upload to Supabase Storage.
    Updates presentations.video_path with the storage key on success.
    Non-fatal — errors are logged but do not fail the pipeline.
    """
    loop = asyncio.get_event_loop()
    try:
        compressed_path = os.path.join(work_dir, "video_compressed.mp4")
        upload_path = await loop.run_in_executor(
            None,
            compress_video_for_storage,
            video_path,
            compressed_path,
        )
        storage_key = await loop.run_in_executor(
            None,
            upload_video,
            student_id,
            presentation_id,
            open(upload_path, "rb").read(),
            "video/mp4",
        )
        if storage_key:
            await db_update_presentation(presentation_id, {"video_path": storage_key})
            logger.info("Video stored at %s", storage_key)
        else:
            logger.info("Supabase Storage not configured — video kept locally only.")
    except Exception as exc:
        logger.warning("Video storage step failed (non-fatal): %s", exc)


async def _run_mediapipe(video_path: str) -> dict:
    """Run MediaPipe in a thread so it doesn't block the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _mediapipe_sync, video_path)


def _mediapipe_sync(video_path: str) -> dict:
    """Synchronous wrapper for analyse_video (mediapipe is sync)."""
    import asyncio as _asyncio
    # analyse_video is declared async but its body is sync (no awaits)
    # Run a fresh event loop in this thread
    loop = _asyncio.new_event_loop()
    try:
        return loop.run_until_complete(analyse_video(video_path))
    finally:
        loop.close()


def _cleanup(directory: str) -> None:
    try:
        if os.path.isdir(directory):
            shutil.rmtree(directory)
    except Exception:
        pass
