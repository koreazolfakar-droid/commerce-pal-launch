# Space Call Commerce Core

This directory is the first isolated Rust foundation for Space Call.

## Step 1 scope

- Cloudflare Workers Rust runtime only.
- One `GET /health` endpoint.
- No Shopify traffic is routed through Rust yet.
- No changes to React, TanStack SSR, cart, checkout, Supabase, SEO, or the production storefront.

Expected response:

```json
{
  "status": "ok",
  "service": "space-call-commerce-core",
  "version": "0.1.0"
}
```

## Local verification

Requirements: recent Rust, `wasm32-unknown-unknown`, Node/npm and Wrangler.

```bash
rustup target add wasm32-unknown-unknown
cd services/commerce-core
npx wrangler dev
```

Then request `http://localhost:8787/health`.

Do not connect this service to Shopify until this isolated foundation passes its build and health checks.
