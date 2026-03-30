"""
Reports router — T2.19.

GET /api/reports/{presentation_id}
  Returns the full feedback_reports row for a completed presentation.
  Requires auth; verifies the presentation belongs to the requesting user.

GET /api/reports/history/{student_id}
  Returns all session_history rows for longitudinal progress tracking.
  Requires auth; student_id must match the authenticated user.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Any

from services.supabase_client import get_supabase, db_get_report
from services.auth_deps import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


class FeedbackReport(BaseModel):
    id: str
    presentation_id: str
    band_score: Optional[float] = None
    wpm_avg: Optional[float] = None
    filler_count: Optional[int] = None
    filler_density: Optional[float] = None
    eye_contact_pct: Optional[float] = None
    posture_score: Optional[float] = None
    transcript: Optional[str] = None
    pace_timeseries: Optional[Any] = None
    advice_cards: Optional[Any] = None
    confidence_flags: Optional[Any] = None
    # Presentation context fields (WARN-04 fix)
    topic_text: Optional[str] = None
    session_mode: Optional[str] = None
    duration_secs: Optional[float] = None
    # AI metric fields (T2.12A–C + T3.04A)
    pitch_mean_hz: Optional[float] = None
    energy_mean_db: Optional[float] = None
    sentiment_score: Optional[float] = None
    voice_clarity_score: Optional[float] = None
    confidence_score: Optional[float] = None


@router.get("/{presentation_id}", response_model=FeedbackReport)
async def get_report(
    presentation_id: str,
    user_id: str = Depends(get_current_user_id),
):
    # Verify the presentation belongs to the authenticated user
    sb = get_supabase()
    if sb is not None:
        pres = (
            sb.table("presentations")
            .select("student_id")
            .eq("id", presentation_id)
            .maybe_single()
            .execute()
        )
        if pres.data and pres.data.get("student_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied — this report belongs to another user.")

    report = await db_get_report(presentation_id)
    if not report:
        raise HTTPException(404, "Report not found or not yet generated")
    return report


@router.get("/history/{student_id}")
async def get_student_history(
    student_id: str,
    user_id: str = Depends(get_current_user_id),
):
    if student_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied — you can only view your own history.")

    sb = get_supabase()
    if sb is None:
        return {"sessions": []}
    try:
        res = (
            sb.table("session_history")
            .select("*, feedback_reports(band_score, generated_at)")
            .eq("student_id", student_id)
            .order("session_date", desc=True)
            .execute()
        )
        return {"sessions": res.data or []}
    except Exception as exc:
        logger.warning("History query failed: %s", exc)
        return {"sessions": []}
