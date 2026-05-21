"""
Drills router — weakness-targeted practice drill recommendations.
GET /api/drills/recommend/{report_id}
"""
import logging
from fastapi import APIRouter, Depends, HTTPException

from services.supabase_client import get_supabase
from services.drills_service import recommend_drills
from services.auth_deps import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/recommend/{report_id}")
async def get_drill_recommendations(
    report_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Return weakness-targeted drills for a given feedback report.
    Identifies the lowest rubric sub-band and surfaces drills targeting it.
    """
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        res = (
            sb.table("feedback_reports")
            .select("id, rubric_bands, band_score, presentation_id")
            .eq("id", report_id)
            .single()
            .execute()
        )
    except Exception:
        logger.exception("Failed to fetch report %s for drill recommendation", report_id)
        raise HTTPException(status_code=500, detail="Failed to fetch report")

    if not res.data:
        raise HTTPException(status_code=404, detail="Report not found")

    report = res.data
    rubric_bands = report.get("rubric_bands")

    if not rubric_bands:
        raise HTTPException(status_code=404, detail="No rubric breakdown available for this report — re-analyse to generate one")

    recommendation = recommend_drills(rubric_bands)
    return {
        "report_id": report_id,
        **recommendation,
    }
