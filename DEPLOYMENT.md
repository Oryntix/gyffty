# Deploying Gyffty

Written for: whoever operates this service — the person doing the first deploy and the on-call after it.

---

## 1. What runs where

```
                 ┌─────────── Caddy (TLS, the only public port) ───────────┐
                 │                                                          │
   gyffty.com ───┤──> web    Next.js standalone, port 3000                  │
api.gyffty.com ──┤──> api    FastAPI + gunicorn, 4 uvicorn workers, :8000    │
                 │              │                                           │
                 └──────────────┼───────────────────────────────────────────┘
                                ├──> db     PostgreSQL 16
                                └──> redis  rate limits, token revocation
```

Only Caddy publishes ports. Postgres and Redis stay on the internal Docker
network and are unreachable from the host.

---

## 2. First deploy

```bash
git clone <your-repo> gyffty && cd gyffty
cp .env.production.example .env

# Generate a signing key. Do not reuse one from anywhere else.
python -c "import secrets; print(secrets.token_hex(32))"
```

Fill in `.env`, then:

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml logs -f api
```

Migrations run automatically in the API entrypoint before gunicorn starts, so
the schema is always current before a worker accepts traffic.

Point `gyffty.com` and `api.gyffty.com` at the host's IP. Caddy obtains and
renews TLS certificates on its own.

### Seed the catalogue (first deploy only)

```bash
docker compose -f docker-compose.prod.yml exec api ./docker-entrypoint.sh seed
```

This is idempotent: it does nothing if categories already exist. **Change the
demo passwords immediately** — the seed creates accounts with a known password.

---

## 3. The config guard

The API **refuses to start** with `ENVIRONMENT=production` and any of:

| Condition | Why it is fatal |
| --- | --- |
| `SECRET_KEY` is a placeholder or under 32 chars | Anyone could mint valid tokens |
| `DATABASE_URL` is SQLite | No concurrent writes, no durability story |
| `DEBUG=true` | Leaks internal error messages |
| `BACKEND_CORS_ORIGINS` contains `*` | Any site could call the API with credentials |
| `ALLOWED_HOSTS` contains `*` | Host-header poisoning |
| `PAYMENT_PROVIDER=razorpay` with no keys | Checkout would fail after taking the order |
| `EMAIL_BACKEND=smtp` with no host | Receipts would silently vanish |

A container that will not start is cheaper than one quietly serving traffic
with a default signing key. The error names every problem at once.

---

## 4. Before you take real money

Four things are deliberately stubbed. Everything else is production-shaped.

### Payments — currently `mock`

`PAYMENT_PROVIDER=mock` accepts any callback carrying its own intent id, so the
whole checkout flow is testable with no merchant account.

To go live:

```env
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx
```

Then register the webhook in the Razorpay dashboard:

```
https://api.gyffty.com/api/v1/orders/payment/webhook
events: payment.captured, payment.failed
```

No code changes. `RazorpayProvider` already implements the same three calls
(`create_intent`, `verify_callback`, `verify_webhook`) as the mock.

**The webhook is authoritative, not the browser callback.** A customer can
always close the tab after paying; the webhook is what marks an order paid.
Both paths are idempotent.

### Email — currently `console`

Receipts are logged, not sent. Set `EMAIL_BACKEND=smtp` plus `SMTP_HOST`,
`SMTP_USERNAME`, `SMTP_PASSWORD`. Sending happens in a background task and
never fails a paid order.

### Product imagery

Seed images point at `picsum.photos`. Replace `IMAGE_BASE` in
`backend/app/db/init_db.py` with your CDN, and add the hostname to both
`images.remotePatterns` and the CSP `img-src` in `frontend/next.config.mjs`.

### Error tracking

Set `SENTRY_DSN` and it initialises automatically. Without it, errors go to
structured logs only.

---

## 5. Operating it

```bash
# Health
curl https://api.gyffty.com/api/v1/health         # liveness, touches nothing
curl https://api.gyffty.com/api/v1/health/ready   # readiness, checks DB + Redis

# Logs (JSON in production; every line carries request_id)
docker compose -f docker-compose.prod.yml logs -f api

