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
- Returns `Cache-Control: no-store` for now.

## Step 3 — Product detail contract parity

Step 3 keeps the same isolated read-only endpoint but expands its typed Rust contract to match the product-detail data already requested by the TypeScript storefront:

- Description and HTML description.
- Vendor, product type, availability, created/updated timestamps and tags.
- Current and compare-at price ranges.
- Up to 20 product images.
- Up to 20 collections.
- Up to 100 variants with current/compare-at price, variant image, selected options, SKU, barcode, weight and weight unit.
- Product options used by the existing variant picker.
- Responses are tagged with `product-detail-v1` through both `contractVersion` and `X-Space-Call-Contract`.

The Shopify GraphQL document remains fixed and read-only. Contract tests verify the bounded limits, required fields, camelCase serialization, optional variant fields, malformed payload handling and that no mutation/cart/customer operations are present.

Step 3 still does **not**:

- Route React/TanStack production traffic through Rust.
- Modify cart, checkout, Shopify data, Supabase, SEO or storefront UI.
- Add Rust caching or webhook invalidation.
- Add any Shopify mutation or Admin API call.
- Deploy or switch the production storefront to the Rust endpoint.

The next routing/canary step must be reviewed separately after this parity contract is accepted.

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
cargo fmt --check
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

Product-detail read after configuring the secret:

```text
GET http://localhost:8787/products/<shopify-product-handle>
```
