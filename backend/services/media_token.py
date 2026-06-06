"""
Short-lived HMAC tokens for streaming locally-stored recordings.

A `<video src>` tag cannot send an Authorization header, so the local-file
streaming endpoint (/api/presentations/{id}/video-file) authorises via a signed
token in the query string. The token is minted only after the ownership check in
/video-url, so possession of a valid, unexpired token proves authorised access.
"""
import os
import hmac
import time
import base64
import hashlib

# Reuse an existing server secret — never exposed to the client.
_SECRET = (
    os.environ.get("SUPABASE_SERVICE_KEY")
    or os.environ.get("ADMIN_ACCESS_KEY")
    or "presentation-coach-dev-secret"
).encode("utf-8")

DEFAULT_TTL_SECONDS = 3600  # 1 hour


def _sign(payload: str) -> str:
    digest = hmac.new(_SECRET, payload.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def mint_video_token(presentation_id: str, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> str:
    """Return a token of the form `<exp>.<sig>` for the given presentation."""
    exp = int(time.time()) + ttl_seconds
    payload = f"{presentation_id}:{exp}"
    return f"{exp}.{_sign(payload)}"


def verify_video_token(presentation_id: str, token: str) -> bool:
    """Validate a token against the presentation id and its embedded expiry."""
    if not token or "." not in token:
        return False
    exp_str, sig = token.split(".", 1)
    try:
        exp = int(exp_str)
    except ValueError:
        return False
    if exp < int(time.time()):
        return False
    expected = _sign(f"{presentation_id}:{exp}")
    return hmac.compare_digest(expected, sig)
