# Gyffty API

FastAPI + SQLAlchemy 2.0 commerce service for the Gyffty hamper storefront.

## Folder structure

```
backend/
├── app/
│   ├── main.py                 App factory: CORS, gzip, timing, exception handlers
│   ├── api/
│   │   ├── deps.py             Shared dependencies (DB session, current user, pagination)
│   │   └── v1/
│   │       ├── router.py       Mounts every endpoint module under /api/v1
│   │       └── endpoints/      catalog · auth · cart · orders · reviews · health
│   ├── core/                   config · security (JWT, hashing) · exceptions · logging
│   ├── db/
│   │   ├── base_class.py       Declarative base + PK/timestamp mixins
│   │   ├── base.py             Imports every model for Alembic metadata
│   │   ├── session.py          Engine + session factory
│   │   ├── init_db.py          Schema creation and demo seeding
│   │   └── seed/               The demo catalogue as plain data
│   ├── models/                 SQLAlchemy ORM models (one file per aggregate)
│   ├── schemas/                Pydantic request/response contracts
│   ├── repositories/           Query layer — owns SQL, owns nothing else
│   ├── services/               Business rules — the only layer that mutates state
│   └── utils/                  Pricing, slugs, order numbers
├── alembic/                    Migrations
└── tests/                      Pytest suite against an in-memory database
```

### Why the layers

The request path is always the same, and each layer has exactly one reason to change:

```
endpoint  →  service  →  repository  →  model
 (HTTP)      (rules)      (queries)     (schema)
```

An endpoint never writes SQL. A repository never decides whether an action is allowed.
Money is computed in exactly one place — `app/utils/pricing.py` — so the cart drawer, the
checkout summary and the persisted order can never disagree.

## Commands

```bash
python -m app.db.init_db              # create schema + seed (idempotent)
python -m app.db.init_db --reset      # drop everything and rebuild
uvicorn app.main:app --reload         # dev server
pytest -q                             # test suite
ruff check app tests                  # lint
mypy app                              # type check

alembic revision --autogenerate -m "message"
alembic upgrade head
```

## Endpoints

All under `/api/v1`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health`, `/health/ready`, `/config` | — | Liveness, readiness, public commerce constants |
| GET | `/categories` | — | Full pillar tree with collections and product counts |
| GET | `/categories/{slug}` | — | One category |
| GET | `/products` | — | Faceted, sorted, paginated listing |
| GET | `/products/facets` | — | Filter-rail counts, optionally scoped to a category |
| GET | `/products/rails` | — | All four homepage carousels in one call |
| GET | `/products/{slug}` | — | Product detail with images and inclusions |
| GET | `/products/{slug}/related` | — | Same-category recommendations |
| GET | `/products/{slug}/reviews` | — | Paginated reviews |
| GET | `/products/{slug}/reviews/summary` | — | Average and star distribution |
| POST | `/products/{slug}/reviews` | Bearer | Leave a review (one per user per product) |
| POST | `/auth/register`, `/auth/login`, `/auth/refresh` | — | Issue token pairs |
| GET/PATCH | `/auth/me` | Bearer | Profile |
| GET/DELETE | `/cart` | Optional | Read or empty the cart |
| POST | `/cart/items` | Optional | Add a line, with personalisation |
| PATCH/DELETE | `/cart/items/{id}` | Optional | Update or remove a line |
| POST | `/orders/checkout` | Optional | Place an order (guest checkout supported) |
| GET | `/orders` | Bearer | Order history |
| GET | `/orders/{order_number}` | Optional | Track an order |
| POST | `/orders/{order_number}/cancel` | Bearer | Cancel while still in the warehouse |
| GET | `/orders/coupons` | — | Active coupon list |

### Guest carts

A guest's first cart write returns an `X-Cart-Token` header. The client stores it and
sends it back on every later cart request. On login, passing that same header merges the
guest cart into the account's cart — so nobody loses their bag by signing in.

### Error shape

Every handled error returns the same envelope, which the frontend unwraps in `lib/api.ts`:

```json
{ "error": { "code": "not_found", "message": "No product with slug foo.", "details": {} } }
```

## Configuration

Copy `.env.example` to `.env`. Notable keys:

| Key | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./gyffty.db` | Swap for `postgresql+psycopg://…` in any real environment |
| `SECRET_KEY` | dev placeholder | **Must** be replaced in production |
| `FREE_SHIPPING_THRESHOLD` | `1999` | Drives the cart progress meter |
| `DEFAULT_SHIPPING_FEE` | `99` | Charged below the threshold |
| `TAX_RATE` | `0.18` | GST, applied to the post-discount subtotal |
| `BACKEND_CORS_ORIGINS` | `["http://localhost:3000"]` | JSON array or comma-separated |
