from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Any

from services.auth_deps import get_current_user_id
from services.supabase_client import get_supabase
from services import interview_service as svc

router = APIRouter()


class StartBody(BaseModel):
    job_role: str  # data_analyst | data_science | software_engineer | marketing


class CompleteBody(BaseModel):
    session_id: str


@router.post("/start")
async def start_interview(
    body: StartBody,
    student_id: str = Depends(get_current_user_id),
):
    role = body.job_role
    if role not in svc.QUESTION_BANK:
        raise HTTPException(status_code=400, detail=f"Unknown job_role: {role}")

    question_text = svc.get_question(role, 0)

    sb = get_supabase()
    resp = sb.table("interview_sessions").insert({
        "student_id": student_id,
        "job_role": role,
        "questions_answers": [],
    }).execute()

    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create interview session")

    session_id = resp.data[0]["id"]
    return {
        "session_id": session_id,
        "question_index": 0,
        "question_text": question_text,
        "total_questions": svc.TOTAL_QUESTIONS,
    }


@router.post("/respond")
async def respond_to_question(
    session_id: str = Form(...),
    question_index: int = Form(...),
    question_text: str = Form(...),
    audio: UploadFile = File(...),
    student_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()

    session_resp = sb.table("interview_sessions") \
        .select("*") \
        .eq("id", session_id) \
        .eq("student_id", student_id) \
        .limit(1) \
        .execute()

    if not session_resp.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session = session_resp.data[0]
    role = session["job_role"]
    audio_bytes = await audio.read()

    transcript = await svc.transcribe_audio(audio_bytes)
    evaluation = await svc.evaluate_answer(question_text, transcript, role)

    qa_entry = {
        "question_index": question_index,
        "question": question_text,
        "answer_transcript": transcript,
        "score": evaluation["score"],
        "feedback": evaluation["feedback"],
    }

    existing_qa = session.get("questions_answers") or []
    updated_qa = existing_qa + [qa_entry]

    sb.table("interview_sessions") \
        .update({"questions_answers": updated_qa}) \
        .eq("id", session_id) \
        .execute()

    is_last = question_index >= svc.TOTAL_QUESTIONS - 1
    next_question = None
    next_question_index = None

    if not is_last:
        next_question_index = question_index + 1
        next_question = svc.get_question(role, next_question_index)

    return {
        "transcript": transcript,
        "score": evaluation["score"],
        "feedback": evaluation["feedback"],
        "next_question": next_question,
        "next_question_index": next_question_index,
        "is_last": is_last,
    }


@router.post("/complete")
async def complete_interview(
    body: CompleteBody,
    student_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()

    session_resp = sb.table("interview_sessions") \
        .select("*") \
        .eq("id", body.session_id) \
        .eq("student_id", student_id) \
        .limit(1) \
        .execute()

    if not session_resp.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session = session_resp.data[0]
    qa = session.get("questions_answers") or []

    report = await svc.generate_overall_report(qa, session["job_role"])

    sb.table("interview_sessions").update({
        "overall_band": report["overall_band"],
        "overall_feedback": report["overall_feedback"],
        "advice_cards": report["advice_cards"],
        "completed": True,
    }).eq("id", body.session_id).execute()

    return report


@router.get("/sessions")
async def list_sessions(student_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    resp = sb.table("interview_sessions") \
        .select("id, job_role, overall_band, completed, created_at") \
        .eq("student_id", student_id) \
        .order("created_at", desc=True) \
        .execute()
    return {"sessions": resp.data or []}


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    student_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    resp = sb.table("interview_sessions") \
        .select("*") \
        .eq("id", session_id) \
        .eq("student_id", student_id) \
        .limit(1) \
        .execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return resp.data[0]
