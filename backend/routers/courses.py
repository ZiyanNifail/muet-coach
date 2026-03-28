"""
Courses router — T4.01, T4.01A, T4.01B, T4.01C, T4.02, T4.08.

Educator endpoints:
  GET    /api/courses?educator_id=      list educator's courses
  POST   /api/courses                   create course
  GET    /api/courses/{id}              course detail
  POST   /api/courses/{id}/rubric       upload rubric PDF (T4.03 variant)
  GET    /api/courses/{id}/rubric-url   signed URL for rubric
  GET    /api/courses/{id}/members      list members
  POST   /api/courses/{id}/invite       invite student by email
  POST   /api/courses/{id}/members/{mid}/approve
  POST   /api/courses/{id}/members/{mid}/reject
  GET    /api/courses/{id}/assignments  list assignments
  POST   /api/courses/{id}/assignments  create assignment (T4.02)
  GET    /api/courses/{id}/submissions  list submissions for review

Student endpoints:
  POST   /api/courses/join              join by invite code
  GET    /api/courses/student/{uid}     enrolled courses
"""
import random
import string
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from services.supabase_client import (
    get_supabase,
    db_get_courses_for_educator,
    db_create_course,
    db_get_course,
    db_update_course_rubric,
    db_get_course_members,
    db_join_course_by_code,
    db_respond_member,
    db_get_student_courses,
    db_get_assignments,
    db_create_assignment,
    db_get_course_submissions,
    db_get_educator_analytics,
)
from services.storage_service import upload_rubric, get_rubric_signed_url

logger = logging.getLogger(__name__)
router = APIRouter()


def _gen_invite_code(subject_code: str) -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    base = "".join(c for c in subject_code.upper() if c.isalnum())[:8]
    return f"{base}-{suffix}"


# ── Educator: list courses ────────────────────────────────────────────────────

@router.get("/")
async def list_courses(educator_id: str = Query(...)):
    courses = db_get_courses_for_educator(educator_id)
    return {"courses": courses}


# ── Student: enrolled courses ─────────────────────────────────────────────────

@router.get("/student/{student_id}")
async def get_student_courses(student_id: str):
    memberships = db_get_student_courses(student_id)
    return {"memberships": memberships}


# ── Student: join by invite code ──────────────────────────────────────────────

class JoinRequest(BaseModel):
    student_id: str
    invite_code: str


@router.post("/join")
async def join_course(body: JoinRequest):
    result = db_join_course_by_code(body.student_id, body.invite_code)
    if result is None:
        raise HTTPException(404, "Invalid invite code — no course found.")
    return {"message": "Join request submitted.", "membership": result}


# ── Educator: create course ───────────────────────────────────────────────────

class CreateCourseBody(BaseModel):
    educator_id: str
    name: str
    subject_code: str
    description: Optional[str] = ""


@router.post("/")
async def create_course(body: CreateCourseBody):
    invite_code = _gen_invite_code(body.subject_code)
    try:
        course = db_create_course(
            body.educator_id, body.name, body.subject_code,
            body.description or "", invite_code,
        )
    except Exception as exc:
        logger.error("create_course error: %s", exc)
        raise HTTPException(500, f"Failed to create course: {exc}")
    if not course:
        raise HTTPException(500, "Failed to create course — insert returned no data.")
    return {"course": course}


# ── Educator: analytics ───────────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics(educator_id: str = Query(...)):
    return db_get_educator_analytics(educator_id)


# ── Educator: course detail ───────────────────────────────────────────────────

@router.get("/{course_id}")
async def get_course(course_id: str):
    course = db_get_course(course_id)
    if not course:
        raise HTTPException(404, "Course not found.")
    return {"course": course}


# ── Educator: rubric PDF upload ───────────────────────────────────────────────

@router.post("/{course_id}/rubric")
async def upload_course_rubric(
    course_id: str,
    rubric: UploadFile = File(...),
):
    ct = (rubric.content_type or "").split(";")[0].strip()
    if ct != "application/pdf":
        raise HTTPException(400, "Only PDF files are accepted for rubrics.")

    file_bytes = await rubric.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(413, "Rubric PDF must be under 20 MB.")

    path = upload_rubric(course_id, file_bytes)
    if path is None:
        # Fallback: save locally if storage not configured
        import os
        local_dir = os.path.join(os.path.dirname(__file__), "..", "uploads", "rubrics", course_id)
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, "rubric.pdf")
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        path = f"local:{local_path}"

    db_update_course_rubric(course_id, path)
    return {"message": "Rubric uploaded.", "path": path}


# ── Educator / Student: rubric signed URL ─────────────────────────────────────

@router.get("/{course_id}/rubric-url")
async def get_rubric_url(course_id: str):
    course = db_get_course(course_id)
    if not course or not course.get("rubric_path"):
        raise HTTPException(404, "No rubric uploaded for this course.")

    rubric_path = course["rubric_path"]

    # Local fallback
    if rubric_path.startswith("local:"):
        local_path = rubric_path[len("local:"):]
        raise HTTPException(
            503,
            "Rubric stored locally — Supabase Storage not configured. "
            f"File is at: {local_path}"
        )

    signed_url = get_rubric_signed_url(rubric_path)
    if not signed_url:
        raise HTTPException(503, "Could not generate signed URL — check Storage configuration.")
    return {"signed_url": signed_url}


