"""
Presentations router — T2.06.

POST /api/presentations/upload
  Receives multipart video, saves to disk, creates DB record, queues pipeline.
  Returns { presentation_id, status: "processing" }

GET /api/presentations/{id}/status
  Returns { presentation_id, status }
"""
import os
import uuid
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Header, Depends
from pydantic import BaseModel
from typing import Optional, List

from services.supabase_client import get_supabase, db_update_presentation, db_get_assignment
from services.pipeline import run_pipeline
from services.storage_service import get_video_signed_url
from services.auth_deps import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
ALLOWED_TYPES = {"video/webm", "video/mp4", "video/quicktime", "audio/webm"}
MAX_SIZE_MB = 500


class UploadResponse(BaseModel):
    presentation_id: str
    status: str
    message: str


@router.post("/upload", response_model=UploadResponse)
async def upload_presentation(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    student_id: str = Form(...),
    session_mode: str = Form(...),
    topic_id: Optional[str] = Form(None),
    topic_text: Optional[str] = Form(None),
    brainstorm_notes: Optional[str] = Form(None),
    duration_secs: Optional[float] = Form(None),
    assignment_id: Optional[str] = Form(None),
    slides: Optional[UploadFile] = File(None),
    authorization: Optional[str] = Header(None),
):
    # ── Validate content type ────────────────────────────────────────────────
    ct = (video.content_type or "").split(";")[0].strip()
    if ct not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {ct}. Must be video/webm or video/mp4.")

    # ── Assignment lookup + deadline/slide enforcement ───────────────────────
    assignment_row = None
    if assignment_id:
        assignment_row = db_get_assignment(assignment_id)
        if not assignment_row:
            raise HTTPException(404, "Assignment not found.")
        deadline = assignment_row.get("deadline")
        if deadline:
            from datetime import datetime, timezone
            try:
                dl = datetime.fromisoformat(str(deadline).replace("Z", "+00:00"))
                if dl.tzinfo is None:
                    dl = dl.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) > dl:
                    raise HTTPException(400, "Assignment deadline has passed — resubmissions are not allowed.")
            except ValueError:
                pass
        if assignment_row.get("slide_required") and not (slides and slides.filename):
            raise HTTPException(400, "This assignment requires a slide deck upload.")

    # ── CRIT-03 fix: validate student_id against JWT when token is present ───
    # If a Supabase JWT is provided, extract the real user ID from it and use
    # that instead of the caller-supplied form field, preventing session
    # attribution fraud (one user uploading as another user's ID).
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        try:
            sb_client = get_supabase()
            if sb_client is not None:
                user_response = sb_client.auth.get_user(token)
                if user_response and user_response.user:
                    token_user_id = user_response.user.id
                    # Override form student_id with the verified token user ID
                    student_id = token_user_id
        except Exception as _exc:
            logger.warning("JWT validation on upload skipped (non-fatal): %s", _exc)

    presentation_id = str(uuid.uuid4())

    # ── Save to disk ─────────────────────────────────────────────────────────
    ext = ".webm" if "webm" in ct else ".mp4"
    work_dir = os.path.join(UPLOAD_DIR, presentation_id)
    os.makedirs(work_dir, exist_ok=True)
    video_path = os.path.join(work_dir, f"video{ext}")

    size_bytes = 0
    try:
        with open(video_path, "wb") as f:
            while chunk := await video.read(1024 * 1024):  # 1 MB chunks
                size_bytes += len(chunk)
                if size_bytes > MAX_SIZE_MB * 1024 * 1024:
                    raise HTTPException(413, "File too large (max 500 MB)")
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Failed to save video: {exc}")

    # ── Save optional slide deck (PDF or PPTX) ────────────────────────────────
    slides_path: Optional[str] = None
    if slides and slides.filename:
        slides_ct = (slides.content_type or "").split(";")[0].strip()
        fname = slides.filename.lower()
        if slides_ct == "application/pdf" or fname.endswith(".pdf"):
            slide_ext = ".pdf"
        elif (
            slides_ct == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            or fname.endswith(".pptx")
        ):
            slide_ext = ".pptx"
        else:
            slide_ext = None
        if slide_ext:
            slides_path = os.path.join(work_dir, f"slides{slide_ext}")
            try:
                with open(slides_path, "wb") as sf:
                    while chunk := await slides.read(1024 * 1024):
                        sf.write(chunk)
            except Exception:
                slides_path = None

    # Guard: reject anonymous uploads — student_id must be a real UUID.
    # This produces a clear 401 instead of a Postgres type-error 500.
    import re as _re
    _UUID_RE = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    if not _re.match(_UUID_RE, student_id, _re.IGNORECASE):
        raise HTTPException(401, "Not authenticated — please log in before recording.")

    # ── Create presentations row in Supabase ──────────────────────────────────
    sb = get_supabase()
    row = {
        "id": presentation_id,
        "student_id": student_id,
        "assignment_id": assignment_id or None,
        "session_mode": session_mode,
        "topic_id": topic_id or None,
        "topic_text": topic_text or None,
        "brainstorm_notes": brainstorm_notes or None,
        "duration_secs": int(duration_secs) if duration_secs else None,
        "video_path": video_path,
        "slide_path": slides_path,
        "status": "processing",
    }
    if sb is not None:
        try:
            sb.table("presentations").insert(row).execute()
        except Exception as exc:
            logger.error("Supabase presentations insert failed — aborting pipeline: %s", exc)
            raise HTTPException(500, f"Failed to create presentation record in database: {exc}")

    # ── Queue AI pipeline ─────────────────────────────────────────────────────
    background_tasks.add_task(
        run_pipeline,
        presentation_id=presentation_id,
        student_id=student_id,
        video_path=video_path,
        duration_secs=float(duration_secs or 0),
        topic=topic_text or "",
        session_mode=session_mode or "unguided",
    )

    return UploadResponse(
        presentation_id=presentation_id,
        status="processing",
        message="Upload received. Analysis started.",
    )


