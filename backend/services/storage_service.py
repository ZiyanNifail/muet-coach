"""
Supabase Storage service — T4.06.

Handles:
  - Rubric PDF upload / signed URL  (bucket: rubrics)
  - Video upload / signed URL        (bucket: recordings)
  - 90-day retention cleanup         (T4.07)

Video compression note:
  Supabase Storage free tier caps files at 50 MB.
  Raw browser WebM recordings (5 min) can exceed 150 MB.
  compress_video_for_storage() re-encodes to 480p H.264 (CRF 28) using ffmpeg,
  bringing a 5-min session to ~15–20 MB — well under the cap.
  ffmpeg is already required for audio extraction (T2.08).
"""
import os
import subprocess
import logging
from services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

RUBRICS_BUCKET = "rubrics"
RECORDINGS_BUCKET = "recordings"
SIGNED_URL_EXPIRY = 3600  # 1 hour


def _sb():
    return get_supabase()


# ── Video compression ────────────────────────────────────────────────────────

def compress_video_for_storage(input_path: str, output_path: str) -> str:
    """
    Re-encode video to 480p H.264 (CRF 28) + AAC 64k audio using ffmpeg.

    Typical output sizes (well under Supabase's 50 MB free-tier cap):
      - 2-min exam session  →  ~6–8 MB
      - 5-min guided session →  ~15–20 MB

    Returns output_path on success, or input_path if ffmpeg fails
    (so the upload can still proceed with the original file).
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        # Video: libx264, scale to 480p preserving aspect ratio, CRF 28, fast encode
        "-vf", "scale='if(gt(iw,ih),854,-2)':'if(gt(iw,ih),-2,480)'",
        "-c:v", "libx264",
        "-crf", "28",
        "-preset", "fast",
        "-movflags", "+faststart",
        # Audio: AAC 64 kbps (sufficient for speech)
        "-c:a", "aac",
        "-b:a", "64k",
        "-ac", "1",
        output_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0 and os.path.exists(output_path):
            original_mb = os.path.getsize(input_path) / (1024 * 1024)
            compressed_mb = os.path.getsize(output_path) / (1024 * 1024)
            logger.info(
                "Video compressed: %.1f MB → %.1f MB (%.0f%% reduction)",
                original_mb, compressed_mb,
                (1 - compressed_mb / original_mb) * 100 if original_mb > 0 else 0,
            )
            return output_path
        else:
            logger.warning("ffmpeg compression failed (returncode %d): %s",
                           result.returncode, result.stderr[:300])
            return input_path
    except Exception as exc:
        logger.warning("Video compression error: %s — using original file", exc)
        return input_path


# ── Rubric PDF ───────────────────────────────────────────────────────────────

def upload_rubric(course_id: str, file_bytes: bytes) -> str | None:
    """Upload a PDF rubric for a course. Returns the storage path or None."""
    sb = _sb()
    if sb is None:
        return None
    path = f"{course_id}/rubric.pdf"
    try:
        sb.storage.from_(RUBRICS_BUCKET).upload(
            path, file_bytes,
            {"content-type": "application/pdf", "upsert": "true"},
        )
        return path
    except Exception as exc:
        logger.warning("Rubric upload failed: %s", exc)
        return None


def get_rubric_signed_url(rubric_path: str) -> str | None:
    """Return a 1-hour signed URL for a rubric PDF."""
    sb = _sb()
    if sb is None or not rubric_path:
        return None
    try:
        res = sb.storage.from_(RUBRICS_BUCKET).create_signed_url(
            rubric_path, SIGNED_URL_EXPIRY
        )
        return res.get("signedURL") or (res.get("data") or {}).get("signedURL")
    except Exception as exc:
        logger.warning("Rubric signed URL failed: %s", exc)
        return None


# ── Video recordings ─────────────────────────────────────────────────────────

def upload_video(student_id: str, presentation_id: str, file_bytes: bytes,
                 content_type: str = "video/webm") -> str | None:
    """Upload processed video to Supabase Storage. Returns storage path or None."""
    sb = _sb()
    if sb is None:
        return None
    path = f"{student_id}/{presentation_id}/video.webm"
    try:
        sb.storage.from_(RECORDINGS_BUCKET).upload(
            path, file_bytes,
            {"content-type": content_type, "upsert": "true"},
        )
        return path
    except Exception as exc:
        logger.warning("Video upload to storage failed: %s", exc)
        return None


def get_video_signed_url(video_storage_path: str) -> str | None:
    """Return a 1-hour signed URL for a recording."""
    sb = _sb()
    if sb is None or not video_storage_path:
        return None
    try:
        res = sb.storage.from_(RECORDINGS_BUCKET).create_signed_url(
            video_storage_path, SIGNED_URL_EXPIRY
        )
        return res.get("signedURL") or (res.get("data") or {}).get("signedURL")
    except Exception as exc:
        logger.warning("Video signed URL failed: %s", exc)
        return None


# ── 90-day retention cleanup (T4.07) ────────────────────────────────────────

def run_retention_cleanup() -> None:
    """
    Weekly job: delete recordings older than 90 days from Supabase Storage.
    Called by APScheduler.
    """
    sb = _sb()
    if sb is None:
        logger.warning("Retention cleanup skipped — Supabase not configured.")
        return

    from datetime import datetime, timezone, timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)

    try:
        # Find presentations older than 90 days that have a storage path
        res = (
            sb.table("presentations")
            .select("id, student_id, video_path")
            .lt("uploaded_at", cutoff.isoformat())
            .execute()
        )
        rows = res.data or []
        deleted = 0

        for row in rows:
            storage_path = f"{row['student_id']}/{row['id']}/video.webm"
            try:
                sb.storage.from_(RECORDINGS_BUCKET).remove([storage_path])
                # Null out the video_path so we don't try again
                sb.table("presentations").update(
                    {"video_path": None}
                ).eq("id", row["id"]).execute()
                deleted += 1
            except Exception:
                pass

        logger.info("Retention cleanup: removed %d recordings older than 90 days.", deleted)
    except Exception as exc:
        logger.error("Retention cleanup error: %s", exc)
