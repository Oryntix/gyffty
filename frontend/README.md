# Gyffty Storefront

Next.js 15 (App Router) + TypeScript + Tailwind CSS.

## Folder structure

```
frontend/
├── src/
│   ├── app/                      Routes (App Router)
│   │   ├── layout.tsx            Shell: fonts, header, footer, cart drawer
│   │   ├── page.tsx              Homepage
│   │   ├── globals.css           Tailwind layers + design-system component classes
│   │   ├── c/[slug]/             Category + listing page (also /c/all)
│   │   ├── p/[slug]/             Product detail page
│   │   ├── search/               Search results
│   │   ├── cart/                 Full-page cart
│   │   ├── checkout/             Checkout
│   │   ├── order/[orderNumber]/  Confirmation + tracking
│   │   ├── track/                Order lookup
│   │   ├── login/                Sign in / register
│   │   ├── account/              Profile + order history
│   │   ├── loading.tsx · error.tsx · not-found.tsx
│   ├── components/
│   │   ├── ui/                   Button, Badge, Rating, Price, Skeleton, EmptyState
│   │   ├── layout/               Header, MegaMenu, MobileNav, Footer
│   │   ├── home/                 Hero, PillarTiles, editorial sections
│   │   ├── product/              ProductCard, ProductRail, Gallery, AddToBag
│   │   ├── category/             FilterRail, ListingToolbar, Pagination
│   │   └── cart/                 CartDrawer
│   ├── lib/                      api.ts (fetch wrapper) · catalog.ts (typed calls) · utils.ts
│   ├── store/                    Zustand: cart-store, auth-store
│   ├── types/                    TypeScript mirrors of the API schemas
│   └── config/site.ts            Brand, navigation, promises, sort options
├── tailwind.config.ts            The design system
└── next.config.mjs
```

### Conventions

**Server components fetch, client components interact.** Listing, detail and homepage data
is fetched server-side through `lib/catalog.ts` and cached (`revalidate: 120`). Anything
with state — cart, filters, gallery, auth — is a client component.

**Filters live in the URL.** `FilterRail` and `ListingToolbar` only ever rewrite the query
string; the server page reads it back. That makes every filtered listing shareable,
bookmarkable, indexable and back-button-correct, with no client-side filter state to drift.

**One fetch wrapper.** `lib/api.ts` picks the right base URL per runtime (`API_BASE_URL`
server-side, `NEXT_PUBLIC_API_BASE_URL` in the browser) and unwraps the API's error
envelope into a typed `ApiError`. `apiFetchSafe` returns a fallback instead of throwing,
so one dead rail cannot blank a page.

**Cart calls bypass the wrapper on purpose.** Guest carts need the `X-Cart-Token`
*response header*, which `apiFetch` discards — see the comment in `store/cart-store.ts`.

## Commands

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve the build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

## Environment

```bash
cp .env.local.example .env.local
```

| Key | Used by | Notes |
| --- | --- | --- |
| `API_BASE_URL` | Server components | Container-internal URL in Docker |
| `NEXT_PUBLIC_API_BASE_URL` | Browser | Must be reachable from the user's machine |
| `NEXT_PUBLIC_SITE_URL` | Metadata | Canonical URLs and Open Graph |

Both API variables must be updated together when the backend port changes.

## Theming

Everything visual is a token in `tailwind.config.ts`: `forest` (brand green), `gold`
(premium accent), `blush` (sale/destructive), `bone` (page background), plus the display
and body font families and the `silk` easing curve used across all transitions. Reusable
patterns (`.eyebrow`, `.gold-rule`, `.card-hover`, `.skeleton`) live in `globals.css`.

Navigation and brand copy are data, not markup — edit `src/config/site.ts` to change the
pillars, mega-menu contents, footer columns, delivery slots or sort options.

## Brand assets

The logo lives in exactly one place. To swap in your own artwork:

1. Save the seal to `public/brand/gyffty-logo.png` (square, 1:1, ideally 512px or larger).
2. In `src/components/layout/logo.tsx`, change `LOGO_SRC` from `.svg` to `.png`.

Nothing else needs touching — the header, mobile nav and footer all import from
that file. The checked-in `.svg` is a placeholder drawn to the same proportions,
so layout does not shift when you replace it.

The artwork is assumed to have the charcoal background baked in, which is why the
header and quick-link strip are charcoal: the plate edge disappears into them. If
you supply a transparent cut-out instead, set `LOGO_HAS_BACKGROUND = false` in the
same file and the marks render on their own rounded charcoal plate.
