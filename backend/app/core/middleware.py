"""Cross-cutting HTTP middleware: request IDs, access logs, security headers."""

from __future__ import annotations

import time
import uuid

import structlog
from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings
from app.core.logging import get_logger
from app.core.ratelimit import RateLimitExceeded, check_rate_limit

log = get_logger("api.access")

REQUEST_ID_HEADER = "X-Request-ID"

# Endpoints that are cheap and called constantly; logging them buries real traffic.
QUIET_PATHS = {"/api/v1/health", "/api/v1/health/ready", "/metrics", "/favicon.ico"}

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(self)",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-site",
    # The API returns JSON only; no scripts, no frames, no embedded anything.
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
}


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assigns a request ID, binds it to the logger, and logs the access line.

    The ID is echoed in the response header so a customer support ticket can be
    traced to exact log lines.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex[:16]
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        request.state.request_id = request_id
        started = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - started) * 1000
            log.exception("request.failed", duration_ms=round(duration_ms, 2))
            structlog.contextvars.clear_contextvars()
            # Never leak a stack trace to the client.
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": {
                        "code": "internal_error",
                        "message": "Something went wrong on our side.",
                        "details": {"request_id": request_id},
                    }
                },
                headers={REQUEST_ID_HEADER: request_id},
            )

        duration_ms = (time.perf_counter() - started) * 1000
        response.headers[REQUEST_ID_HEADER] = request_id
        response.headers["X-Process-Time-Ms"] = f"{duration_ms:.1f}"

        if request.url.path not in QUIET_PATHS:
            logger = log.warning if response.status_code >= 500 else log.info
            logger(
                "request.completed",
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2),
            )
        structlog.contextvars.clear_contextvars()
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        for header, value in SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        if settings.FORCE_HTTPS:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"
            )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Coarse per-IP ceiling. Tighter per-endpoint limits live in dependencies."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED or request.url.path in QUIET_PATHS:
            return await call_next(request)
        try:
            check_rate_limit(
                request,
                bucket="global",
                limit=settings.RATE_LIMIT_DEFAULT_PER_MINUTE,
                window_seconds=60,
            )
        except RateLimitExceeded as exc:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": {
                        "code": "rate_limited",
                        "message": "Too many requests. Please slow down.",
                        "details": {"retry_after_seconds": exc.retry_after},
                    }
                },
                headers={"Retry-After": str(exc.retry_after)},
            )
        return await call_next(request)


def register_middleware(app: FastAPI) -> None:
    """Order matters: the last added runs first on the way in."""
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestContextMiddleware)
