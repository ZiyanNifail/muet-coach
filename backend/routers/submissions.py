"""
Submissions router — T4.04, T4.05, T4.08.

GET  /api/submissions/{id}              submission detail + report + signed video URL
POST /api/submissions/{id}/override     HITL band override saved as draft
POST /api/submissions/{id}/release      publish draft override to the student
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from services.supabase_client import db_get_submission_detail, db_create_override, db_release_override
from services.storage_service import get_video_signed_url
from services.auth_deps import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


def _percent_to_letter(p: float) -> str:
    if p >= 90: return "A+"
    if p >= 80: return "A"
    if p >= 75: return "A-"
    if p >= 70: return "B+"
    if p >= 65: return "B"
    if p >= 60: return "B-"
    if p >= 55: return "C+"
    if p >= 50: return "C"
    if p >= 40: return "D"
    return "F"


@router.get("/{presentation_id}")
async def get_submission(
    presentation_id: str,
    user_id: str = Depends(get_current_user_id),
):
    detail = db_get_submission_detail(presentation_id)
    if not detail:
        raise HTTPException(404, "Submission not found.")

    overrides = detail.get("educator_overrides") or []
    if isinstance(overrides, dict):
        overrides = [overrides]
    latest_override = overrides[0] if overrides else None
    grade_released = bool(latest_override and latest_override.get("released_at"))

    # If the caller is the student on this submission and the grade has not
    # been released yet, strip the override so the UI cannot surface it.
    is_student_viewer = detail.get("student_id") == user_id
    if is_student_viewer and not grade_released:
        detail["educator_overrides"] = []

    video_signed_url: Optional[str] = None
    student_id = detail.get("student_id")
    if student_id:
        storage_path = f"{student_id}/{presentation_id}/video.webm"
        video_signed_url = get_video_signed_url(storage_path)

    return {
        "submission": detail,
        "video_signed_url": video_signed_url,
        "grade_released": grade_released,
    }


class OverrideBody(BaseModel):
    educator_id: str
    override_band: float
    feedback: str
    grade_percent: Optional[float] = None
    presentation_accuracy_score: Optional[float] = None
    presentation_accuracy_notes: Optional[str] = None


@router.post("/{presentation_id}/override")
async def override_submission(presentation_id: str, body: OverrideBody):
    if not (1.0 <= body.override_band <= 6.0):
        raise HTTPException(400, "Band score must be between 1.0 and 6.0.")
    if body.grade_percent is not None and not (0 <= body.grade_percent <= 100):
        raise HTTPException(400, "Percentage must be between 0 and 100.")
    if body.presentation_accuracy_score is not None and not (0 <= body.presentation_accuracy_score <= 100):
        raise HTTPException(400, "Presentation accuracy score must be between 0 and 100.")

    detail = db_get_submission_detail(presentation_id)
    reports = detail.get("feedback_reports") if detail else None
    original_band: Optional[float] = None
    if isinstance(reports, list) and reports:
        original_band = reports[0].get("band_score")
    elif isinstance(reports, dict):
        original_band = reports.get("band_score")

    letter = _percent_to_letter(body.grade_percent) if body.grade_percent is not None else None
    ok = db_create_override(
        presentation_id=presentation_id,
        educator_id=body.educator_id,
        original_band=original_band,
        override_band=body.override_band,
        feedback=body.feedback,
        grade_percent=body.grade_percent,
        grade_letter=letter,
        presentation_accuracy_score=body.presentation_accuracy_score,
        presentation_accuracy_notes=body.presentation_accuracy_notes,
    )
    if not ok:
        raise HTTPException(500, "Failed to save override — check database connection.")

    return {
        "message": "Draft saved. Release to make it visible to the student.",
        "presentation_id": presentation_id,
        "override_band": body.override_band,
        "grade_percent": body.grade_percent,
        "grade_letter": letter,
        "presentation_accuracy_score": body.presentation_accuracy_score,
        "released": False,
    }


@router.post("/{presentation_id}/release")
async def release_submission(
    presentation_id: str,
    user_id: str = Depends(get_current_user_id),
):
    ok = db_release_override(presentation_id)
    if not ok:
        raise HTTPException(400, "No draft override to release — save one first.")
    return {
        "message": "Grade released to student.",
        "presentation_id": presentation_id,
        "released": True,
    }
