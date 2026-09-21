# Gyffty — Gift Hamper Commerce Platform

A production-shaped storefront for a gift-hamper business: **Next.js 15 (App Router, TypeScript, Tailwind)** on the front, **FastAPI + SQLAlchemy 2** on the back, in a two-package monorepo.

The catalogue is organised around five pillars — **Customised, Relationship, Festival, Anniversary, Birthday** — each with curated collections beneath it.

---

## Quick start

Two terminals. The backend first, because the frontend renders against it.

### 1. Backend (port 8000)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows
# source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
cp .env.example .env

python -m app.db.init_db        # creates SQLite schema + seeds 27 categories, 28 hampers
uvicorn app.main:app --reload --port 8000
```

- API: <http://127.0.0.1:8000/api/v1>
- Interactive docs: <http://127.0.0.1:8000/docs>

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # point API_BASE_URL at your backend port
npm run dev
```

Storefront: <http://localhost:3000>

> If you run the API on a port other than 8000, update **both** `API_BASE_URL` (used by
> server components) and `NEXT_PUBLIC_API_BASE_URL` (used by the browser) in `.env.local`.

### Or, everything at once

```bash
docker compose up --build
```

Brings up Postgres, the API (seeded on first boot) and the storefront.

### Demo credentials

| Email | Password |
| --- | --- |
| `priya@example.com` | `Gyffty@2026` |
| `admin@gyffty.com` | `Gyffty@2026` (admin) |

Coupons wired into the seed data: `GYFFTY10` (10% over ₹1,999), `WELCOME300` (₹300 over ₹2,499), `LUXE15` (15% over ₹4,999).

---

## Repository layout

```
.
├── backend/              FastAPI service  →  see backend/README.md
├── frontend/             Next.js storefront →  see frontend/README.md
├── docker-compose.yml    Postgres + API + web
└── README.md
```

Both packages are independently buildable, testable and deployable. Nothing in
`frontend/` imports from `backend/` or the reverse; the HTTP contract is the only coupling.

---

## What is implemented

**Catalogue** — five-pillar category tree with nested collections, faceted product listing
(price bands, occasion, recipient, theme, rating, same-day, LUXE, personalisable, in-stock),
six sort orders, pagination, full-text-ish search, product detail with gallery,
"what is inside" inclusions, related products and reviews.

**Commerce** — guest and authenticated carts (a guest cart merges into the account on
login), per-line gift personalisation (recipient name, gift message, engraving),
coupon engine, shipping and GST calculation, guest checkout, order placement with stock
decrement, order tracking, cancellation with stock restoration.

**Accounts** — JWT access and refresh tokens, registration, login, profile, order history.

**Storefront UX** — animated hero carousel, mega-menu navigation, mobile accordion nav,
slide-over cart drawer with a free-shipping progress meter, URL-driven filters (every
filtered listing is shareable and indexable), JSON-LD product markup, skeletons, empty
states and error boundaries.

---

## Design language

Lifted in spirit from the two reference storefronts that were studied for this build
(FNP LUXE for the premium register, The Gift Studio for hamper merchandising patterns),
then pushed further toward an editorial feel.

| Token | Value | Used for |
| --- | --- | --- |
| `noir-900` | `#1A1816` | Brand charcoal, sampled from the seal — header, footer |
| `gold-500` | `#C9A24E` | Foil accent — LUXE badges, rules, CTAs on dark |
| `bone` | `#FAF8F4` | Page background, warmer than white so gold reads richer |
| `blush-500` | `#C4705F` | Discounts and destructive actions |
| `bg-foil` | 5-stop gradient | Metallic sheen on the wordmark and section rules |
| Display | Cormorant Garamond | Headlines, prices, section titles |
| Body | Jost | Everything else |

All of it is declared once in `frontend/tailwind.config.ts`. Change the palette there and
the whole storefront follows.

---

## Product imagery

Seed images point at `picsum.photos` with stable seeds, so the storefront renders
immediately with no asset pipeline. Swap `IMAGE_BASE` in
`backend/app/db/init_db.py` for your CDN and add the hostname to `images.remotePatterns`
in `frontend/next.config.mjs`.

---

## Tests

```bash
cd backend
.venv/Scripts/python -m pytest -q        # 79 tests
.venv/Scripts/python -m ruff check app tests
.venv/Scripts/python -m ruff format --check app tests

cd ../frontend
npm run lint && npm run typecheck && npm run build
```

79 backend tests cover pricing arithmetic, coupon rules, cart merging, the full
checkout and payment lifecycle, authorisation boundaries, token handling, rate
limiting and the production config guard.

---

## Production

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full runbook. In short:

```bash
cp .env.production.example .env      # fill in, then:
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Caddy terminates TLS and is the only public port; Postgres and Redis stay on
the internal network. Migrations run in the API entrypoint before any worker
accepts traffic.

### What is production-ready

Config refuses to boot on unsafe production settings · Alembic migrations ·
coupons in the database with validity windows and usage caps · pluggable
payment gateway with signed webhooks · transactional email · Redis-backed rate
limiting and token revocation · request IDs through structured logs · security
headers on both tiers · non-root multi-stage containers with healthchecks ·
GitHub Actions running lint, types, tests, migrations and image builds.

### What still needs your credentials

| Area | State | To finish |
| --- | --- | --- |
| Payments | `mock` provider, full flow works | Set `PAYMENT_PROVIDER=razorpay` + keys, register the webhook |
| Email | `console` backend, receipts logged | Set `EMAIL_BACKEND=smtp` + SMTP settings |
| Images | `picsum.photos` seeds | Point `IMAGE_BASE` at your CDN, add host to CSP |
| Monitoring | Sentry wired, unconfigured | Set `SENTRY_DSN` |

None is a rewrite: each sits behind a service interface with a working
stand-in, so the code path is already exercised by the tests.
