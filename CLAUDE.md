# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Local development via Shopify CLI tunnel (shopify app dev)
npm run build        # React Router production build
npm run start        # Serve the production build
npm run setup        # prisma generate + prisma migrate deploy (run after schema changes)
npm run lint         # ESLint
npm run typecheck    # React Router typegen + tsc --noEmit
npm run graphql-codegen  # Generate TypeScript types from GraphQL queries into app/types/
npm run deploy       # Sync shopify.app.toml config to Shopify Partners
```

After changing `prisma/schema.prisma`, run `npm run setup` to apply migrations.
After changing `shopify.app.toml`, run `npm run deploy` to sync with Shopify Partners.

## Architecture

This is a **Shopify embedded app** using React Router v7, the `@shopify/shopify-app-react-router` adapter, and Prisma + Supabase PostgreSQL for session storage.

**Request flow for protected routes:**
Every loader and action under `app/*` must call `await authenticate.admin(request)` from `app/shopify.server.ts`. This validates the session, performs OAuth if needed, and returns an `admin` object for making Shopify Admin GraphQL calls.

**Key files:**
- `app/shopify.server.ts` — Shopify app config; exports `authenticate`, `login`, `registerWebhooks`, etc.
- `app/db.server.ts` — Prisma client singleton (prevents multiple connections in dev HMR)
- `app/routes/app.tsx` — Parent layout for all `/app/*` routes; authenticates every request and provides `AppProvider` + App Bridge. **Must** export `ErrorBoundary` using `boundary.error()` and `headers` using `boundary.headers()` from `@shopify/shopify-app-react-router/server` — Shopify requires these to propagate auth headers through thrown responses.
- `app/routes/webhooks.*.tsx` — Webhook handlers; use `authenticate.webhook(request)` instead of `authenticate.admin`

**Routing:**
Uses `@react-router/fs-routes` flat-file conventions. Route files map to URL paths: `app._index.tsx` → `/app`, `app.products.tsx` → `/app/products`. The root `_index/route.tsx` always redirects to `/app`.

**UI components:**
Uses Polaris web components via `<s-*>` custom elements (`<s-page>`, `<s-button>`, `<s-section>`, `<s-stack>`, etc.). These are Shopify's App Home Polaris components — not standard Polaris React. Do not use regular `<a>` tags; use `<s-link>` or React Router `Link`.

**Shopify Admin GraphQL:**
Call `admin.graphql(` `` `#graphql ...` `` `)` from the `admin` object returned by `authenticate.admin`. The API version is `October25` (configured in `shopify.server.ts` and `.graphqlrc.ts`). Run `npm run graphql-codegen` to regenerate types after changing queries.

**Webhooks:**
Declare app-specific webhooks in `shopify.app.toml` — Shopify syncs them automatically on deploy. Webhook routes must live outside the `app.tsx` auth wrapper. GDPR compliance webhooks (`customers/data_request`, `customers/redact`, `shop/redact`) are declared under `compliance_topics` in the toml and are **mandatory** for App Store listing.

**`shopify.server.ts` future flags:**
`expiringOfflineAccessTokens: true` is enabled — Shopify will rotate offline tokens; the adapter handles renewal automatically.

**Embedded app navigation:**
- Use `redirect` returned from `authenticate.admin`, **not** `redirect` from `react-router`
- Use React Router `Link` or `<s-link>`, not bare `<a>` tags
- The app is embedded in an iFrame inside the Shopify Admin

**Database:**
Prisma + Supabase PostgreSQL. The `Session` model is the only model — it stores Shopify OAuth sessions via `@shopify/shopify-app-session-storage-prisma`. Never add new Prisma models beyond `Session`.

---

## App: Bulk Tag Manager — Shopify App

### Goal
Bulk add/remove/replace tags across Products, Collections, and Orders. No application database — Shopify is the source of truth for all data.

### Hosting
Vercel — connected to GitHub for auto-deploy on push to `main`.
Build command on Vercel: `npm run setup && npm run build`
Node version: `>=20.19 <22 || >=22.12`

### Required environment variables
| Key | Description |
|-----|-------------|
| `SHOPIFY_API_KEY` | From Shopify Partners Dashboard |
| `SHOPIFY_API_SECRET` | From Shopify Partners Dashboard |
| `SCOPES` | `write_products,read_orders,write_orders` |
| `SHOPIFY_APP_URL` | `https://apps.bitsways.com` |
| `DATABASE_URL` | Supabase connection pooling URL |
| `DIRECT_URL` | Supabase direct connection URL |

### MCP
Shopify Dev MCP is connected for live API/GraphQL lookups. Always use it before writing or modifying GraphQL queries.

### Resources & operations
- Resources: Products, Collections, Orders
- Tag operations: Add, Remove, Replace all
- Filters: by collection, vendor, product type, existing tag, title search (auto-apply debounce + Apply button)

### Routes
| Route | URL | Description |
|-------|-----|-------------|
| `app._index.tsx` | `/app` | Home screen with 3 resource cards |
| `app.products.tsx` | `/app/products` | Products tag manager — filters, checkboxes, bulk add/remove/replace |
| `app.collections.tsx` | `/app/collections` | Browse collections, links to products filtered by collection |
| `app.orders.tsx` | `/app/orders` | Orders tag manager — filters, checkboxes, bulk add/remove/replace |
| `auth.$.tsx` | `/auth/*` | Shopify OAuth handler (managed by the adapter) |
| `privacy.tsx` | `/privacy` | Public privacy policy page (required for App Store) |
| `support.tsx` | `/support` | Public support page (required for App Store) |
| `webhooks.app.uninstalled.tsx` | `/webhooks/app/uninstalled` | Deletes session on uninstall |
| `webhooks.app.scopes_update.tsx` | `/webhooks/app/scopes_update` | Handles scope changes |
| `webhooks.customers.data_request.tsx` | `/webhooks/customers/data_request` | GDPR: customer data request |
| `webhooks.customers.redact.tsx` | `/webhooks/customers/redact` | GDPR: customer data redact |
| `webhooks.shop.redact.tsx` | `/webhooks/shop/redact` | GDPR: shop data redact |

`privacy.tsx` and `support.tsx` are standalone plain-HTML pages — they are the only files exempt from the `<s-*>` Polaris component rule.

### Key implementation details

**Filter state** lives in URL params — `navigate()` with updated `URLSearchParams`. Always build the new URL from loader `filters` + updates, not from `window.location.href`, to avoid stale URL during navigation.

**Text filters auto-apply** via 400ms debounce: `useRef` timer + `applyFilterRef` ref pattern (keeps the timer callback fresh without re-running the effect). Apply button also triggers immediately.

**`<s-select>` onChange** — always validate the event value against the known options list before applying (Polaris may return a garbage truthy string for the empty option).

**Modal auto-close** after mutations: `activeModalId` ref tracks which modal is open; on success, close defensively — try `.hide()`, then `.close()`, then click the `[command="--hide"]` button inside the modal.

**GraphQL mutations** are batched in chunks of 10 using `Promise.all` per chunk.

**Collections** don't have `tags` in the Shopify Admin API — the Collections page browses collections and navigates to Products pre-filtered by collection GID (`/app/products?collection=gid://shopify/Collection/...`).

**Collection GID validation** — validate `rawCollection?.startsWith("gid://shopify/Collection/")` in the loader before using it in a GraphQL variable.

### Rules
- Use Shopify Dev MCP for ALL GraphQL queries/mutations
- Never add new Prisma models beyond `Session`
- Polaris `<s-*>` components only — no custom CSS
- TypeScript strict — no `any`
- Commit after every completed feature: `feat:` / `fix:` / `chore:`
- Never hardcode secrets — use `.env` and Vercel env vars

### Session start ritual
1. Read this file
2. Run `git status` to see what's done
3. Summarise progress and next step before starting work
