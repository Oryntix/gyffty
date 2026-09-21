"""Engine and session factory."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    _engine_kwargs: dict = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool if ":memory:" in settings.DATABASE_URL else None,
    }
    _engine_kwargs = {k: v for k, v in _engine_kwargs.items() if v is not None}
else:
    _engine_kwargs = {
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_recycle": settings.DB_POOL_RECYCLE_SECONDS,
        "pool_timeout": 30,
    }

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=settings.DB_POOL_PRE_PING,
    echo=settings.DB_ECHO,
    future=True,
    **_engine_kwargs,
)


if _is_sqlite:

    @event.listens_for(Engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _record):
        """SQLite ignores foreign keys unless asked, and its default journal
        mode serialises readers behind writers."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """Request-scoped session. Rolls back anything a failing handler left open,
    so a poisoned transaction is never returned to the pool."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def verify_connection() -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    log.info("database.connected", dialect=engine.dialect.name)


def dispose_engine() -> None:
    engine.dispose()
