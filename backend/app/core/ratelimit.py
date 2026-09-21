"""Fixed-window rate limiting, backed by Redis when available."""

from __future__ import annotations

from collections.abc import Callable

from fastapi import Request

from app.core.config import settings
from app.core.redis_client import get_store


class RateLimitExceeded(Exception):
    def __init__(self, retry_after: int) -> None:
        super().__init__("Rate limit exceeded")
        self.retry_after = retry_after


def client_identifier(request: Request) -> str:
    """Prefer the authenticated subject, then the proxy-forwarded IP, then peer.

    X-Forwarded-For is only trusted because the deployment runs behind a proxy
    that overwrites it (see DEPLOYMENT.md). Exposing this service directly would
    let a client spoof the header and evade limits.
    """
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        return f"tok:{hash(auth[7:]) & 0xFFFFFFFF:08x}"

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    return f"ip:{request.client.host if request.client else 'unknown'}"


def check_rate_limit(
    request: Request, *, bucket: str, limit: int, window_seconds: int = 60
) -> None:
    if not settings.RATE_LIMIT_ENABLED:
        return
    key = f"rl:{bucket}:{client_identifier(request)}"
    count = get_store().incr_with_expiry(key, window_seconds)
    if count > limit:
        raise RateLimitExceeded(retry_after=window_seconds)


def rate_limit(bucket: str, limit: int | Callable[[], int], window_seconds: int = 60):
    """FastAPI dependency factory for per-endpoint limits.

    `limit` may be a callable so the ceiling is read from settings on each
    request rather than frozen at import time.
    """
    from fastapi import HTTPException, status

    def dependency(request: Request) -> None:
        resolved = limit() if callable(limit) else limit
        try:
            check_rate_limit(request, bucket=bucket, limit=resolved, window_seconds=window_seconds)
        except RateLimitExceeded as exc:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down.",
                headers={"Retry-After": str(exc.retry_after)},
            ) from exc

    return dependency
