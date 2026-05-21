from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any
import json

import asyncio
from services.auth_deps import get_current_user_id
from services.supabase_client import get_supabase
from services.groq_service import _get_groq_client, _rate_limiter

router = APIRouter()


def _raw_to_band(correct: int) -> float:
    if correct >= 28:
        return 6.0
    if correct >= 23:
        return 5.0
    if correct >= 18:
        return 4.0
    if correct >= 12:
        return 3.0
    if correct >= 6:
        return 2.0
    return 1.0


class QuestionMeta(BaseModel):
    id: str
    section: str  # 'A' | 'B' | 'C'


class ListeningSubmitBody(BaseModel):
    answers: dict[str, str]
    answer_key: dict[str, str]
    question_meta: list[QuestionMeta]


def _grade(body: ListeningSubmitBody) -> dict:
    section_data: dict[str, dict] = {
        'A': {'correct': 0, 'total': 0},
        'B': {'correct': 0, 'total': 0},
        'C': {'correct': 0, 'total': 0},
    }
    for q in body.question_meta:
        sec = q.section
        if sec not in section_data:
            continue
        section_data[sec]['total'] += 1
        submitted = body.answers.get(q.id, '').strip().lower()
        correct = body.answer_key.get(q.id, '').strip().lower()
        if submitted == correct:
            section_data[sec]['correct'] += 1

    total_correct = sum(v['correct'] for v in section_data.values())
    return section_data, total_correct


async def _generate_advice(section_scores: dict, overall_band: float) -> list[dict]:
    a = section_scores.get('A', {})
    b = section_scores.get('B', {})
    c = section_scores.get('C', {})

    system = (
        "You are a MUET Listening examiner providing concise, actionable feedback. "
        "Return ONLY valid JSON: {\"advice_cards\": [{\"impact\": \"HIGH|MED|LOW\", \"text\": \"...\"}]}. "
        "Generate exactly 4 advice cards. Focus on specific listening sub-skills."
    )
    user = (
        f"The student scored:\n"
        f"Section A (short dialogues, MCQ): {a.get('correct',0)}/{a.get('total',10)}\n"
        f"Section B (extended conversation, fill-in-blank): {b.get('correct',0)}/{b.get('total',10)}\n"
        f"Section C (academic monologue, play once): {c.get('correct',0)}/{c.get('total',10)}\n"
        f"Overall band: {overall_band}\n"
        "Identify weak areas and give specific tips to improve MUET listening skills."
    )

    client = _get_groq_client()
    if client is None:
        return []

    await _rate_limiter.acquire()

    def _call():
        return client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.3,
            max_tokens=512,
            response_format={"type": "json_object"},
        )

    resp = await asyncio.to_thread(_call)
    raw = resp.choices[0].message.content or "{}"
    data = json.loads(raw)
    return data.get("advice_cards", [])


@router.post("/submit")
async def submit_listening(
    body: ListeningSubmitBody,
    student_id: str = Depends(get_current_user_id),
):
    section_scores, total_correct = _grade(body)
    overall_band = _raw_to_band(total_correct)

    try:
        advice_cards = await _generate_advice(section_scores, overall_band)
    except Exception:
        advice_cards = [
            {"impact": "HIGH", "text": "Focus on listening for specific numbers and statistics in academic passages."},
            {"impact": "MED", "text": "Practise note-taking while listening to improve your fill-in-blank accuracy."},
            {"impact": "MED", "text": "For Section C (play once), train yourself to anticipate answers before they are spoken."},
            {"impact": "LOW", "text": "Expand your academic vocabulary to better understand lecture-style monologues."},
        ]

    sb = get_supabase()
    insert_resp = sb.table("listening_sessions").insert({
        "student_id": student_id,
        "answers": body.answers,
        "section_scores": section_scores,
        "overall_band": overall_band,
        "advice_cards": advice_cards,
    }).execute()

    if not insert_resp.data:
        raise HTTPException(status_code=500, detail="Failed to save listening session")

    session_id = insert_resp.data[0]["id"]
    return {
        "session_id": session_id,
        "section_scores": section_scores,
        "overall_band": overall_band,
        "advice_cards": advice_cards,
    }


@router.get("/sessions")
async def get_listening_sessions(student_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    resp = sb.table("listening_sessions") \
        .select("id, overall_band, section_scores, created_at") \
        .eq("student_id", student_id) \
        .order("created_at", desc=True) \
        .execute()
    return {"sessions": resp.data or []}


@router.get("/sessions/{session_id}")
async def get_listening_session(
    session_id: str,
    student_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    resp = sb.table("listening_sessions") \
        .select("*") \
        .eq("id", session_id) \
        .eq("student_id", student_id) \
        .limit(1) \
        .execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return resp.data[0]
