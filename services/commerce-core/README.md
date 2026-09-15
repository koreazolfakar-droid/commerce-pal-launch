# Space Call Commerce Core

This directory contains the isolated Rust data core for Space Call.

## Step 1

- Cloudflare Workers Rust runtime.
- `GET /health` endpoint.
- No storefront traffic routed through Rust.

## Step 2

Adds one isolated, read-only Shopify path:

- `GET /products/:handle`
- Uses a fixed Storefront GraphQL query; clients cannot submit arbitrary GraphQL.
- Validates product handles before any network request.
- Validates the configured Shopify domain and API version.
- Reads the Storefront token only from the `SHOPIFY_STOREFRONT_TOKEN` Worker secret.
- Normalizes Shopify/GraphQL failures into safe error responses without exposing the token or raw upstream errors.
- Returns `Cache-Control: no-store` for now. Caching and webhook invalidation are intentionally deferred to a later step.

This step does **not** connect React/TanStack to Rust yet and does not modify cart, checkout, Supabase, SEO, or the production storefront.

## Configuration

Public Worker variables are defined in `wrangler.toml`:

- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_API_VERSION`

The Storefront token must be added as a Cloudflare Worker secret and must never be committed:

```bash
npx wrangler secret put SHOPIFY_STOREFRONT_TOKEN
```

## Local verification

Requirements: recent Rust, `wasm32-unknown-unknown`, Node/npm and Wrangler.

```bash
rustup target add wasm32-unknown-unknown
cd services/commerce-core
cargo test --lib
cargo clippy --target wasm32-unknown-unknown -- -D warnings
cargo check --target wasm32-unknown-unknown
worker-build --release
npx wrangler dev
```

Health check:

```text
GET http://localhost:8787/health
```

Product read after configuring the secret:

```text
GET http://localhost:8787/products/<shopify-product-handle>
```
