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
from services.whisper_service import transcribe_chunks, transcribe_chunks_with_clarity
from services.mediapipe_service import analyse_video
from services.nlp_service import (
    detect_fillers,
    compute_wpm_avg,
    compute_wpm_timeseries,
    compute_lexical_diversity,
    count_discourse_markers,
    compute_sentence_stats,
)
from services.cefr_evaluator import compute_band_score, compute_subband_scores
from services.groq_service import generate_feedback
from services.supabase_client import (
    db_update_presentation,
    db_insert_report,
    db_insert_session_history,
)
from services.storage_service import compress_video_for_storage, upload_video
from services.voice_dynamics_service import analyse_voice_dynamics
from services.sentiment_service import analyse_sentiment

logger = logging.getLogger(__name__)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")


def compute_confidence_score(
    band_score, eye_contact_pct, posture_score,
    voice_clarity_score, sentiment_score, wpm_avg, filler_density
) -> float | None:
    """
    T3.04A — Composite confidence score (0–100).

    Weights:
        band_score        30%
        eye_contact_pct   20%
        posture_score     15%
        voice_clarity     15%
        pace (wpm)        10%
        sentiment         10%
    A filler penalty (up to −15) is applied after normalisation.
    Returns None if no components are available.
    """
    score = 0.0
    weight = 0.0
    if band_score is not None:
        score += ((band_score - 1) / 5) * 100 * 0.30
        weight += 0.30
    if eye_contact_pct is not None:
        score += eye_contact_pct * 0.20
        weight += 0.20
    if posture_score is not None:
        score += posture_score * 0.15
        weight += 0.15
    if voice_clarity_score is not None:
        score += voice_clarity_score * 0.15
        weight += 0.15
    if wpm_avg is not None:
        pace_score = max(0.0, 100.0 - abs(wpm_avg - 140) * 2.0)
        score += pace_score * 0.10
        weight += 0.10
    if sentiment_score is not None:
        score += sentiment_score * 100 * 0.10
        weight += 0.10
    if weight < 0.01:
        return None
    result = score / weight
    if filler_density is not None:
        result = max(0.0, result - min(15.0, filler_density * 2.0))
    return round(result, 1)


