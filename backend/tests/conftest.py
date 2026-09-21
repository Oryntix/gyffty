from __future__ import annotations

import os
from collections.abc import Generator

# Must be set before app.core.config is imported anywhere.
#
# The suite defaults to in-memory SQLite so it runs anywhere with no services.
# Set TEST_DATABASE_URL to point it at a real PostgreSQL instead — CI does, and
# so should you before trusting anything that depends on dialect behaviour
# (row locking, enum storage, case folding, transaction isolation).
#
#   TEST_DATABASE_URL=postgresql+psycopg://user:pass@host:5432/gyffty_test pytest -q
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")

os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["EMAIL_BACKEND"] = "console"
os.environ["PAYMENT_PROVIDER"] = "mock"
os.environ.pop("REDIS_URL", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.api.deps import get_db  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.init_db import (  # noqa: E402
    DEMO_PASSWORD,
    seed_categories,
    seed_coupons,
    seed_products,
    seed_users,
)
from app.main import app  # noqa: E402

# One in-memory database shared by every connection for the whole session.
engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def _database() -> Generator[None, None, None]:
    # Start from a known-empty schema even if a previous run died mid-way.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestSession() as db:
        categories = seed_categories(db)
        seed_products(db, categories)
        seed_users(db)
        seed_coupons(db)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """Each test starts with an empty limiter, so ordering cannot cause a 429."""
    from app.core.redis_client import reset_store

    reset_store()
    yield
    reset_store()


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    session = TestSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _login(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": DEMO_PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['tokens']['access_token']}"}


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    return _login(client, "priya@example.com")


@pytest.fixture
def admin_headers(client: TestClient) -> dict[str, str]:
    return _login(client, "admin@gyffty.com")
