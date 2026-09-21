#!/usr/bin/env bash
# Container entrypoint. Migrations run here, once, before any worker accepts
# traffic — never from application code, where N replicas would race.
set -euo pipefail

: "${PORT:=8000}"
: "${WEB_CONCURRENCY:=4}"

wait_for_db() {
  python - <<'PY'
import sys, time
from sqlalchemy import create_engine, text
from app.core.config import settings

deadline = time.time() + 60
last = None
while time.time() < deadline:
    try:
        create_engine(settings.DATABASE_URL, pool_pre_ping=True).connect().execute(text("SELECT 1"))
        print("database reachable", flush=True)
        sys.exit(0)
    except Exception as exc:
        last = exc
        time.sleep(2)
print(f"database unreachable after 60s: {last}", file=sys.stderr)
sys.exit(1)
PY
}

case "${1:-serve}" in
  serve)
    wait_for_db
    echo "running migrations..."
    alembic upgrade head
    echo "starting gunicorn on :${PORT} with ${WEB_CONCURRENCY} workers"
    exec gunicorn app.main:app \
      --worker-class uvicorn.workers.UvicornWorker \
      --workers "${WEB_CONCURRENCY}" \
      --bind "0.0.0.0:${PORT}" \
      --timeout 60 \
      --graceful-timeout 30 \
      --keep-alive 5 \
      --max-requests 2000 \
      --max-requests-jitter 200 \
      --access-logfile - \
      --error-logfile -
    ;;
  migrate)
    wait_for_db
    exec alembic upgrade head
    ;;
  seed)
    wait_for_db
    exec python -m app.db.init_db
    ;;
  shell)
    exec python
    ;;
  *)
    exec "$@"
    ;;
esac