async def run_pipeline(
    presentation_id: str,
    student_id: str,
    video_path: str,
    duration_secs: float,
    topic: str = "",
    session_mode: str = "unguided",
) -> None:
    """
    Full AI analysis pipeline. Writes results to Supabase.
    Called as a background task — errors are caught and status set to 'failed'.
    """
    work_dir = os.path.join(UPLOAD_DIR, presentation_id)
    os.makedirs(work_dir, exist_ok=True)

    try:
        wav_path = os.path.join(work_dir, "audio.wav")
        chunk_dir = os.path.join(work_dir, "chunks")

        # ── Parallelise: start MediaPipe immediately — it only needs video_path
        # and is fully independent of the audio pipeline.  The audio branch
        # (extract → chunk → Whisper) runs while MediaPipe processes frames.
        mediapipe_task = asyncio.create_task(_run_mediapipe(video_path))
        # Yield to the event loop so mediapipe_task can reach run_in_executor
        # and submit its thread-pool work *before* the blocking audio extraction
        # starts.  Without this yield, create_task only schedules the coroutine
        # but doesn't run it until the next await point.
        await asyncio.sleep(0)
        logger.info("MediaPipe task started in background for %s", presentation_id)

        # ── T2.08  Audio extraction ──────────────────────────────────────────
        audio_ok = True
        chunk_paths: list = []
        try:
            extract_wav(video_path, wav_path)
            chunk_paths = chunk_wav(wav_path, chunk_dir)
        except Exception as exc:
            logger.warning("Audio extraction failed: %s", exc)
            audio_ok = False

        # ── T2.12A  Voice dynamics (librosa) — start in parallel with Whisper ─
        # librosa.pyin is the slowest step; launch it now so it overlaps with
        # Whisper, sentiment, and MediaPipe instead of running after all three.
        _vd_loop = asyncio.get_event_loop()
        voice_dynamics_future = (
            _vd_loop.run_in_executor(None, analyse_voice_dynamics, wav_path)
            if audio_ok and os.path.exists(wav_path)
            else None
        )

        # ── T2.10  Whisper transcription + T2.12C voice clarity ─────────────
        transcript = ""
        voice_clarity_score: float | None = None
        if audio_ok and chunk_paths:
            try:
                transcript, avg_logprob = await transcribe_chunks_with_clarity(chunk_paths)
                if avg_logprob is not None:
                    voice_clarity_score = round(max(0.0, min(100.0, (avg_logprob + 1.0) * 100.0)), 1)
            except Exception as exc:
                logger.warning("Whisper failed: %s", exc)

        # Guard: if transcript is empty after Whisper, mark audio as failed.
        # This prevents NLP + Groq from producing scores on silence (WARN-03 fix).
        if not transcript or len(transcript.split()) < 5:
            logger.warning("Transcript empty or too short for %s — marking audio_ok=False", presentation_id)
            audio_ok = False

        # ── T2.12B  Sentiment (VADER) ────────────────────────────────────────
        sentiment_score: float | None = None
        if transcript and len(transcript.split()) >= 5:
            loop = asyncio.get_event_loop()
            try:
                sentiment_score = await loop.run_in_executor(None, analyse_sentiment, transcript)
            except Exception as exc:
                logger.warning("Sentiment analysis failed: %s", exc)

        # ── T2.14 / T2.15  MediaPipe — await background task started above ───
        try:
            vision_results = await mediapipe_task
        except Exception as exc:
            logger.warning("MediaPipe task failed: %s", exc)
            vision_results = {"eye_contact_pct": None, "posture_score": None, "confidence_flags": {"face_ok": False}}

        eye_contact_pct: float | None = vision_results["eye_contact_pct"]
        posture_score: float | None = vision_results["posture_score"]
        eye_contact_timeline = vision_results.get("eye_contact_timeline")
        confidence_flags = vision_results["confidence_flags"]
        confidence_flags["audio_ok"] = audio_ok and bool(transcript)

        # ── T2.12A  Voice dynamics (librosa) — await parallel future ────────
        pitch_mean_hz: float | None = None
        energy_mean_db: float | None = None
        if voice_dynamics_future is not None:
            try:
                vd = await voice_dynamics_future
                pitch_mean_hz = vd.get("pitch_mean_hz")
                energy_mean_db = vd.get("energy_mean_db")
            except Exception as exc:
                logger.warning("Voice dynamics failed: %s", exc)

        # ── T2.12 / T2.13  NLP ───────────────────────────────────────────────
        filler_data = detect_fillers(transcript)
        filler_count: int = filler_data["filler_count"]
        marked_transcript: str = filler_data.get("marked_transcript", transcript)
        filler_density = round((filler_count / duration_secs) * 60, 2) if duration_secs > 0 else 0.0

        wpm_avg = compute_wpm_avg(transcript, duration_secs)
        pace_timeseries = compute_wpm_timeseries(transcript, duration_secs)
        lexical_diversity = compute_lexical_diversity(transcript)

        word_count = len(transcript.split()) if transcript else 0
        discourse_marker_count = count_discourse_markers(transcript) if transcript else 0
        sentence_stats = compute_sentence_stats(transcript) if transcript else {}
        sentence_length_variance: float | None = sentence_stats.get("sentence_length_variance")

        # ── T2.16  CEFR band (rule-based) ────────────────────────────────────
        # When no speech detected, skip CEFR entirely — filler_density=0 earns
        # a bonus and eye contact/posture inflate the score despite no speech.
        if audio_ok:
            rule_band = compute_band_score(
                wpm_avg=wpm_avg,
                eye_contact_pct=eye_contact_pct,
                filler_density=filler_density,
                posture_score=posture_score,
                lexical_diversity=lexical_diversity,
                duration_secs=duration_secs,
                word_count=word_count,
            )
            rule_subbands = compute_subband_scores(
                wpm_avg=wpm_avg,
                filler_density=filler_density,
                lexical_diversity=lexical_diversity,
                voice_clarity_score=voice_clarity_score,
                pitch_mean_hz=pitch_mean_hz,
                energy_mean_db=energy_mean_db,
                duration_secs=duration_secs,
                word_count=word_count,
                discourse_marker_count=discourse_marker_count,
                sentence_length_variance=sentence_length_variance,
            )
        else:
            rule_band = 1.0
            rule_subbands = None

        # ── T2.18  Groq feedback ──────────────────────────────────────────────
        metrics_for_groq = {
            "wpm_avg": wpm_avg,
            "eye_contact_pct": eye_contact_pct,
            "filler_density": filler_density,
            "posture_score": posture_score,
            "lexical_diversity": lexical_diversity,
            "word_count": word_count,
            "voice_clarity_score": voice_clarity_score,
            "discourse_marker_count": discourse_marker_count,
            "sentence_length_variance": sentence_length_variance,
            "duration_secs": duration_secs,
            "session_mode": session_mode,
        }
        groq_result = await generate_feedback(
            transcript, metrics_for_groq,
            rule_band=rule_band,
            rule_subbands=rule_subbands,
        )

        final_band = groq_result["band_score"] if groq_result["band_score"] is not None else rule_band
        advice_cards = groq_result["advice_cards"]
        rubric_bands = groq_result.get("rubric_bands")

        # ── T3.04A  Composite Confidence Score ───────────────────────────────
        confidence_score = compute_confidence_score(
            band_score=final_band,
            eye_contact_pct=eye_contact_pct,
            posture_score=posture_score,
            voice_clarity_score=voice_clarity_score,
            sentiment_score=sentiment_score,
            wpm_avg=wpm_avg,
            filler_density=filler_density,
        )

        # ── T2.19  Persist report ─────────────────────────────────────────────
        report = {
            "presentation_id": presentation_id,
            "band_score": final_band,
            "wpm_avg": wpm_avg,
            "filler_count": filler_count,
            "filler_density": filler_density,
            "eye_contact_pct": eye_contact_pct,
            "posture_score": posture_score,
            "eye_contact_timeline": eye_contact_timeline,
            "transcript": marked_transcript,
            "pace_timeseries": pace_timeseries,
            "advice_cards": advice_cards,
            "confidence_flags": confidence_flags,
            "pitch_mean_hz": pitch_mean_hz,
            "energy_mean_db": energy_mean_db,
            "sentiment_score": sentiment_score,
            "voice_clarity_score": voice_clarity_score,
            "confidence_score": confidence_score,
            "rubric_bands": rubric_bands,
        }
        report_id = await db_insert_report(report)
        if report_id is None:
            raise RuntimeError(f"db_insert_report returned None — report was not saved for {presentation_id}")

        if report_id and student_id:
            await db_insert_session_history(student_id, report_id)

        # ── T4.06  Compress + upload video to Supabase Storage ───────────────
        await _store_video(presentation_id, student_id, video_path, work_dir)

        await db_update_presentation(presentation_id, {"status": "complete"})
        logger.info("Pipeline complete for %s — band %.1f", presentation_id, final_band)

    except Exception as exc:
        logger.error("Pipeline failed for %s: %s", presentation_id, exc, exc_info=True)
        try:
            await db_update_presentation(presentation_id, {"status": "failed"})
        except Exception as db_exc:
            # If the status update itself fails (e.g. Supabase down), log and
            # continue — the finally block still runs cleanup.
            logger.error(
                "Could not mark presentation %s as failed: %s — it may remain stuck in 'processing'",
                presentation_id, db_exc,
            )
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
        with open(upload_path, "rb") as _fh:
            video_bytes = _fh.read()
        storage_key = await loop.run_in_executor(
            None,
            upload_video,
            student_id,
            presentation_id,
            video_bytes,
            "video/mp4",
        )
        if storage_key:
            await db_update_presentation(presentation_id, {"video_path": storage_key})
            logger.info("Video stored at %s", storage_key)
        else:
            logger.warning(
                "Supabase Storage upload returned no key for %s — the 'recordings' bucket "
                "may be missing/misconfigured. Video kept locally; report will stream it via "
                "/video-file. Create the private 'recordings' bucket to use signed URLs.",
                presentation_id,
            )
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
