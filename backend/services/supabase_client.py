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


async def db_update_presentation(presentation_id: str, data: dict) -> None:
    sb = get_supabase()
    if sb is None:
        logger.warning("db_update_presentation: Supabase unavailable — status not saved for %s", presentation_id)
        return
    try:
        sb.table("presentations").update(data).eq("id", presentation_id).execute()
    except Exception as exc:
        logger.error("db_update_presentation failed for %s: %s", presentation_id, exc)


async def db_insert_report(report: dict) -> str | None:
    """Insert feedback_reports row; returns the new row id."""
    sb = get_supabase()
    if sb is None:
        logger.warning("db_insert_report: Supabase unavailable — report not saved for presentation %s", report.get("presentation_id"))
        return None
    try:
        res = sb.table("feedback_reports").insert(report).execute()
        if res.data:
            return res.data[0]["id"]
        logger.warning("db_insert_report: insert returned no data for presentation %s", report.get("presentation_id"))
        return None
    except Exception as exc:
        logger.error("db_insert_report failed: %s", exc)
        return None


async def db_insert_session_history(student_id: str, report_id: str) -> None:
    sb = get_supabase()
    if sb is None:
        return
    sb.table("session_history").insert(
        {"student_id": student_id, "report_id": report_id}
    ).execute()


async def db_get_report(presentation_id: str) -> dict | None:
    sb = get_supabase()
    if sb is None:
        return None
    res = (
        sb.table("feedback_reports")
        .select("*")
        .eq("presentation_id", presentation_id)
        .maybe_single()
        .execute()
    )
    return res.data


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
            .select("*, users(full_name, email)")
            .eq("course_id", course_id)
            .order("requested_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
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
        # Upsert — ignore if already requested
        res = sb.table("course_members").upsert({
            "course_id": course_id,
            "student_id": student_id,
            "status": "pending",
        }, on_conflict="course_id,student_id").execute()
        return res.data[0] if res.data else {"course_id": course_id, "status": "pending"}
    except Exception:
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
                         deadline: str | None, exam_mode: bool) -> dict | None:
    sb = get_supabase()
    if sb is None:
        return None
    try:
        res = sb.table("assignments").insert({
            "course_id": course_id,
            "title": title,
            "description": description,
            "deadline": deadline,
            "exam_mode": exam_mode,
        }).execute()
        return res.data[0] if res.data else None
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
                       feedback: str) -> bool:
    sb = get_supabase()
    if sb is None:
        return False
    try:
        sb.table("educator_overrides").insert({
            "presentation_id": presentation_id,
            "educator_id": educator_id,
            "original_band": original_band,
            "override_band": override_band,
            "feedback": feedback,
        }).execute()
        # Also update feedback_reports.band_score with the override
        report_res = (
            sb.table("feedback_reports")
            .select("id")
            .eq("presentation_id", presentation_id)
            .maybe_single()
            .execute()
        )
        if report_res.data:
            sb.table("feedback_reports").update({"band_score": override_band}).eq(
                "id", report_res.data["id"]
            ).execute()
        return True
    except Exception:
        return False
