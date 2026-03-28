"""
FastAPI authentication dependencies — CRIT-02 fix.

Verifies Supabase JWT tokens passed as `Authorization: Bearer <token>`.
Also accepts an X-Admin-Key header matching ADMIN_ACCESS_KEY env var for
direct admin panel access (FYP demo mode).
Used to protect admin and other sensitive routes.
"""
import os
import logging
from fastapi import Depends, HTTPException, Header
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
    user_id: str = Depends(get_current_user_id),
    x_admin_key: Optional[str] = Header(None),
) -> str:
    """
    Dependency that requires the authenticated user to have role='admin'.
    Also accepts X-Admin-Key header matching ADMIN_ACCESS_KEY env var (demo mode).
    Returns the user_id on success. Raises HTTP 403 otherwise.
    """
    # Demo-mode bypass: X-Admin-Key header matches env var
    admin_key = os.getenv("ADMIN_ACCESS_KEY", "")
    if admin_key and x_admin_key == admin_key:
        return "admin-demo"

    try:
        from services.supabase_client import get_supabase
        sb = get_supabase()
        if sb is None:
            raise HTTPException(status_code=503, detail="Auth service unavailable")
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
        logger.warning("Admin role check failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=403, detail="Access denied")
