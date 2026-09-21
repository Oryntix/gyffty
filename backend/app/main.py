from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.middleware import register_middleware
from app.db.session import dispose_engine, verify_connection

log = get_logger(__name__)


def _init_sentry() -> None:
    if not settings.SENTRY_DSN:
        return
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            release=settings.VERSION,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            send_default_pii=False,
        )
        log.info("sentry.initialised", environment=settings.ENVIRONMENT)
    except ImportError:
        log.warning("sentry.sdk_missing", hint="pip install sentry-sdk")


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    _init_sentry()

    # Fail loudly at boot rather than on the first customer request.
    verify_connection()

    log.info(
        "api.startup",
        environment=settings.ENVIRONMENT,
        version=settings.VERSION,
        payment_provider=settings.PAYMENT_PROVIDER,
        email_backend=settings.EMAIL_BACKEND,
        rate_limiting=settings.RATE_LIMIT_ENABLED,
    )
    yield
    dispose_engine()
    log.info("api.shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="Commerce API for the Gyffty gift-hamper storefront.",
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json" if settings.ENABLE_DOCS else None,
        docs_url=settings.docs_url,
        redoc_url=settings.redoc_url,
        lifespan=lifespan,
    )

    # Rejects Host headers we do not serve, which blocks host-header poisoning.
    if settings.ALLOWED_HOSTS and settings.ALLOWED_HOSTS != ["*"]:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Cart-Token", "X-Request-ID"],
        expose_headers=["X-Cart-Token", "X-Request-ID", "X-Process-Time-Ms"],
        max_age=600,
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    register_middleware(app)
    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "docs": settings.docs_url or "disabled",
        }

    return app


app = create_app()
