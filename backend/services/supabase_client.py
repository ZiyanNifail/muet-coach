"""
Supabase client using the service role key (bypasses RLS).
Used only by the backend AI pipeline — never exposed to the frontend.
"""
import os
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

try:
    from supabase import create_client, Client
    _SUPABASE_AVAILABLE = True
except ImportError:
    _SUPABASE_AVAILABLE = False
    logger.warning("supabase package not installed — run: pip install supabase")


@lru_cache(maxsize=1)
def get_supabase() -> "Client | None":
    if not _SUPABASE_AVAILABLE:
        return None
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_KEY", "")
    if not url or not key or key == "your-service-role-key":
        logger.error(
            "Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_KEY "
            "in backend/.env. Get the service_role JWT from: "
            "Supabase Dashboard → Project Settings → API → service_role (secret key)"
        )
        return None
    try:
        return create_client(url, key)
    except Exception as exc:
        logger.error(
            "Supabase client creation failed: %s\n"
            "  >> SUPABASE_SERVICE_KEY must be the service_role JWT from\n"
            "     Supabase Dashboard > Project Settings > API > service_role\n"
            "  >> It should start with 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'",
            exc,
        )
        return None


def test_connection() -> tuple[bool, str]:
    """Test Supabase connectivity. Returns (ok, message)."""
    sb = get_supabase()
    if sb is None:
        return False, (
            "Supabase client could not be created. "
            "Go to Supabase Dashboard > Project Settings > API > "
            "copy the service_role (secret) key and paste it as "
            "SUPABASE_SERVICE_KEY in backend/.env"
        )
    try:
        sb.table("users").select("id").limit(1).execute()
        return True, "Supabase connected successfully."
    except Exception as exc:
        return False, f"Supabase query failed: {exc}"


