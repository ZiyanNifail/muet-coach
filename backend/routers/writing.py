from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services.auth_deps import get_current_user_id
from services.supabase_client import get_supabase
from services import writing_service

router = APIRouter()


class WritingSubmitBody(BaseModel):
    task1_prompt: str
    task1_response: str
    task1_word_count: int
    task2_topic: str
    task2_response: str
    task2_word_count: int


@router.post("/submit")
async def submit_writing(
    body: WritingSubmitBody,
    student_id: str = Depends(get_current_user_id),
):
    try:
        result = await writing_service.evaluate_writing(
            task1_prompt=body.task1_prompt,
            task1_response=body.task1_response,
            task1_word_count=body.task1_word_count,
            task2_topic=body.task2_topic,
            task2_response=body.task2_response,
            task2_word_count=body.task2_word_count,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI evaluation failed: {str(e)}")

    sb = get_supabase()
    insert_resp = sb.table("writing_sessions").insert({
        "student_id": student_id,
        "task1_prompt": body.task1_prompt,
        "task1_response": body.task1_response,
        "task2_topic": body.task2_topic,
        "task2_response": body.task2_response,
        "task1_band": result["task1_band"],
        "task2_band": result["task2_band"],
        "overall_band": result["overall_band"],
        "advice_cards": result["advice_cards"],
    }).execute()

    if not insert_resp.data:
        raise HTTPException(status_code=500, detail="Failed to save writing session")

    session_id = insert_resp.data[0]["id"]
    return {"session_id": session_id, **result}


@router.get("/sessions")
async def get_writing_sessions(student_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    resp = sb.table("writing_sessions") \
        .select("id, task1_band, task2_band, overall_band, created_at") \
        .eq("student_id", student_id) \
        .order("created_at", desc=True) \
        .execute()
    return {"sessions": resp.data or []}


@router.get("/sessions/{session_id}")
async def get_writing_session(
    session_id: str,
    student_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    resp = sb.table("writing_sessions") \
        .select("*") \
        .eq("id", session_id) \
        .eq("student_id", student_id) \
        .limit(1) \
        .execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return resp.data[0]
