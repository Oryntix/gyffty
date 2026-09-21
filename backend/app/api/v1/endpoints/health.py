"""Liveness, readiness and public configuration.

Liveness answers "is this process alive" — it must never touch a dependency, or
a database blip would make the orchestrator kill healthy pods. Readiness answers
"should this instance receive traffic" and does check dependencies.
"""

from __future__ import annotations

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.api.deps import DbSession
from app.core.config import settings
from app.core.logging import get_logger
from app.core.redis_client import get_store

router = APIRouter(tags=["system"])
log = get_logger(__name__)


@router.get("/health")
def liveness() -> dict[str, str]:
    return {
        "status": "ok",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/health/ready")
def readiness(db: DbSession, response: Response) -> dict[str, object]:
    checks: dict[str, str] = {}
    healthy = True

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["database"] = f"error: {type(exc).__name__}"
        healthy = False
        log.error("readiness.database_failed", error=str(exc))

    store = get_store()
    checks["rate_limit_store"] = "redis" if store.is_distributed else "in-memory"
    if settings.REDIS_URL and not store.is_distributed:
        # Redis was configured but is unreachable. Serve on, but say so: limits
        # are now per-process rather than global.
        checks["redis"] = "degraded"

    response.status_code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "ready" if healthy else "degraded", "checks": checks}


@router.get("/config")
def public_config() -> dict[str, object]:
    """Commerce constants the storefront needs to render prices and copy.

    Only non-secret values belong here.
    """
    return {
        "currency": settings.CURRENCY,
        "free_shipping_threshold": settings.FREE_SHIPPING_THRESHOLD,
        "default_shipping_fee": settings.DEFAULT_SHIPPING_FEE,
        "tax_rate": settings.TAX_RATE,
        "payment_provider": settings.PAYMENT_PROVIDER,
    }
