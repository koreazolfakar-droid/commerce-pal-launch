# Analytics upgrades implementation plan

**Goal:** Implement the supplied five-part Analytics specification in the existing dashboard.

**Architecture:** Give Analytics its own lazy route and focused components. Keep the overview and its RPC unchanged. Add read-only SECURITY INVOKER aggregates with existing staff checks and RLS. Route stock changes to the existing audited, concurrency-protected inventory manager.

**Detailed design and rollout:** `docs/dashboard-analytics.md`

**Stack:** Existing React, TypeScript, Recharts, Supabase, CSS tokens, English/Arabic localization.

## Decisions and constraints

- Gross sales = completed eligible merchandise subtotals; net = subtotal minus discounts, excluding shipping. Paid and partially refunded ledger rows remain eligible; fully refunded rows remain excluded. No refund amount exists, so state this limitation in the page.
- Currency selection prevents summing unlike currencies. Orders use their creation date; completed sales use completion date. AOV uses completed eligible sale count, not all created orders.
- UTC date boundaries; exclusive range end and equal-duration non-overlapping previous period, including the same elapsed portion of today. Maximum range 366 days. 12M uses calendar months.
- Current customers, products, inventory and visible brands have no invented historical comparisons.
- Low stock = 1–10 inclusive, critical subset = 1–3, out = <=0. Alert statuses are exclusive, with out-of-stock before critical before low. These defaults extend existing stock semantics without introducing stored thresholds.
- Server-side alert search, filtering, stable sorting and pagination; bounded product ranking lists include zero-sale active products. No bulk browser downloads.
- Existing sidebar drawer, MFA, roles, permissions, inventory writes, overview, routes, CSV and RTL remain intact.

## Tasks

- [x] Add behavioral tests for UTC/custom/leap date ranges, zero baselines, database aggregate semantics, duplicate titles, inactive/untracked inventory, currencies, discounts/refunds, authorization and pagination.
- [x] Add read-only analytics and alert RPCs, validate arguments, revoke public/anon execution; test on isolated PGlite schema.
- [x] Add typed data client and pure analytics helpers; reject invalid responses and avoid stale requests.
- [x] Add ten smart KPIs, shared range/comparison/currency controls, revenue/order charts with hover/touch and keyboard selection, current/previous dates and empty/loading/error states.
- [x] Add inventory center and four product performance sections; use existing product editor and inventory routes for actions.
- [x] Add scoped mobile-first blue/white and dark styles, translations; preserve mobile drawer.
- [x] Run typecheck, lint, unit, build, SSR and desktop/mobile/RTL browser regression checks; publish reviewable feature branch/PR only after validation. Do not merge or deploy production as part of implementation.

## Review focus

- Fast range/filter switching never labels old data as current; failures expose retry and suppress stale exports.
- Empty ranges still show real current catalog counts; zero baselines never show infinite percentages.
- SQL joins never multiply sale totals or count an order more than once per product.
- Search/sort applies to the full alert dataset before pagination.
- Small screens, Arabic direction and dark theme retain readable charts, tooltips and 44px touch controls without document overflow.
