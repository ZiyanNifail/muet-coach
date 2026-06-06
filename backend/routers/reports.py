"""
Reports router — T2.19.

GET /api/reports/{presentation_id}
  Returns the full feedback_reports row for a completed presentation.
  Requires auth; verifies the presentation belongs to the requesting user.

GET /api/reports/history/{student_id}
  Returns all session_history rows for longitudinal progress tracking.
  Requires auth; student_id must match the authenticated user.
"""
import os
import logging
import time
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
    # IMP-03: per-10s eye contact timeline for session replay annotations
    eye_contact_timeline: Optional[Any] = None


@router.get("/{presentation_id}", response_model=FeedbackReport)
async def get_report(
    presentation_id: str,
    user_id: str = Depends(get_current_user_id),
):
    # Single query: ownership check + status check combined
    sb = get_supabase()
    if sb is not None:
        try:
            pres = (
                sb.table("presentations")
                .select("student_id, status")
                .eq("id", presentation_id)
                .limit(1)
                .execute()
            )
            pres_data = (pres.data[0] if pres.data else None) if pres is not None else None
            if pres_data:
                if pres_data.get("student_id") != user_id:
                    raise HTTPException(status_code=403, detail="Access denied — this report belongs to another user.")
                if pres_data.get("status") == "failed":
                    raise HTTPException(
                        status_code=422,
                        detail="Analysis pipeline failed. Please try uploading again.",
                    )
        except HTTPException:
            raise
        except Exception:
            pass  # non-fatal — fall through to report lookup

    report = await db_get_report(presentation_id)
    if not report:
        raise HTTPException(404, "Report not found or not yet generated")
    return report


@router.get("/debug/groq-ping")
async def groq_ping():
    """
    Debug-only endpoint — gated behind DEBUG=true env var.
    Calls generate_feedback() with a stub transcript to verify Groq connectivity
    without needing to upload a full video through the pipeline.

    Usage: GET /api/reports/debug/groq-ping
    """
    if os.getenv("DEBUG", "").lower() not in ("1", "true", "yes"):
        raise HTTPException(status_code=404, detail="Not found")

    from services.groq_service import generate_feedback
    stub_transcript = (
        "Good morning everyone. Today I will be presenting about climate change "
        "and its impact on biodiversity. Um, so firstly, let us consider the data. "
        "The temperature has risen by approximately 1.2 degrees Celsius since the "
        "industrial revolution. This is, you know, a significant figure."
    )
    stub_metrics = {
        "wpm_avg": 115.0,
        "eye_contact_pct": 55.0,
        "filler_density": 4.5,
        "posture_score": 72.0,
        "lexical_diversity": 0.61,
        "duration_secs": 28.0,
        "session_mode": "unguided",
    }
    t0 = time.monotonic()
    try:
        result = await generate_feedback(stub_transcript, stub_metrics, rule_band=3.5)
        elapsed_ms = round((time.monotonic() - t0) * 1000)
        groq_ok = bool(result.get("advice_cards") and result.get("band_score") is not None)
        return {
            "groq_ok": groq_ok,
            "elapsed_ms": elapsed_ms,
            "band_score": result.get("band_score"),
            "advice_card_count": len(result.get("advice_cards", [])),
            "first_card": (result.get("advice_cards") or [None])[0],
        }
    except Exception as exc:
        elapsed_ms = round((time.monotonic() - t0) * 1000)
        logger.exception("groq-ping failed")
        return {"groq_ok": False, "elapsed_ms": elapsed_ms, "error": str(exc)}


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
            .select("*, feedback_reports(band_score, wpm_avg, eye_contact_pct, posture_score, filler_count, generated_at, presentation_id)")
            .eq("student_id", student_id)
            .order("session_date", desc=True)
            .execute()
        )
        sessions = res.data or []

        # session_history has no session_mode column — fetch it from presentations
        # via the presentation_id stored in each feedback_report row.
        presentation_ids = [
            s["feedback_reports"]["presentation_id"]
            for s in sessions
            if isinstance(s.get("feedback_reports"), dict)
            and s["feedback_reports"].get("presentation_id")
        ]
        if presentation_ids:
            pres_res = (
                sb.table("presentations")
                .select("id, session_mode")
                .in_("id", presentation_ids)
                .execute()
            )
            mode_map: dict = {p["id"]: p.get("session_mode") for p in (pres_res.data or [])}
            for s in sessions:
                pres_id = (s.get("feedback_reports") or {}).get("presentation_id")
                s["session_mode"] = mode_map.get(pres_id) or "unguided"

        return {"sessions": sessions}
    except Exception as exc:
        logger.warning("History query failed: %s", exc)
        return {"sessions": []}
