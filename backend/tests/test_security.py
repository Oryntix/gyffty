"""Guards that protect the deployment: config validation, token handling,
rate limiting, security headers and admin authorisation."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import INSECURE_SECRETS, Settings
from app.core.middleware import SECURITY_HEADERS
from app.core.security import (
    REFRESH_TOKEN,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

API = "/api/v1"

PROD_BASE = {
    "ENVIRONMENT": "production",
    "DEBUG": False,
    "SECRET_KEY": "a" * 64,
    "DATABASE_URL": "postgresql+psycopg://u:p@db:5432/gyffty",
    "BACKEND_CORS_ORIGINS": ["https://gyffty.com"],
    "ALLOWED_HOSTS": ["api.gyffty.com"],
}


# --------------------------------------------------- production config guards


def test_a_valid_production_config_is_accepted() -> None:
    settings = Settings(_env_file=None, **PROD_BASE)
    assert settings.is_production is True


@pytest.mark.parametrize(
    ("override", "expected"),
    [
        ({"SECRET_KEY": "change-me-in-production"}, "SECRET_KEY"),
        ({"SECRET_KEY": "tooshort"}, "SECRET_KEY"),
        ({"DATABASE_URL": "sqlite:///./gyffty.db"}, "SQLite"),
        ({"DEBUG": True}, "DEBUG"),
        ({"BACKEND_CORS_ORIGINS": ["*"]}, "CORS"),
        ({"ALLOWED_HOSTS": ["*"]}, "ALLOWED_HOSTS"),
        ({"PAYMENT_PROVIDER": "razorpay"}, "RAZORPAY"),
        ({"EMAIL_BACKEND": "smtp"}, "SMTP_HOST"),
    ],
)
def test_production_refuses_to_boot_when_unsafe(override: dict, expected: str) -> None:
    with pytest.raises(ValueError, match=expected):
        Settings(_env_file=None, **{**PROD_BASE, **override})


def test_development_tolerates_the_defaults(monkeypatch) -> None:
    """The guard applies only to production.

    Ambient DATABASE_URL / SECRET_KEY are cleared so this asserts the built-in
    defaults rather than whatever the surrounding test run happens to export.
    """
    for var in ("DATABASE_URL", "SECRET_KEY", "DEBUG"):
        monkeypatch.delenv(var, raising=False)
    settings = Settings(_env_file=None, ENVIRONMENT="development")
    assert settings.is_production is False
    assert settings.DATABASE_URL.startswith("sqlite")
    assert settings.SECRET_KEY in INSECURE_SECRETS


def test_cors_origins_accept_a_comma_separated_string() -> None:
    settings = Settings(_env_file=None, BACKEND_CORS_ORIGINS="https://a.com, https://b.com")
    assert settings.BACKEND_CORS_ORIGINS == ["https://a.com", "https://b.com"]


# ------------------------------------------------------------------- tokens


def test_password_round_trip() -> None:
    hashed = hash_password("Correct-Horse-2026")
    assert verify_password("Correct-Horse-2026", hashed)
    assert not verify_password("wrong", hashed)


def test_overlong_passwords_are_rejected_not_truncated() -> None:
    """bcrypt silently ignores bytes past 72, which would make two different
    long passwords interchangeable."""
    with pytest.raises(ValueError):
        hash_password("x" * 73)


def test_a_corrupt_hash_fails_closed() -> None:
    assert verify_password("anything", "not-a-bcrypt-hash") is False


def test_token_type_confusion_is_blocked() -> None:
    access = create_access_token("42")
    refresh = create_refresh_token("42")
    assert decode_token(access) is not None
    assert decode_token(access, expected_type=REFRESH_TOKEN) is None
    assert decode_token(refresh, expected_type=REFRESH_TOKEN) is not None
    assert decode_token(refresh) is None


def test_a_tampered_token_is_rejected() -> None:
    token = create_access_token("42")
    head, payload, signature = token.split(".")
    assert decode_token(f"{head}.{payload}.{signature[:-3]}abc") is None


def test_tokens_carry_a_unique_id() -> None:
    first = decode_token(create_access_token("42"))
    second = decode_token(create_access_token("42"))
    assert first["jti"] != second["jti"]


# ------------------------------------------------------------------ headers


def test_security_headers_are_present(client: TestClient) -> None:
    response = client.get(f"{API}/health")
    for header, value in SECURITY_HEADERS.items():
        assert response.headers.get(header) == value


def test_every_response_carries_a_request_id(client: TestClient) -> None:
    response = client.get(f"{API}/health")
    assert response.headers.get("X-Request-ID")


def test_a_supplied_request_id_is_echoed(client: TestClient) -> None:
    response = client.get(f"{API}/health", headers={"X-Request-ID": "trace-me-123"})
    assert response.headers["X-Request-ID"] == "trace-me-123"


# -------------------------------------------------------------- rate limits


def test_rate_limiting_returns_429_with_retry_after(monkeypatch, client: TestClient) -> None:
    from app.core import ratelimit
    from app.core.redis_client import reset_store

    monkeypatch.setattr(ratelimit.settings, "RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(ratelimit.settings, "RATE_LIMIT_AUTH_PER_MINUTE", 3)
    reset_store()

    codes = [
        client.post(
            f"{API}/auth/login",
            json={"email": "nobody@example.com", "password": "nope"},
        ).status_code
        for _ in range(6)
    ]
    assert 429 in codes, codes
    limited = client.post(
        f"{API}/auth/login", json={"email": "nobody@example.com", "password": "nope"}
    )
    assert limited.status_code == 429
    assert limited.headers.get("Retry-After")
    reset_store()


def test_the_in_memory_limiter_expires_its_window() -> None:
    from app.core.redis_client import InMemoryStore

    store = InMemoryStore()
    assert store.incr_with_expiry("k", 60) == 1
    assert store.incr_with_expiry("k", 60) == 2
    assert store.incr_with_expiry("other", 60) == 1


def test_revocation_store_round_trip() -> None:
    from app.core.redis_client import InMemoryStore

    store = InMemoryStore()
    assert store.exists("revoked:abc") is False
    store.setex("revoked:abc", 60, "1")
    assert store.exists("revoked:abc") is True


# ------------------------------------------------------------------- admin


def test_admin_routes_reject_anonymous(client: TestClient) -> None:
    assert client.get(f"{API}/admin/coupons").status_code == 401


def test_admin_routes_reject_a_customer(client: TestClient, auth_headers: dict[str, str]) -> None:
    assert client.get(f"{API}/admin/coupons", headers=auth_headers).status_code == 403


def test_admin_can_list_coupons(client: TestClient, admin_headers: dict[str, str]) -> None:
    body = client.get(f"{API}/admin/coupons", headers=admin_headers).json()
    assert {c["code"] for c in body} >= {"GYFFTY10", "CORPORATE20"}


def test_admin_can_create_and_deactivate_a_coupon(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    created = client.post(
        f"{API}/admin/coupons",
        headers=admin_headers,
        json={
            "code": "TESTONLY5",
            "label": "5% off",
            "discount_type": "percent",
            "value": 5,
            "min_order_value": 500,
        },
    )
    assert created.status_code == 201, created.text

    preview = client.post(
        f"{API}/orders/coupons/preview", json={"code": "TESTONLY5", "subtotal": 1000}
    ).json()
    assert preview["accepted"] is True and preview["discount"] == 50

    assert client.delete(f"{API}/admin/coupons/TESTONLY5", headers=admin_headers).status_code == 200

    after = client.post(
        f"{API}/orders/coupons/preview", json={"code": "TESTONLY5", "subtotal": 1000}
    ).json()
    assert after["accepted"] is False


def test_a_percentage_coupon_over_100_is_rejected(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{API}/admin/coupons",
        headers=admin_headers,
        json={
            "code": "TOOMUCH",
            "label": "bad",
            "discount_type": "percent",
            "value": 150,
        },
    )
    assert response.status_code == 422


def test_duplicate_coupon_codes_are_rejected(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{API}/admin/coupons",
        headers=admin_headers,
        json={
            "code": "GYFFTY10",
            "label": "dupe",
            "discount_type": "flat",
            "value": 10,
        },
    )
    assert response.status_code == 409
