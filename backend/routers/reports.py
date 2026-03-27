"""
Reports router — T2.19.

GET /api/reports/{presentation_id}
  Returns the full feedback_reports row for a completed presentation.

GET /api/reports/history/{student_id}
  Returns all session_history rows for longitudinal progress tracking.
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

from services.supabase_client import get_supabase, db_get_report

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


@router.get("/{presentation_id}", response_model=FeedbackReport)
async def get_report(presentation_id: str):
    report = await db_get_report(presentation_id)
    if not report:
        raise HTTPException(404, "Report not found or not yet generated")
    return report


@router.get("/history/{student_id}")
async def get_student_history(student_id: str):
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
