"""
Submissions router — T4.04, T4.05, T4.08.

GET  /api/submissions/{id}         submission detail + report + signed video URL
POST /api/submissions/{id}/override  HITL band override + written feedback
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.supabase_client import db_get_submission_detail, db_create_override
from services.storage_service import get_video_signed_url

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{presentation_id}")
async def get_submission(presentation_id: str):
    detail = db_get_submission_detail(presentation_id)
    if not detail:
        raise HTTPException(404, "Submission not found.")

    # Attempt to get a signed URL for the video
    video_signed_url: str | None = None
    student_id = detail.get("student_id")
    if student_id:
        storage_path = f"{student_id}/{presentation_id}/video.webm"
        video_signed_url = get_video_signed_url(storage_path)

    return {
        "submission": detail,
        "video_signed_url": video_signed_url,
    }


class OverrideBody(BaseModel):
    educator_id: str
    override_band: float
    feedback: str


@router.post("/{presentation_id}/override")
async def override_submission(presentation_id: str, body: OverrideBody):
    if not (1.0 <= body.override_band <= 6.0):
        raise HTTPException(400, "Band score must be between 1.0 and 6.0.")

    # Get original band for audit trail
    detail = db_get_submission_detail(presentation_id)
    reports = detail.get("feedback_reports") if detail else None
    original_band: float | None = None
    if isinstance(reports, list) and reports:
        original_band = reports[0].get("band_score")
    elif isinstance(reports, dict):
        original_band = reports.get("band_score")

    ok = db_create_override(
        presentation_id=presentation_id,
        educator_id=body.educator_id,
        original_band=original_band,
        override_band=body.override_band,
        feedback=body.feedback,
    )
    if not ok:
        raise HTTPException(500, "Failed to save override — check database connection.")

    return {
        "message": "Override saved.",
        "presentation_id": presentation_id,
        "override_band": body.override_band,
    }
