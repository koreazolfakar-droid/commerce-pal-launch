# Dashboard reliability completion — 2026-10-22

This follow-up closes the 13 failing source assertions and three skipped PostgreSQL tests recorded in the [previous workflow review](dashboard-professional-workflows.md). It also fixes real procurement authorization and draft-media failures discovered by running the dashboard against local Supabase Auth, PostgREST and PostgreSQL.

## Runtime fixes

- Pending and approved purchase orders could not pass the optimistic-concurrency lock: invoker `FOR UPDATE` inherited the table policy permitting direct writes only to drafts. Only the two private, void-returning freshness helpers now use owner privileges, after the existing authenticated staff/MFA check. They still require an expected timestamp, lock the row and reject stale versions. Public lifecycle RPCs remain invoker; admin-only approval and draft-only direct writes remain enforced.
- Verified staff can read draft catalog records, including images, independently of public published/active filters. This also permits `INSERT ... RETURNING` during draft-image saves. Customer and anonymous draft access remain blocked.
- `/categories` no longer serializes a catalog object containing React/Lucide components into loader data, which caused a production SSR 500. It still warms and uses the existing query cache.
- The homepage always has a semantic H1, including configurations with the hero hidden. Payment status has an explicit accessible label. The mobile brand stays centered with balanced action columns and a compact narrow-screen layout. Product cards expose a stable semantic test marker across visual variants.

## Verification coverage

All 591 unit/security/architecture tests pass with no skipped tests. The 13 reconciled assertions now check the current implementation: transactional product saving, server-side order counts/public numbers, CMS hero data, deferred home footer, sanitized client links, SEO-aware category reads, cart loading/stock limits, unchanged original image data and bounded collection queries. No test files or checks were removed. Pinned PGlite enables the three existing SQL regression tests that previously skipped when the optional database package was unavailable.

The separate commerce acceptance suite executes ten scenarios against a local database, with real password/TOTP authentication and actual frontend/API/database writes:

1. Staff authorization requires MFA; assigning a role alone is insufficient.
2. Atomic product saving preserves handles and variant-derived stock summaries.
3. Draft products and images work for verified staff and stay hidden from customers/anonymous readers.
4. The production `create-order` handler authenticates customers, links orders and enforces idempotency/conflicting retries.
5. Customer and anonymous sessions cannot read staff order tables or invoke staff actions.
6. The browser completes confirmation, processing, readiness, delivery and payment; unpaid completion is blocked, completion creates one sale, and CRM totals reconcile.
7. Financial refunds update sales and CRM totals without automatically restocking physical goods.
8. Concurrent confirmation reserves stock once; cancellation releases only reserved stock and remains idempotent.
9. Stale purchase-order versions and editor approval are rejected; direct table writes cannot bypass draft-only policy.
10. The browser submits, approves and issues a purchase order, then approves receiving. Only usable quantities increase stock; damaged units and repeated approval cannot inflate stock.

Order creation itself does not reserve stock; confirmation does. Physical returned-goods processing is a separate workflow. The suite runs the real Edge handler under Deno, rather than testing the deployed Edge gateway. Passkeys, provider-backed AI output, email delivery, object uploads and every settings permutation are outside this acceptance suite. No production business records are created or edited by these tests.

Existing Dashboard browser suites continue to cover navigation, Arabic/mobile layout, keyboard and nested dialogs, protected drafts, search races, retry behavior, saved views and AI form review. Their intercepted UI fixtures remain separate from the real commerce suite. Storefront responsive/SSR checks now run the production artifact with deterministic, read-only catalog/CMS fixtures instead of relying on external network availability or a development optimizer cache. The fixture intentionally rejects the Rust catalog endpoint to exercise the Supabase fallback. SSR checks retain security headers, nonce uniqueness, semantic headings and sitemap assertions, including `/categories`.

## Reproduction and CI

```sh
bun install --frozen-lockfile
bun run test:unit
bun run typecheck
bun run lint
bun run build
SPACE_CALL_VISUAL_FIXTURES=1 node --import ./e2e/helpers/storefront-fixture-fetch.mjs e2e/ssr-smoke.mjs
# Requires Docker, Node, npx and Chromium:
./node_modules/.bin/playwright install --with-deps chromium
bun run test:commerce:setup
bun run test:commerce
bun run test:commerce:stop
```

The new `Dashboard Commerce Acceptance` action creates and removes an isolated stack. `Storefront CI` keeps the full test/security gates; `Dashboard Workflows` keeps its interaction and AI suites. Browser checks use the built worker/static assets through `e2e/helpers/production-preview.mjs`.

The stack helper uses a temporary directory, never the repository Supabase configuration. Historical migrations need empty CMS table prerequisites, canonical taxonomy seed rows and an early copy of the real idempotent product-specification function; these are documented test fixtures, not mocked business functions. Two historical files share a timestamp, so local copies receive unique sequential versions while retaining original ordering and SQL. Each copy runs in a transaction, as required by historical ledger locks. This test bootstrap is not a production migration-repair script.

Test credentials stay in a restricted temporary status file. The harness refuses non-loopback database writes; its frontend uses a local same-origin proxy without weakening production CSP. The optional `SPACE_CALL_IGNORE_CONTAINER_HEALTHCHECK=1` supports managed environments whose container probes inherit a proxy; an actual Auth HTTP health check still must succeed. CI uses standard container health checks.
