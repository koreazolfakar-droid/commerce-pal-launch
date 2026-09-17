# Space Call Dashboard Integration Plan (No Shopify)

This document applies only to the isolated `staging/no-shopify-dashboard` branch and the separate Dashboard repository `koreazolfakar-droid/fast-site-lift`.

## Non-negotiable guardrails

- Do not merge this staging branch into `main` during integration development.
- Do not call Shopify or require Shopify credentials in the staging runtime.
- Preserve the current Space Call storefront UI and customer flows while replacing only the data source.
- Keep Dashboard and storefront deployable independently.
- Introduce one shared data contract instead of allowing either app to depend on the other's internal React components or state.
- All write operations must be validated server-side and become auditable before production use.
- Every phase must pass TypeScript, ESLint, tests, production build, and SSR smoke checks before the next phase starts.

## Target architecture

```text
fast-site-lift (Admin Dashboard)
        |
        | HTTPS / typed JSON API
        v
Space Call test backend / repository layer
        |
        +-- products
        +-- variants
        +-- brands
        +-- categories
        +-- collections
        +-- inventory movements
        +-- media
        +-- homepage sections
        |
        v
commerce-pal-launch (staging storefront)
```

The storefront must consume read-only catalog/content contracts. The Dashboard uses authenticated admin write contracts. Neither app should know how the other renders its UI.

## Phase 0 — Stabilize no-Shopify storefront

Goal: prove the copied storefront behaves normally with a local adapter and zero Shopify network access.

Exit criteria:
- TypeScript passes.
- ESLint passes.
- unit/architecture tests pass.
- production build passes.
- SSR smoke test passes.
- no Shopify token/domain is required by `.env.example`.
- catalog, collection, product details, search, brand pages and homepage can render from local data.

## Phase 1 — Define shared catalog contract

Create provider-neutral domain models. Do not expose `ShopifyProduct` naming to new Dashboard APIs.

Initial models:
- `Product`
- `ProductVariant`
- `Money`
- `Brand`
- `Category`
- `Collection`
- `InventorySnapshot`
- `MediaAsset`

Minimum product fields:
- id
- handle
- title
- description
- brandId / brand
- categoryId
- status
- images
- variants
- price / compareAtPrice
- SKU / barcode
- stock
- tags
- collectionIds
- SEO title / description
- createdAt / updatedAt

Phase 1 is read-only: the storefront reads products through this contract before Dashboard writes are connected.

## Phase 2 — Products first

Connect only Products between Dashboard and the staging storefront.

Flow:
1. Dashboard lists products from the shared repository/API.
2. Dashboard creates/edits one test product.
3. Storefront reads the same product source.
4. Product appears in search, catalog and product details without hardcoded duplication.

No brands/collections/homepage write integration until this flow is stable.

## Phase 3 — Brands, categories and collections

Add normalized entities instead of free-text fields.

Brand:
- id, name, slug, logo, description, active, sortOrder, SEO

Category:
- id, name, slug, icon, image, description, active, sortOrder

Collection:
- id, name, handle, image, description, active, productIds, sortOrder, SEO

Dashboard product forms should select these entities by ID rather than storing arbitrary names.

## Phase 4 — Inventory and media

Inventory must use movements rather than silently overwriting a single number.

Movement types:
- purchase
- sale
- return
- damage
- manual_adjustment
- reservation
- release

Media uses a central library with stable asset IDs and URLs. Product and homepage records reference media IDs.

## Phase 5 — Homepage CMS

Connect the existing Dashboard Homepage Builder to staging through a typed section contract.

Supported section families should include:
- hero
- product carousel
- collection
- brands
- categories
- promo banner
- image + text
- trust strip
- FAQ
- rich text

The storefront decides how each supported section is rendered; the Dashboard controls content, order, visibility and scheduling.

## Phase 6 — Admin security and audit

Before any production consideration:
- real authentication
- roles and permissions
- server-side validation
- audit log
- optimistic concurrency/version checks
- rate limiting for writes
- media upload restrictions
- backups / rollback strategy

## Current rule

Until Phase 0 is green, do not start database writes or merge Dashboard code into the storefront. The immediate priority is a stable provider-neutral staging surface.