async def db_list_students() -> list[dict]:
    """Return all users with role='student', ordered by creation date desc."""
    sb = get_supabase()
    if sb is None:
        return []
    try:
        res = (
            sb.table("users")
            .select("id, full_name, email, created_at, consent_given")
            .eq("role", "student")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as exc:
        logger.error("db_list_students failed: %s", exc)
        return []


async def db_delete_student(user_id: str) -> tuple[bool, str]:
    """
    Hard-delete a student and everything associated with them:
      1. Delete their video files from Supabase Storage (recordings bucket)
      2. Delete the auth.users row — cascades to users, presentations,
         analysis_results, advice_cards, feedback_reports, consent_log, etc.
    Returns (success, message).
    """
    sb = get_supabase()
    if sb is None:
        return False, "Supabase unavailable"
    try:
        # Collect all presentation IDs so we can purge storage
        res = (
            sb.table("presentations")
            .select("id")
            .eq("student_id", user_id)
            .execute()
        )
        pres_rows = res.data or []

        # Delete storage objects for each presentation
        if pres_rows:
            paths = [f"{user_id}/{row['id']}/video.webm" for row in pres_rows]
            try:
                sb.storage.from_("recordings").remove(paths)
            except Exception as exc:
                logger.warning("Storage delete partial failure for %s: %s", user_id, exc)

        # Delete the auth user — RLS cascade removes all child rows
        sb.auth.admin.delete_user(user_id)
        return True, "Student deleted"
    except Exception as exc:
        logger.error("db_delete_student failed for %s: %s", user_id, exc)
        return False, str(exc)


async def db_update_presentation(presentation_id: str, data: dict) -> None:
    sb = get_supabase()
    if sb is None:
        logger.warning("db_update_presentation: Supabase unavailable — status not saved for %s", presentation_id)
        return
    try:
        sb.table("presentations").update(data).eq("id", presentation_id).execute()
    except Exception as exc:
        logger.error("db_update_presentation failed for %s: %s", presentation_id, exc)


def _coerce_json(obj):
    """
    Recursively convert numpy scalars / arrays to plain Python types so that
    supabase-py can JSON-serialise the payload without TypeError.
    Called on the report dict before every INSERT.
    """
    try:
        import numpy as np
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
    except ImportError:
        pass
    if isinstance(obj, dict):
        return {k: _coerce_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_coerce_json(v) for v in obj]
    return obj


async def db_insert_report(report: dict) -> str | None:
    """Insert feedback_reports row; returns the new row id."""
    sb = get_supabase()
    if sb is None:
        logger.warning("db_insert_report: Supabase unavailable — report not saved for presentation %s", report.get("presentation_id"))
        return None
    try:
        safe_report = _coerce_json(report)
        logger.debug("db_insert_report: inserting keys=%s for presentation=%s", list(safe_report.keys()), safe_report.get("presentation_id"))
        # returning="representation" is the default in postgrest-py 0.16+ so
        # res.data will contain the inserted row including the generated id.
        res = sb.table("feedback_reports").insert(safe_report).execute()
        logger.debug("db_insert_report: raw res.data=%s", res.data)
        if res.data:
            return res.data[0]["id"]
        logger.warning("db_insert_report: insert returned no data for presentation %s — row may still exist in DB", safe_report.get("presentation_id"))
        return None
    except Exception as exc:
        logger.exception("db_insert_report failed for presentation %s", safe_report.get("presentation_id"))
        return None


async def db_insert_session_history(student_id: str, report_id: str) -> None:
    sb = get_supabase()
    if sb is None:
        return
    try:
        sb.table("session_history").insert(
            {"student_id": student_id, "report_id": report_id}
        ).execute()
    except Exception as exc:
        logger.error("db_insert_session_history failed for student %s: %s", student_id, exc)


async def db_get_report(presentation_id: str) -> dict | None:
    """
    Fetch the feedback report, then separately fetch presentation context fields.
    Two separate queries avoids relying on a specific FK constraint name, which
    differs between Supabase projects and caused 500 errors when the name didn't match.
    """
    sb = get_supabase()
    if sb is None:
        return None
    try:
        # Try by presentation_id first (new sessions redirect with presentation_id)
        report_res = (
            sb.table("feedback_reports")
            .select("*")
            .eq("presentation_id", presentation_id)
            .limit(1)
            .execute()
        )
        if not report_res.data:
            # Fall back to report's own primary key (dashboard/history links use report_id)
            report_res = (
                sb.table("feedback_reports")
                .select("*")
                .eq("id", presentation_id)
                .limit(1)
                .execute()
            )
        if not report_res.data:
            return None
        row = dict(report_res.data[0])
    except Exception as exc:
        logger.error("db_get_report: feedback_reports query failed for %s: %s", presentation_id, exc)
        return None

    # Fetch presentation context using the resolved presentation_id from the row
    resolved_pres_id = row.get("presentation_id", presentation_id)
    try:
        pres_res = (
            sb.table("presentations")
            .select("topic_text, session_mode, duration_secs")
            .eq("id", resolved_pres_id)
            .limit(1)
            .execute()
        )
        pres = (pres_res.data[0] if pres_res.data else {}) if pres_res is not None else {}
    except Exception:
        pres = {}

    row["topic_text"] = pres.get("topic_text")
    row["session_mode"] = pres.get("session_mode")
    row["duration_secs"] = pres.get("duration_secs")
    return row


# ── Admin helpers ────────────────────────────────────────────────────────────

async def db_get_educator_approvals() -> list:
    sb = get_supabase()
    if sb is None:
        return []
    try:
        res = (
            sb.table("educator_approvals")
            .select("*, users!educator_approvals_educator_id_fkey(full_name, email)")
            .eq("status", "pending")
            .order("submitted_at", desc=False)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


async def db_update_educator_approval(approval_id: str, status: str) -> bool:
    sb = get_supabase()
    if sb is None:
        return False
    try:
        from datetime import datetime, timezone
        sb.table("educator_approvals").update({
            "status": status,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", approval_id).execute()
        if status == "approved":
            res = (
                sb.table("educator_approvals")
                .select("educator_id")
                .eq("id", approval_id)
                .maybe_single()
                .execute()
            )
            if res.data:
                sb.table("users").update({"role": "educator"}).eq(
                    "id", res.data["educator_id"]
                ).execute()
        return True
    except Exception:
        return False


# ── Course helpers ────────────────────────────────────────────────────────────

def db_get_courses_for_educator(educator_id: str) -> list:
    sb = get_supabase()
    if sb is None:
        return []
    try:
        res = (
            sb.table("courses")
            .select("*, course_members(count)")
            .eq("educator_id", educator_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def db_create_course(educator_id: str, name: str, subject_code: str,
                     description: str, invite_code: str) -> dict | None:
    sb = get_supabase()
    if sb is None:
        raise RuntimeError("Supabase unavailable — check SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env")
    res = sb.table("courses").insert({
        "educator_id": educator_id,
        "name": name,
        "subject_code": subject_code,
        "description": description,
        "invite_code": invite_code,
    }).execute()
    return res.data[0] if res.data else None


def db_get_course(course_id: str) -> dict | None:
    sb = get_supabase()
    if sb is None:
        return None
    try:
        res = (
            sb.table("courses")
            .select("*")
            .eq("id", course_id)
            .maybe_single()
            .execute()
        )
        return res.data
    except Exception:
        return None


def db_update_course_rubric(course_id: str, rubric_path: str) -> bool:
    sb = get_supabase()
    if sb is None:
        return False
    try:
        sb.table("courses").update({"rubric_path": rubric_path}).eq("id", course_id).execute()
        return True
    except Exception:
        return False


def db_get_course_members(course_id: str) -> list:
    sb = get_supabase()
    if sb is None:
        return []
    try:
        res = (
            sb.table("course_members")
            .select("*, users!course_members_student_id_fkey(full_name, email)")
            .eq("course_id", course_id)
            .order("requested_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        logger.exception("db_get_course_members failed for course=%s", course_id)
        return []


def db_join_course_by_code(student_id: str, invite_code: str) -> dict | None:
    """Student requests to join by invite code. Returns member record or None."""
    sb = get_supabase()
    if sb is None:
        return None
    try:
        course_res = (
            sb.table("courses")
            .select("id")
            .eq("invite_code", invite_code.strip().upper())
            .maybe_single()
            .execute()
        )
        if not course_res.data:
            return None
        course_id = course_res.data["id"]
        # Upsert — reset to pending if previously rejected, ignore if already pending/approved
        res = sb.table("course_members").upsert({
            "course_id": course_id,
            "student_id": student_id,
            "status": "pending",
        }, on_conflict="course_id,student_id").execute()
        if not res.data:
            logger.error("db_join_course_by_code: upsert returned no data for student=%s course=%s", student_id, course_id)
            return None
        return res.data[0]
    except Exception:
        logger.exception("db_join_course_by_code failed for student=%s invite=%s", student_id, invite_code)
        return None


def db_respond_member(member_id: str, status: str) -> bool:
    sb = get_supabase()
    if sb is None:
        return False
    try:
        from datetime import datetime, timezone
        sb.table("course_members").update({
            "status": status,
            "responded_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", member_id).execute()
        return True
    except Exception:
        return False


def db_get_student_courses(student_id: str) -> list:
    sb = get_supabase()
    if sb is None:
        return []
    try:
        res = (
            sb.table("course_members")
            .select("*, courses(id, name, subject_code, invite_code, rubric_path, educator_id, users!courses_educator_id_fkey(full_name))")
            .eq("student_id", student_id)
            .order("requested_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


# ── Assignment helpers ────────────────────────────────────────────────────────

def db_get_assignments(course_id: str) -> list:
    sb = get_supabase()
    if sb is None:
        return []
    try:
        res = (
            sb.table("assignments")
            .select("*")
            .eq("course_id", course_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def db_create_assignment(course_id: str, title: str, description: str,
                         deadline: str | None, exam_mode: bool,
                         slide_required: bool = False,
                         scheduled_at: str | None = None,
                         exam_duration_mins: int | None = None,
                         exam_topic_id: str | None = None) -> dict | None:
    sb = get_supabase()
    if sb is None:
        return None
    try:
        payload: dict = {
            "course_id": course_id,
            "title": title,
            "description": description,
            "deadline": deadline,
            "exam_mode": exam_mode,
            "slide_required": slide_required,
        }
        if scheduled_at is not None:
            payload["scheduled_at"] = scheduled_at
        if exam_duration_mins is not None:
            payload["exam_duration_mins"] = exam_duration_mins
        if exam_topic_id is not None:
            payload["exam_topic_id"] = exam_topic_id
        res = sb.table("assignments").insert(payload).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


def db_create_standalone_exam(
    educator_id: str,
    title: str,
    scheduled_at: str | None = None,
    exam_duration_mins: int | None = None,
    exam_topic_id: str | None = None,
) -> dict | None:
    sb = get_supabase()
    if sb is None:
        return None
    try:
        payload: dict = {
            "title": title,
            "exam_mode": True,
            "educator_id": educator_id,
        }
        if scheduled_at is not None:
            payload["scheduled_at"] = scheduled_at
        if exam_duration_mins is not None:
            payload["exam_duration_mins"] = exam_duration_mins
        if exam_topic_id is not None:
            payload["exam_topic_id"] = exam_topic_id
        res = sb.table("assignments").insert(payload).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


def db_get_standalone_exams(educator_id: str) -> list:
    sb = get_supabase()
    if sb is None:
        return []
    try:
        res = (
            sb.table("assignments")
            .select("*")
            .eq("educator_id", educator_id)
            .eq("exam_mode", True)
            .is_("course_id", "null")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def db_get_assignment(assignment_id: str) -> dict | None:
    sb = get_supabase()
    if sb is None:
        return None
    try:
        res = (
            sb.table("assignments")
            .select("*")
            .eq("id", assignment_id)
            .maybe_single()
            .execute()
        )
        return res.data
    except Exception:
        return None


# ── Submission / HITL helpers ────────────────────────────────────────────────

def db_get_course_submissions(course_id: str) -> list:
    """All presentations for assignments in a course, with latest report."""
    sb = get_supabase()
    if sb is None:
        return []
    try:
        assign_res = (
            sb.table("assignments")
            .select("id")
            .eq("course_id", course_id)
            .execute()
        )
        assignment_ids = [a["id"] for a in (assign_res.data or [])]
        if not assignment_ids:
            return []
        res = (
            sb.table("presentations")
            .select("*, users!presentations_student_id_fkey(full_name, email), feedback_reports(band_score, wpm_avg, eye_contact_pct, posture_score, generated_at), assignments(title)")
            .in_("assignment_id", assignment_ids)
            .order("uploaded_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def db_get_submission_detail(presentation_id: str) -> dict | None:
    sb = get_supabase()
    if sb is None:
        return None
    try:
        res = (
            sb.table("presentations")
            .select("*, users!presentations_student_id_fkey(full_name, email), feedback_reports(*), educator_overrides(*)")
            .eq("id", presentation_id)
            .maybe_single()
            .execute()
        )
        return res.data
    except Exception:
        return None


def db_get_educator_analytics(educator_id: str) -> dict:
    """Aggregate performance stats across all educator's courses."""
    import logging
    logger = logging.getLogger(__name__)
    sb = get_supabase()
    empty = {"courses": [], "totals": {"course_count": 0, "student_count": 0, "submission_count": 0, "avg_band": None}, "top_issues": [], "band_distribution": {"1-2": 0, "2-3": 0, "3-4": 0, "4-5": 0, "5+": 0}}
    if sb is None:
        return empty
    try:
        courses_res = sb.table("courses").select("id, name, subject_code").eq("educator_id", educator_id).execute()
        courses = courses_res.data or []
        course_ids = [c["id"] for c in courses]
        if not course_ids:
            return {**empty, "totals": {**empty["totals"], "course_count": 0}}

        members_res = sb.table("course_members").select("course_id, student_id").eq("status", "approved").in_("course_id", course_ids).execute()
        members = members_res.data or []
        members_by_course: dict = {}
        for m in members:
            members_by_course[m["course_id"]] = members_by_course.get(m["course_id"], 0) + 1

        assign_res = sb.table("assignments").select("id, course_id").in_("course_id", course_ids).execute()
        assignments = assign_res.data or []
        assign_ids = [a["id"] for a in assignments]
        assign_to_course = {a["id"]: a["course_id"] for a in assignments}

        course_stats: dict = {cid: {"bands": [], "wpms": [], "eye_contacts": [], "sub_count": 0} for cid in course_ids}
        all_bands: list = []
        issue_counts: dict = {}

        if assign_ids:
            pres_res = sb.table("presentations").select(
                "id, assignment_id, feedback_reports(band_score, wpm_avg, eye_contact_pct, advice_cards)"
            ).in_("assignment_id", assign_ids).execute()
            for p in (pres_res.data or []):
                cid = assign_to_course.get(p.get("assignment_id"))
                if not cid:
                    continue
                stats = course_stats[cid]
                stats["sub_count"] += 1
                rep_raw = p.get("feedback_reports")
                rep = (rep_raw[0] if isinstance(rep_raw, list) else rep_raw) if rep_raw else None
                if not rep:
                    continue
                if rep.get("band_score") is not None:
                    stats["bands"].append(rep["band_score"])
                    all_bands.append(rep["band_score"])
                if rep.get("wpm_avg") is not None:
                    stats["wpms"].append(rep["wpm_avg"])
                if rep.get("eye_contact_pct") is not None:
                    stats["eye_contacts"].append(rep["eye_contact_pct"])
                for card in (rep.get("advice_cards") or []):
                    if card.get("impact") in ("HIGH", "MED"):
                        txt = (card.get("text") or "").strip()
                        if txt:
                            issue_counts[txt] = issue_counts.get(txt, 0) + 1

        result_courses = []
        for c in courses:
            cid = c["id"]
            s = course_stats[cid]
            result_courses.append({
                "id": cid,
                "name": c["name"],
                "subject_code": c["subject_code"],
                "student_count": members_by_course.get(cid, 0),
                "submission_count": s["sub_count"],
                "avg_band": round(sum(s["bands"]) / len(s["bands"]), 2) if s["bands"] else None,
                "avg_wpm": round(sum(s["wpms"]) / len(s["wpms"]), 1) if s["wpms"] else None,
                "avg_eye_contact": round(sum(s["eye_contacts"]) / len(s["eye_contacts"]), 1) if s["eye_contacts"] else None,
            })

        top_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:6]

        band_dist: dict = {"1-2": 0, "2-3": 0, "3-4": 0, "4-5": 0, "5+": 0}
        for b in all_bands:
            if b < 2:
                band_dist["1-2"] += 1
            elif b < 3:
                band_dist["2-3"] += 1
            elif b < 4:
                band_dist["3-4"] += 1
            elif b < 5:
                band_dist["4-5"] += 1
            else:
                band_dist["5+"] += 1

        return {
            "courses": result_courses,
            "totals": {
                "course_count": len(courses),
                "student_count": len(members),
                "submission_count": sum(s["sub_count"] for s in course_stats.values()),
                "avg_band": round(sum(all_bands) / len(all_bands), 2) if all_bands else None,
            },
            "top_issues": [{"text": t, "count": cnt} for t, cnt in top_issues],
            "band_distribution": band_dist,
        }
    except Exception as exc:
        logger.warning("Analytics error: %s", exc)
        return empty


def db_create_override(presentation_id: str, educator_id: str,
                       original_band: float | None, override_band: float,
                       feedback: str, grade_percent: float | None = None,
                       grade_letter: str | None = None,
                       presentation_accuracy_score: float | None = None,
                       presentation_accuracy_notes: str | None = None) -> bool:
    """Save an educator override as a draft. Not visible to the student until released."""
    sb = get_supabase()
    if sb is None:
        return False
    try:
        existing = (
            sb.table("educator_overrides")
            .select("id")
            .eq("presentation_id", presentation_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        payload: dict = {
            "presentation_id": presentation_id,
            "educator_id": educator_id,
            "original_band": original_band,
            "override_band": override_band,
            "feedback": feedback,
            "grade_percent": grade_percent,
            "grade_letter": grade_letter,
        }
        if presentation_accuracy_score is not None:
            payload["presentation_accuracy_score"] = presentation_accuracy_score
        if presentation_accuracy_notes is not None:
            payload["presentation_accuracy_notes"] = presentation_accuracy_notes
        if existing.data:
            sb.table("educator_overrides").update(payload).eq(
                "id", existing.data[0]["id"]
            ).execute()
        else:
            sb.table("educator_overrides").insert(payload).execute()
        return True
    except Exception:
        return False


def db_release_override(presentation_id: str) -> bool:
    """Mark the latest draft override for a presentation as released, and write
    the override band back to feedback_reports so student-facing views surface it."""
    sb = get_supabase()
    if sb is None:
        return False
    try:
        existing = (
            sb.table("educator_overrides")
            .select("id, override_band")
            .eq("presentation_id", presentation_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not existing.data:
            return False
        override_row = existing.data[0]
        from datetime import datetime, timezone
        sb.table("educator_overrides").update(
            {"released_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", override_row["id"]).execute()

        report_res = (
            sb.table("feedback_reports")
            .select("id")
            .eq("presentation_id", presentation_id)
            .maybe_single()
            .execute()
        )
        if report_res.data:
            sb.table("feedback_reports").update(
                {"band_score": override_row["override_band"]}
            ).eq("id", report_res.data["id"]).execute()
        return True
    except Exception:
        return False


# ── Exam invitation helpers ───────────────────────────────────────────────────

def db_create_exam_invitation(assignment_id: str, student_id: str, educator_id: str) -> dict | None:
    sb = get_supabase()
    if sb is None:
        return None
    try:
        res = sb.table("exam_invitations").upsert({
            "assignment_id": assignment_id,
            "student_id": student_id,
            "invited_by": educator_id,
            "status": "pending",
        }, on_conflict="assignment_id,student_id").execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


def db_get_exam_invitations_for_student(student_id: str) -> list:
    sb = get_supabase()
    if sb is None:
        return []
    try:
        res = (
            sb.table("exam_invitations")
            .select("*, assignments(id, title, scheduled_at, exam_duration_mins, course_id, courses(name))")
            .eq("student_id", student_id)
            .order("invited_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def db_get_exam_invitations_for_assignment(assignment_id: str) -> list:
    sb = get_supabase()
    if sb is None:
        return []
    try:
        res = (
            sb.table("exam_invitations")
            .select("*, users(id, full_name, email)")
            .eq("assignment_id", assignment_id)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def db_get_exam_submission_statuses(student_id: str) -> list:
    """For each accepted exam invitation, return submission state and grade release status."""
    sb = get_supabase()
    if sb is None:
        return []
    try:
        inv_res = (
            sb.table("exam_invitations")
            .select("assignment_id")
            .eq("student_id", student_id)
            .eq("status", "accepted")
            .execute()
        )
        assignment_ids = [r["assignment_id"] for r in (inv_res.data or [])]
        if not assignment_ids:
            return []

        pres_res = (
            sb.table("presentations")
            .select("id, assignment_id, status, educator_overrides(released_at)")
            .eq("student_id", student_id)
            .in_("assignment_id", assignment_ids)
            .order("uploaded_at", desc=True)
            .execute()
        )

        seen: set = set()
        result = []
        for p in (pres_res.data or []):
            aid = p["assignment_id"]
            if aid in seen:
                continue
            seen.add(aid)
            overrides = p.get("educator_overrides") or []
            if isinstance(overrides, dict):
                overrides = [overrides]
            grade_released = any(o.get("released_at") for o in overrides)
            result.append({
                "assignment_id": aid,
                "presentation_id": p["id"],
                "status": p["status"],
                "grade_released": grade_released,
            })
        return result
    except Exception:
        return []


def db_respond_exam_invitation(invitation_id: str, student_id: str, status: str) -> bool:
    sb = get_supabase()
    if sb is None:
        return False
    try:
        from datetime import datetime, timezone
        sb.table("exam_invitations").update({
            "status": status,
            "responded_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", invitation_id).eq("student_id", student_id).execute()
        return True
    except Exception:
        return False


# ── Student directory helpers ─────────────────────────────────────────────────

def db_get_all_students() -> list:
    """Returns all registered students for educator invite workflows."""
    sb = get_supabase()
    if sb is None:
        return []
    try:
        res = (
            sb.table("users")
            .select("id, full_name, email")
            .eq("role", "student")
            .order("full_name")
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def db_get_students_overview(educator_id: str) -> list:
    """Returns all enrolled students across educator's courses with band stats."""
    sb = get_supabase()
    if sb is None:
        return []
    try:
        courses_res = (
            sb.table("courses")
            .select("id, name, subject_code")
            .eq("educator_id", educator_id)
            .execute()
        )
        courses = courses_res.data or []
        course_ids = [c["id"] for c in courses]
        course_map = {c["id"]: c for c in courses}
        if not course_ids:
            return []

        members_res = (
            sb.table("course_members")
            .select("student_id, course_id, users(id, full_name, email)")
            .in_("course_id", course_ids)
            .eq("status", "approved")
            .execute()
        )

        # Build per-student record
        student_map: dict = {}
        for m in (members_res.data or []):
            sid = m["student_id"]
            u = m.get("users") or {}
            if sid not in student_map:
                student_map[sid] = {
                    "student_id": sid,
                    "full_name": u.get("full_name") or "—",
                    "email": u.get("email") or "—",
                    "courses": [],
                    "current_band": None,
                    "highest_band": None,
                }
            cinfo = course_map.get(m["course_id"])
            if cinfo and not any(c["id"] == m["course_id"] for c in student_map[sid]["courses"]):
                student_map[sid]["courses"].append({
                    "id": m["course_id"],
                    "name": cinfo["name"],
                    "subject_code": cinfo["subject_code"],
                })

        if not student_map:
            return []

        # Fetch presentations + released band scores for these students
        pres_res = (
            sb.table("presentations")
            .select("student_id, uploaded_at, feedback_reports(band_score)")
            .in_("student_id", list(student_map.keys()))
            .eq("status", "complete")
            .order("uploaded_at", desc=True)
            .execute()
        )

        seen_first: set = set()
        for p in (pres_res.data or []):
            sid = p["student_id"]
            if sid not in student_map:
                continue
            reports = p.get("feedback_reports") or []
            if isinstance(reports, dict):
                reports = [reports]
            for r in reports:
                band = r.get("band_score")
                if band is None:
                    continue
                st = student_map[sid]
                if sid not in seen_first:
                    st["current_band"] = band
                    seen_first.add(sid)
                if st["highest_band"] is None or band > st["highest_band"]:
                    st["highest_band"] = band

        return sorted(student_map.values(), key=lambda s: s["full_name"])
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("students_overview error: %s", exc)
        return []