# Trace one customer complaint end to end
docker compose -f docker-compose.prod.yml logs api | grep <request_id>

# Migrations
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
docker compose -f docker-compose.prod.yml exec api alembic downgrade -1

# Backup, restore
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U gyffty gyffty | gzip > backup-$(date +%F).sql.gz
gunzip -c backup-2026-09-18.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U gyffty gyffty
```

`/health` never touches the database on purpose: a brief DB blip should not make
the orchestrator kill otherwise-healthy containers. `/health/ready` is the one
that pulls an instance out of rotation, and returns 503 when the DB is down.

### Zero-downtime deploys

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

gunicorn has `--graceful-timeout 30` and tini forwards SIGTERM, so in-flight
requests drain rather than being cut off.

---

## 6. Security posture

| Concern | Measure |
| --- | --- |
| Transport | Caddy terminates TLS; HSTS with preload; `upgrade-insecure-requests` |
| Passwords | bcrypt, 12 rounds; over-72-byte passwords rejected, not truncated |
| Tokens | HS256, 60-min access / 30-day refresh, each with a `jti` |
| Logout | Refresh token blocklisted in Redis until its own expiry |
| Rate limits | 120/min per IP globally, 10/min on auth, 12/min on checkout |
| Headers | CSP, `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy |
| Host header | `TrustedHostMiddleware` against `ALLOWED_HOSTS` |
| CORS | Explicit origins and methods; no wildcard in production |
| SQL | SQLAlchemy parameter binding throughout; no string-built SQL |
| Secrets | Environment only; `.env` is gitignored, `.env.production.example` has no values |
| Errors | Internal messages and stack traces never reach the client in production |
| Containers | Non-root user, pinned base images, no build toolchain in the runtime layer |

### One thing to get right

Rate limiting trusts `X-Forwarded-For`. That is safe **only** because Caddy
overwrites the header. If you ever expose the API directly, a client can spoof
it and evade limits. Keep the API behind the proxy.

---

## 7. Scaling

Every process is stateless; carts, sessions and rate limits live in Postgres and
Redis. To scale out:

```bash
docker compose -f docker-compose.prod.yml up -d --scale api=3 --scale web=2
```

Redis matters here. Without it, rate limits fall back to per-process counters,
so three replicas allow roughly three times the intended traffic. `/health/ready`
reports `redis: degraded` when this happens.

Tune `API_WORKERS` to roughly `2 × CPU cores`, and `DB_POOL_SIZE` so that
`replicas × workers × pool_size` stays under the Postgres `max_connections`.

---

## 8. If you use a managed database

A hosted Postgres (Supabase, Neon, RDS) replaces the `db` service. Drop it from
the compose file and set `DATABASE_URL`.

Two things catch people out:

**Percent-encode the password.** A password containing `@` must be written
`%40`, or the URL parser reads it as the host separator:

```env
DATABASE_URL=postgresql+psycopg://postgres:Pa%40ss@host:5432/postgres?sslmode=require
```

**Check IPv4 reachability.** Supabase's direct connection host
(`db.<ref>.supabase.co`) resolves to **IPv6 only**. Docker networks and many CI
runners are IPv4-only, so the direct host will fail there even though it works
from a home machine. Use the session pooler host instead, which has IPv4:

```env
DATABASE_URL=postgresql+psycopg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

Use the **session** pooler (port 5432), not the transaction pooler (6543):
transaction pooling does not support the prepared statements SQLAlchemy relies on.

Always append `?sslmode=require`.

---

## 9. Pre-launch checklist

- [ ] `SECRET_KEY` generated fresh, not copied from anywhere
- [ ] Demo seed accounts deleted or their passwords changed
- [ ] `ENABLE_DOCS=false` so the schema is not public
- [ ] Real payment keys, and the webhook registered
- [ ] SMTP configured and a test receipt received
- [ ] Product images on your own CDN, hostname added to CSP
- [ ] `pg_dump` backup scheduled and a restore actually rehearsed
- [ ] `SENTRY_DSN` set
- [ ] DNS A/AAAA records pointing at the host
- [ ] `curl https://api.gyffty.com/api/v1/health/ready` returns `ready`
- [ ] Database password rotated if it was ever pasted into a chat or a ticket
