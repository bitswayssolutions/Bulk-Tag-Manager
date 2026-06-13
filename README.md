# Bulk Tag Manager

A Shopify embedded app for bulk adding, removing, and replacing tags across Products, Collections, and Orders.

## Features

- **Products** — filter by collection, vendor, product type, tag, or title search; select multiple products and bulk add, remove, or replace tags
- **Collections** — browse collections and jump to the Products page pre-filtered by that collection
- **Orders** — filter by order search or financial status; select multiple orders and bulk add, remove, or replace tags
- Filters auto-apply as you type (400ms debounce) with an Apply button for manual submission
- Modals close automatically after a successful tag operation

## Tech stack

- [React Router v7](https://reactrouter.com) — full-stack framework
- [`@shopify/shopify-app-react-router`](https://shopify.dev/docs/api/shopify-app-react-router) — Shopify auth + session handling
- [Prisma](https://www.prisma.io) + [Supabase PostgreSQL](https://supabase.com) — session storage only
- [Polaris App Home web components](https://shopify.dev/docs/api/app-home/polaris-web-components) (`<s-*>` custom elements)
- Deployed on [Vercel](https://vercel.com)

## Local development

### Prerequisites

- Node.js ≥ 20.19 or ≥ 22.12
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started)
- A Shopify Partner account and dev store

### Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   ```
   SHOPIFY_API_KEY=
   SHOPIFY_API_SECRET=
   SCOPES=write_products,read_orders,write_orders
   SHOPIFY_APP_URL=https://your-tunnel-url
   DATABASE_URL=postgresql://...
   DIRECT_URL=postgresql://...
   ```

3. Run Prisma migrations:
   ```bash
   npm run setup
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```
   Shopify CLI opens a tunnel and provides an install link for your dev store.

## Deployment (Vercel)

The app deploys automatically to Vercel on every push to `main`.

### Environment variables

Set these in Vercel → Project → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `SHOPIFY_API_KEY` | Shopify Partners → App → API credentials |
| `SHOPIFY_API_SECRET` | Same as above |
| `SCOPES` | `write_products,read_orders,write_orders` |
| `SHOPIFY_APP_URL` | `https://bulk-tag-manager.vercel.app` |
| `DATABASE_URL` | Supabase connection pooling URL |
| `DIRECT_URL` | Supabase direct connection URL |

### Build command

In Vercel → Project → Settings → Build & Development Settings:
```
npm run setup && npm run build
```
This runs Prisma migrations on every deploy.

### Shopify Partners config

After updating `shopify.app.toml`, run locally to sync with Shopify:
```bash
npm run deploy
```

## Available commands

```bash
npm run dev          # Start local dev server via Shopify CLI
npm run build        # Production build
npm run start        # Serve production build
npm run setup        # Run Prisma migrations
npm run lint         # ESLint
npm run typecheck    # TypeScript type check
npm run deploy       # Sync config to Shopify Partners
```
