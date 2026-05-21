"""
Exams router — MUET mock exam invitations.

POST /api/exams/{assignment_id}/invitations   — educator invites a student
GET  /api/exams/my-invitations               — student: list all exam invites
POST /api/exams/invitations/{id}/respond     — student: accept or decline
GET  /api/exams/{assignment_id}/invitations  — educator: list invites for an exam
"""
import logging
from typing import Literal

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from services.auth_deps import get_current_user_id
from typing import Optional

from services.supabase_client import (
    db_create_exam_invitation,
    db_get_exam_invitations_for_student,
    db_get_exam_invitations_for_assignment,
    db_respond_exam_invitation,
    db_create_standalone_exam,
    db_get_standalone_exams,
    db_get_assignment,
    db_get_exam_submission_statuses,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class CreateExamBody(BaseModel):
    title: str
    scheduled_at: Optional[str] = None
    exam_duration_mins: Optional[int] = None
    exam_topic_id: Optional[str] = None


@router.post("")
async def create_standalone_exam(
    body: CreateExamBody,
    user_id: str = Depends(get_current_user_id),
):
    exam = db_create_standalone_exam(
        educator_id=user_id,
        title=body.title,
        scheduled_at=body.scheduled_at,
        exam_duration_mins=body.exam_duration_mins,
        exam_topic_id=body.exam_topic_id or None,
    )
    if exam is None:
        raise HTTPException(500, "Failed to create exam.")
    return {"exam": exam}


@router.get("")
async def list_my_exams(
    user_id: str = Depends(get_current_user_id),
):
    exams = db_get_standalone_exams(user_id)
    return {"exams": exams}


class InviteStudentBody(BaseModel):
    student_id: str
    educator_id: str


@router.post("/{assignment_id}/invitations")
async def invite_student_to_exam(
    assignment_id: str,
    body: InviteStudentBody,
    user_id: str = Depends(get_current_user_id),
):
    if body.educator_id != user_id:
        raise HTTPException(403, "Access denied — educator_id does not match authenticated user.")
    inv = db_create_exam_invitation(assignment_id, body.student_id, body.educator_id)
    if inv is None:
        raise HTTPException(500, "Failed to create invitation.")
    return {"invitation": inv}


@router.get("/my-exam-statuses")
async def get_my_exam_statuses(
    user_id: str = Depends(get_current_user_id),
):
    statuses = db_get_exam_submission_statuses(user_id)
    return {"statuses": statuses}


@router.get("/my-invitations")
async def get_my_invitations(
    user_id: str = Depends(get_current_user_id),
):
    invitations = db_get_exam_invitations_for_student(user_id)
    return {"invitations": invitations}


class RespondBody(BaseModel):
    status: Literal["accepted", "declined"]


@router.post("/invitations/{invitation_id}/respond")
async def respond_to_invitation(
    invitation_id: str,
    body: RespondBody,
    user_id: str = Depends(get_current_user_id),
):
    ok = db_respond_exam_invitation(invitation_id, user_id, body.status)
    if not ok:
        raise HTTPException(500, "Failed to respond to invitation.")
    return {"message": f"Invitation {body.status}.", "invitation_id": invitation_id}


@router.get("/{assignment_id}/detail")
async def get_exam_detail(
    assignment_id: str,
    user_id: str = Depends(get_current_user_id),
):
    exam = db_get_assignment(assignment_id)
    if not exam:
        raise HTTPException(404, "Exam not found.")
    return {"exam": exam}


@router.get("/{assignment_id}/invitations")
async def list_exam_invitations(
    assignment_id: str,
    user_id: str = Depends(get_current_user_id),
):
    invitations = db_get_exam_invitations_for_assignment(assignment_id)
    return {"invitations": invitations}