# ── Educator: members ─────────────────────────────────────────────────────────

@router.get("/{course_id}/members")
async def list_members(course_id: str):
    members = db_get_course_members(course_id)
    return {"members": members}


@router.post("/{course_id}/members/{member_id}/approve")
async def approve_member(course_id: str, member_id: str):
    ok = db_respond_member(member_id, "approved")
    if not ok:
        raise HTTPException(500, "Failed to approve member.")
    return {"message": "Approved"}


@router.post("/{course_id}/members/{member_id}/reject")
async def reject_member(course_id: str, member_id: str):
    ok = db_respond_member(member_id, "rejected")
    if not ok:
        raise HTTPException(500, "Failed to reject member.")
    return {"message": "Rejected"}


# ── Educator: invite by email ─────────────────────────────────────────────────

class InviteBody(BaseModel):
    educator_id: str
    email: str


@router.post("/{course_id}/invite")
async def invite_student(course_id: str, body: InviteBody):
    sb = get_supabase()
    if sb is None:
        raise HTTPException(503, "Database not configured.")
    try:
        # Look up student by email
        user_res = (
            sb.table("users")
            .select("id")
            .eq("email", body.email)
            .maybe_single()
            .execute()
        )
        if not user_res.data:
            raise HTTPException(404, f"No account found for {body.email}.")
        student_id = user_res.data["id"]

        sb.table("course_members").upsert({
            "course_id": course_id,
            "student_id": student_id,
            "status": "pending",
            "invited_by": body.educator_id,
        }, on_conflict="course_id,student_id").execute()
        return {"message": f"Invite sent to {body.email}."}
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Invite failed: %s", exc)
        raise HTTPException(500, "Failed to send invite.")


# ── Educator: assignments ─────────────────────────────────────────────────────

@router.get("/{course_id}/assignments")
async def list_assignments(course_id: str):
    assignments = db_get_assignments(course_id)
    return {"assignments": assignments}


class CreateAssignmentBody(BaseModel):
    title: str
    description: Optional[str] = ""
    deadline: Optional[str] = None
    exam_mode: bool = False


@router.post("/{course_id}/assignments")
async def create_assignment(course_id: str, body: CreateAssignmentBody):
    assignment = db_create_assignment(
        course_id, body.title, body.description or "",
        body.deadline, body.exam_mode,
    )
    if not assignment:
        raise HTTPException(500, "Failed to create assignment.")
    return {"assignment": assignment}


# ── Educator: submissions ─────────────────────────────────────────────────────

@router.get("/{course_id}/submissions")
async def list_submissions(course_id: str):
    submissions = db_get_course_submissions(course_id)
    return {"submissions": submissions}


# ── Educator: AI rubric generation (CRIT-01 fix — server-side Groq call) ──────

class GenerateRubricBody(BaseModel):
    course_name: str = ""
    subject_code: str = ""
    description: str = ""
    presentation_type: str = "General English Presentation"
    focus_areas: list[str] = []
    band_count: int = 5


@router.post("/{course_id}/generate-rubric")
async def generate_rubric(course_id: str, body: GenerateRubricBody):
    """
    Generate a presentation rubric using Groq/Llama 3.3 70B.
    Runs server-side so the GROQ_API_KEY stays in the backend environment.
    """
    import os
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key or api_key == "your-groq-api-key":
        raise HTTPException(503, "Groq API key not configured on the server.")

    if not body.focus_areas:
        raise HTTPException(400, "Select at least one focus area.")

    focus_list = ", ".join(body.focus_areas)
    prompt = (
        f"You are an experienced language assessment expert. "
        f"Generate a detailed presentation rubric for the following course.\n\n"
        f"Course Name: {body.course_name}\n"
        f"Subject Code: {body.subject_code}\n"
        f"Description: {body.description or 'N/A'}\n"
        f"Presentation Type: {body.presentation_type}\n"
        f"Assessment Criteria (focus areas): {focus_list}\n"
        f"Number of Band Levels: {body.band_count}\n\n"
        f"Instructions:\n"
        f"- Create one rubric table per criterion listed in the focus areas\n"
        f"- Each criterion should have {body.band_count} band descriptors with clear, measurable indicators\n"
        f"- Use MUET-style band scoring (Band 1 = weakest, Band {body.band_count} = strongest)\n"
        f"- Keep language clear and suitable for undergraduate students\n"
        f"- Include a weightage % for each criterion (all must sum to 100%)\n"
        f"- At the end, add a short 'How to use this rubric' note for students\n\n"
        f"Format the output in clean, structured plain text. Use clear headings and separators."
    )

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        chat = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=2500,
        )
        rubric_text = chat.choices[0].message.content or ""
        return {"rubric": rubric_text}
    except Exception as exc:
        logger.warning("Groq rubric generation failed: %s", exc)
        raise HTTPException(502, f"Rubric generation failed: {exc}")
