"""
FastAPI authentication dependencies — CRIT-02 fix.

Verifies Supabase JWT tokens passed as `Authorization: Bearer <token>`.
Also accepts an X-Admin-Key header matching ADMIN_ACCESS_KEY env var for
direct admin panel access (FYP demo mode).
Used to protect admin and other sensitive routes.
"""
import os
import logging
from fastapi import HTTPException, Header
from typing import Optional

logger = logging.getLogger(__name__)


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    Extract and verify the Supabase JWT from the Authorization header.
    Returns the authenticated user's UUID on success.
    Raises HTTP 401 if the token is missing or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header. Expected: Bearer <supabase_jwt>",
        )

    token = authorization.split(" ", 1)[1].strip()

    try:
        from services.supabase_client import get_supabase
        sb = get_supabase()
        if sb is None:
            raise HTTPException(status_code=503, detail="Auth service unavailable — Supabase not configured")
        user_response = sb.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user_response.user.id
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Token verification failed")


async def require_admin(
    authorization: Optional[str] = Header(None),
    x_admin_key: Optional[str] = Header(None),
) -> str:
    """
    Dependency that requires admin access.

    Accepts two paths:
      1. X-Admin-Key header matching ADMIN_ACCESS_KEY env var (demo/FYP mode).
         Checked first so the admin panel works without a Supabase session.
      2. Authorization: Bearer <jwt> where the user has role='admin' in the
         users table (production path).

    Returns the user identifier on success. Raises HTTP 401/403 otherwise.
    """
    # ── Path 1: admin key bypass ──────────────────────────────────────────────
    admin_key = os.getenv("ADMIN_ACCESS_KEY", "")
    if admin_key and x_admin_key == admin_key:
        return "admin-demo"

    # ── Path 2: Supabase JWT + role check ─────────────────────────────────────
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Admin access requires either X-Admin-Key header or a valid admin JWT.",
        )

    token = authorization.split(" ", 1)[1].strip()

    try:
        from services.supabase_client import get_supabase
        sb = get_supabase()
        if sb is None:
            raise HTTPException(status_code=503, detail="Auth service unavailable")

        user_response = sb.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user_id = user_response.user.id
        res = (
            sb.table("users")
            .select("role")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if not res.data or res.data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return user_id
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Admin auth failed: %s", exc)
        raise HTTPException(status_code=403, detail="Access denied")
