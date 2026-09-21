"""Domain exceptions and the handlers that turn them into JSON responses.

Every error the client sees uses one envelope:

    {"error": {"code": "...", "message": "...", "details": {...}}}
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


class AppError(Exception):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "app_error"

    def __init__(self, message: str, *, details: dict | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "conflict"


class AuthError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "unauthorized"


class PermissionError_(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"


class ValidationError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "validation_error"


def _safe(value: Any) -> Any:
    """Make a validation error payload JSON-serialisable.

    Pydantic puts the original exception object in `ctx` when a custom
    validator raises. Passing that straight to JSONResponse raises
    `TypeError: Object of type ValueError is not JSON serializable`, turning a
    422 into a 500.
    """
    if isinstance(value, dict):
        return {k: _safe(v) for k, v in value.items()}
    if isinstance(value, list | tuple):
        return [_safe(v) for v in value]
    if isinstance(value, str | int | float | bool) or value is None:
        return value
    return str(value)


def _envelope(code: str, message: str, details: dict | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details or {}}}


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError) -> JSONResponse:
        details = dict(exc.details)
        if rid := _request_id(request):
            details.setdefault("request_id", rid)
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(exc.code, exc.message, _safe(details)),
        )

    @app.exception_handler(RequestValidationError)
    async def _request_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        details: dict[str, Any] = {"errors": _safe(exc.errors())}
        if rid := _request_id(request):
            details["request_id"] = rid
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_envelope("validation_error", "Request payload failed validation.", details),
        )

    @app.exception_handler(PydanticValidationError)
    async def _model_validation(request: Request, exc: PydanticValidationError) -> JSONResponse:
        """A model built inside a handler can also fail validation."""
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_envelope(
                "validation_error",
                "Request payload failed validation.",
                {"errors": _safe(exc.errors())},
            ),
        )

    @app.exception_handler(HTTPException)
    async def _http_exception(request: Request, exc: HTTPException) -> JSONResponse:
        """Reshape framework errors into the same envelope as everything else."""
        codes = {
            401: "unauthorized",
            403: "forbidden",
            404: "not_found",
            405: "method_not_allowed",
            409: "conflict",
            429: "rate_limited",
        }
        details: dict[str, Any] = {}
        if rid := _request_id(request):
            details["request_id"] = rid
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(codes.get(exc.status_code, "http_error"), str(exc.detail), details),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        """Last resort. Never leak an internal message or stack trace."""
        rid = _request_id(request)
        log.exception("unhandled_exception", request_id=rid, error=str(exc))
        message = (
            f"{type(exc).__name__}: {exc}"
            if not settings.is_production
            else "Something went wrong on our side."
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_envelope("internal_error", message, {"request_id": rid} if rid else {}),
        )
