# Product editor repair implementation plan

**Goal:** implement the supplied complete editor brief against main `78520d32318f673eba007e45c82ee1329473550a`, preserving PR #473 and all existing persistence contracts.

**Architecture:** extend the existing product, media, variant and AI editors. Reuse atomic Supabase RPCs, inventory ledgers, catalog cache invalidation and existing design tokens. Add compatible functionality through existing representations; do not invent shipping, tax or accounting contracts.

**Spec:** the user's SPACE CALL — COMPLETE ADD PRODUCT PAGE REPAIR brief in this conversation.

## Tasks

- [x] Read source, migrations, routes, recent PR #473 and existing tests; materialize the exact main snapshot on an isolated branch.
- [x] Reproduce and test editable-field validation, section navigation, required specifications and dialog accessibility.
- [x] Repair the product form and variant dialog; preserve AI desktop-grid isolation and add explicit request cancellation/retry feedback.
- [x] Add editable generic variant options using existing `options` JSON and a live SEO preview using existing metadata and canonical URL.
- [x] Compare all requested capabilities against official Shopify documentation and map editor fields to backend/storefront representations.
- [x] Execute unit, database, type, lint, browser and production build checks, with desktop/mobile/RTL screenshots.
- [ ] Review the complete diff, create a PR, and merge only if required verification passes; verify production deployment separately.

## Review focus

1. Locked multi-variant price/stock must not block metadata saves or overwrite stock.
2. Required fields inside collapsed sections must become visible and focusable.
3. Dialog focus, escape, scroll and actions must work at short/narrow viewports and inside the dashboard's desktop grid.
4. Custom option edits must preserve existing typed values, reject duplicates and reach the existing variant RPC/storefront option mapping.
5. AI cancellation, stale responses and changed field protection must keep changes local until manual saving.

## Execution record

- Direct Git clone could not authenticate; source was fetched through the connected GitHub integration without changing credentials.
- Initial source-only baseline: 460 passing / 28 failing (missing dependencies and initially omitted binary assets). This is an environment baseline, not an acceptance result.
- Dependency installation and binary restoration are in progress. Existing cached packages are reused only in this workspace.
- Ruling: execute the user's detailed implementation brief directly, without another design approval round; explicit instruction requests implementation through delivery.

Final local verification: 678 unit tests; 31 product editor browser checks; AI responsive/workflow and dashboard professional browser suites; TypeScript, ESLint, production build, SSR and security scan passed. Independent review findings were fixed and regression tested. Production migration applied with version 20261102002908; local filename synchronized to that recorded version. PR #475 is the delivery branch. CI/merge/deployment gate remains pending. The report documents broader feature-parity gaps.
