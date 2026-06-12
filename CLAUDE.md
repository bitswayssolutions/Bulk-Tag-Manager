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
npm run deploy       # Deploy to Shopify Partners
```

After changing `prisma/schema.prisma`, run `npm run setup` to apply migrations.

## Architecture

This is a **Shopify embedded app** using React Router v7, the `@shopify/shopify-app-react-router` adapter, and Prisma + SQLite for session storage.

**Request flow for protected routes:**
Every loader and action under `app/*` must call `await authenticate.admin(request)` from `app/shopify.server.ts`. This validates the session, performs OAuth if needed, and returns an `admin` object for making Shopify Admin GraphQL calls.

**Key files:**
- `app/shopify.server.ts` — Shopify app config; exports `authenticate`, `login`, `registerWebhooks`, etc.
- `app/db.server.ts` — Prisma client singleton (prevents multiple connections in dev HMR)
- `app/routes/app.tsx` — Parent layout for all `/app/*` routes; authenticates every request and provides `AppProvider` + App Bridge
- `app/routes/webhooks.*.tsx` — Webhook handlers; use `authenticate.webhook(request)` instead of `authenticate.admin`

**Routing:**
Uses `@react-router/fs-routes` flat-file conventions. Route files map to URL paths: `app._index.tsx` → `/app`, `app.additional.tsx` → `/app/additional`. Subdirectory routes use a `route.tsx` entry point (e.g. `routes/_index/route.tsx`).

**UI components:**
Uses Polaris web components via `<s-*>` custom elements (`<s-page>`, `<s-button>`, `<s-section>`, `<s-stack>`, etc.). These are Shopify's App Home Polaris components — not standard Polaris React. Do not use regular `<a>` tags; use `<s-link>` or React Router `Link`.

**Shopify Admin GraphQL:**
Call `admin.graphql(` `` `#graphql ...` `` `)` from the `admin` object returned by `authenticate.admin`. The API version is `October25` (configured in `shopify.server.ts` and `.graphqlrc.ts`). Run `npm run graphql-codegen` to regenerate types after changing queries.

**Webhooks:**
Declare app-specific webhooks in `shopify.app.toml` (not via `registerWebhooks` afterAuth hook) — Shopify syncs them automatically on deploy. Webhook routes must live outside the `app.tsx` auth wrapper.

**Embedded app navigation:**
- Use `redirect` returned from `authenticate.admin`, **not** `redirect` from `react-router`
- Use React Router `Link` or `<s-link>`, not bare `<a>` tags
- The app is embedded in an iFrame inside the Shopify Admin

**Database:**
SQLite in development (`prisma/dev.sqlite`). The `Session` model is the only model — it stores Shopify OAuth sessions via `@shopify/shopify-app-session-storage-prisma`. For production with multiple instances, swap to PostgreSQL or MySQL in `prisma/schema.prisma`.

---

## App: Bulk Tag Manager — Shopify App

### Goal
Bulk add/remove/replace tags across Products, Collections, and Orders. No application database — Shopify is the source of truth for all product/order/collection data.

### Session storage
Prisma is used ONLY for Shopify session storage (OAuth tokens). Datasource will be switched from SQLite to Supabase Postgres (free tier) for persistence on Vercel. No other data models exist or should be added.

### Hosting
Vercel (not Cloudflare). No wrangler config needed.

### MCP
Shopify Dev MCP is connected for live API/GraphQL lookups. Always use it before writing or modifying GraphQL queries.

### Resources & operations
- Resources: Products, Collections, Orders
- Tag operations: Add, Remove, Replace all
- Filters: by collection, vendor, product type, existing tag, title search

### Required API scopes
`read_products`, `write_products`, `read_orders`, `write_orders`, `read_collections`, `write_collections`

### Routes to build
- `app._index.tsx` → home screen, resource picker
- `app.products.tsx` → products tag manager
- `app.collections.tsx` → collections tag manager
- `app.orders.tsx` → orders tag manager

### Rules
- Read this file at the start of every session
- Use Shopify Dev MCP for ALL GraphQL queries/mutations
- Never add new Prisma models beyond `Session`
- Polaris components only — no custom CSS
- TypeScript strict — no `any`
- Commit after every completed feature using: `feat: description` / `fix: description` / `chore: description`
- Never hardcode secrets — use `.env` and Vercel env vars

### Session start ritual
1. Read this file
2. Run `git status` to see what's done
3. Summarise progress and next step before starting work