@router.get("/{presentation_id}/video-url")
async def get_video_url(
    presentation_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    IMP-03: Return a 1-hour signed URL for the recorded video.
    Requires auth; verifies ownership before issuing the URL.
    """
    sb = get_supabase()
    if sb is None:
        raise HTTPException(404, "Video not available")
    try:
        res = (
            sb.table("presentations")
            .select("student_id, video_path")
            .eq("id", presentation_id)
            .limit(1)
            .execute()
        )
        row = res.data[0] if res.data else None
        if not row:
            raise HTTPException(404, "Presentation not found")
        if row["student_id"] != user_id:
            raise HTTPException(403, "Access denied")
        video_path = row.get("video_path")
        if not video_path:
            raise HTTPException(404, "Video not stored for this session")
        signed_url = get_video_signed_url(video_path)
        if not signed_url:
            raise HTTPException(404, "Could not generate video URL")
        return {"url": signed_url}
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("video-url fetch failed for %s: %s", presentation_id, exc)
        raise HTTPException(500, "Video URL unavailable")


@router.post("/brainstorm")
async def brainstorm_points(topic: str = Form(...)):
    """
    Generate up to 5 brief AI talking points for a MUET speaking topic.
    Called from the brainstorm panel before a guided/unguided session.
    """
    from services.groq_service import generate_brainstorm_points
    points = await generate_brainstorm_points(topic)
    return {"points": points}


@router.get("/{presentation_id}/status")
async def get_status(presentation_id: str):
    sb = get_supabase()
    if sb is None:
        return {"presentation_id": presentation_id, "status": "processing"}
    try:
        res = (
            sb.table("presentations")
            .select("status")
            .eq("id", presentation_id)
            .limit(1)
            .execute()
        )
        if res.data:
            return {"presentation_id": presentation_id, "status": res.data[0]["status"]}
    except Exception as exc:
        logger.warning("Status query failed: %s", exc)
    return {"presentation_id": presentation_id, "status": "processing"}


@router.get("/{presentation_id}")
async def get_presentation(presentation_id: str):
    sb = get_supabase()
    if sb is None:
        raise HTTPException(404, "Presentation not found")
    try:
        res = (
            sb.table("presentations")
            .select("*")
            .eq("id", presentation_id)
            .maybe_single()
            .execute()
        )
        if res.data:
            return res.data
    except Exception:
        pass
    raise HTTPException(404, "Presentation not found")
