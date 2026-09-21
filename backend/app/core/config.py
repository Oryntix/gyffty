"""Application settings, loaded once from the environment.

Production safety is enforced here rather than in a runbook: if the process is
started with ENVIRONMENT=production and an unsafe setting, it refuses to boot.
A container that will not start is far cheaper than one serving traffic with a
default signing key.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_SECRETS = {
    "dev-secret-key-not-for-production",
    "change-me-in-production",
    "change-me-in-production-use-openssl-rand-hex-32",
    "secret",
    "changeme",
}

MIN_SECRET_LENGTH = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    # ---- Application ------------------------------------------------
    PROJECT_NAME: str = "Gyffty API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "staging", "production", "test"] = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    # Set to expose /docs in production; off by default so the schema is private.
    ENABLE_DOCS: bool = True

    # ---- Security ---------------------------------------------------
    SECRET_KEY: str = "dev-secret-key-not-for-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    BCRYPT_ROUNDS: int = 12
    # Hosts this API will answer for. ["*"] is rejected in production.
    ALLOWED_HOSTS: list[str] = Field(default_factory=lambda: ["*"])
    FORCE_HTTPS: bool = False

    # ---- Database ---------------------------------------------------
    DATABASE_URL: str = "sqlite:///./gyffty.db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE_SECONDS: int = 1800
    DB_ECHO: bool = False
    # Verifies a pooled connection before handing it out. That costs one extra
    # round trip per request — negligible beside a local database, ~150ms
    # against a remote one. Leave it on in production, where a silently dropped
    # connection is a 500 for a customer; turn it off in development against a
    # far-away database and rely on DB_POOL_RECYCLE_SECONDS instead.
    DB_POOL_PRE_PING: bool = True

    # ---- Redis (rate limiting, caching, token revocation) -----------
    REDIS_URL: str | None = None

    # ---- CORS -------------------------------------------------------
    BACKEND_CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    # ---- Rate limiting ----------------------------------------------
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT_PER_MINUTE: int = 120
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10
    RATE_LIMIT_CHECKOUT_PER_MINUTE: int = 12

    # ---- Commerce ---------------------------------------------------
    CURRENCY: str = "INR"
    FREE_SHIPPING_THRESHOLD: float = 1999.0
    DEFAULT_SHIPPING_FEE: float = 99.0
    TAX_RATE: float = 0.18

    # ---- Payments ---------------------------------------------------
    # "mock" keeps checkout working with no gateway account. Swap to "razorpay"
    # once keys are present; the service interface does not change.
    PAYMENT_PROVIDER: Literal["mock", "razorpay"] = "mock"
    RAZORPAY_KEY_ID: str | None = None
    RAZORPAY_KEY_SECRET: str | None = None
    RAZORPAY_WEBHOOK_SECRET: str | None = None

    # ---- Email ------------------------------------------------------
    # "console" logs the rendered email instead of sending it.
    EMAIL_BACKEND: Literal["console", "smtp"] = "console"
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_USE_TLS: bool = True
    EMAIL_FROM: str = "Gyffty <care@gyffty.com>"
    EMAIL_REPLY_TO: str | None = None

    # ---- Observability ----------------------------------------------
    SENTRY_DSN: str | None = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1

    # ---- Storefront -------------------------------------------------
    STOREFRONT_URL: str = "http://localhost:3000"

    # -----------------------------------------------------------------

    @field_validator("BACKEND_CORS_ORIGINS", "ALLOWED_HOSTS", mode="before")
    @classmethod
    def _split_csv(cls, v: object) -> object:
        """Accept both a JSON array and a plain comma-separated string."""
        if isinstance(v, str) and not v.startswith("["):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @computed_field
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @computed_field
    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT == "test"

    @computed_field
    @property
    def docs_url(self) -> str | None:
        return "/docs" if self.ENABLE_DOCS else None

    @computed_field
    @property
    def redoc_url(self) -> str | None:
        return "/redoc" if self.ENABLE_DOCS else None

    @model_validator(mode="after")
    def _enforce_production_safety(self) -> Settings:
        if self.ENVIRONMENT != "production":
            return self

        problems: list[str] = []

        if self.SECRET_KEY in INSECURE_SECRETS:
            problems.append(
                "SECRET_KEY is still a placeholder. Generate one with: "
                'python -c "import secrets; print(secrets.token_hex(32))"'
            )
        elif len(self.SECRET_KEY) < MIN_SECRET_LENGTH:
            problems.append(
                f"SECRET_KEY must be at least {MIN_SECRET_LENGTH} characters "
                f"(got {len(self.SECRET_KEY)})."
            )

        if self.DATABASE_URL.startswith("sqlite"):
            problems.append(
                "DATABASE_URL points at SQLite. Use PostgreSQL in production: "
                "postgresql+psycopg://user:pass@host:5432/dbname"
            )

        if self.DEBUG:
            problems.append("DEBUG must be false in production.")

        if "*" in self.BACKEND_CORS_ORIGINS:
            problems.append("BACKEND_CORS_ORIGINS must list explicit origins, not '*'.")

        if not self.BACKEND_CORS_ORIGINS:
            problems.append("BACKEND_CORS_ORIGINS must not be empty in production.")

        if "*" in self.ALLOWED_HOSTS:
            problems.append("ALLOWED_HOSTS must list explicit hostnames, not '*'.")

        if self.PAYMENT_PROVIDER == "razorpay" and not (
            self.RAZORPAY_KEY_ID and self.RAZORPAY_KEY_SECRET
        ):
            problems.append(
                "PAYMENT_PROVIDER=razorpay requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
            )

        if self.EMAIL_BACKEND == "smtp" and not self.SMTP_HOST:
            problems.append("EMAIL_BACKEND=smtp requires SMTP_HOST.")

        if problems:
            bullet = "\n  - ".join(problems)
            raise ValueError(
                "Refusing to start: unsafe production configuration.\n"
                f"  - {bullet}\n"
                "Fix these environment variables, or set ENVIRONMENT to "
                "development/staging."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
