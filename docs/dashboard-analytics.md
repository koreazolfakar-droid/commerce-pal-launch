# Analytics

The `/dashboard/analytics` route has its own lazy page. The overview at `/dashboard`
and `get_dashboard_home_snapshot` remain unchanged. The existing responsive sidebar,
MFA gate, role lookup, route registry and permissions continue to apply.

## Data and metric definitions

- `get_dashboard_analytics_snapshot` returns a bounded server aggregate for both
  periods, ten KPIs, zero-filled daily trends, four product rankings (eight each),
  recent orders and top brands. It does not download order or inventory tables.
- Sales use the existing eligibility rule: completed `store_sales` rows with
  `paid` or `partially_refunded` payment status, dated by `completed_at`.
  Fully refunded rows are excluded. The ledger has no refund-amount field;
  partial refunds retain their recorded values, as explained in the UI.
- Gross merchandise sales sum eligible `subtotal`; net merchandise sales sum
  `greatest(subtotal-discount_total,0)`, excluding shipping. AOV is net divided
  by eligible completed sale count. The overview retains its original recorded
  sale-total metric; Analytics explicitly describes its merchandise metrics.
- Orders count all orders created in the selected period. They are not used as
  the denominator for completed-sale AOV. Monetary reports filter one currency
  at a time, with no currency conversion or summing unlike currencies.
- Customers, products, visible brands and inventory are current totals; no
  historical change is fabricated for them. Active tracked variants contribute
  to stock exactly as in the existing overview.
- Product rankings aggregate by product ID; units and revenue derive from
  eligible order lines and orders count distinct order IDs. Product revenue is
  before order-level discounts and shipping. Lowest-performing includes active
  zero-sale products. Deleted products are excluded; their recorded sales still
  contribute to store totals. Untracked stock is shown as untracked, not zero.
- Recent orders retain the original global latest-order context, including each
  order's own currency. Top brands follow the selected sale period and currency.

## Periods and comparisons

7D, 30D and 90D include today in UTC. 12M uses the day after the same date last
year through now, handling leap years. Custom dates are inclusive in the UI;
the API uses an exclusive end timestamp. Today's end is the current time.
Ranges are validated and bounded to 366 days.

Comparisons use the immediately preceding non-overlapping interval of equal
elapsed duration. Daily comparison buckets align by elapsed day offset; the
final bucket can be partial. Tooltips show both current and previous dates.
Zero previous values never create an infinite percentage; new activity with
no baseline is labeled accordingly. A date selector also exposes exact chart
values to keyboard and touch users.

## Inventory and permissions

`get_dashboard_inventory_alerts` searches product names, SKUs and variants and
filters/sorts the complete result set before pagination (eight per page). The
existing low-stock threshold of 10 is displayed; critical is the 1–3 subset.
Exclusive row statuses are out (<=0), critical (1–3), and low (4–10). Default
ordering places out-of-stock and critical variants first, with stable ID ties.

Both new functions are SECURITY INVOKER with the existing authenticated staff
check. Public and anonymous execution are revoked; RLS is preserved. No table
permissions or policies change. The Analytics page issues no stock writes.
Adjust actions navigate to the existing inventory manager, preserving its
atomic, audited, concurrency-protected mutations; editing uses the existing
product editor. Read requests are cancellable and superseded results are not
shown under new filters. Inventory errors and sales errors are independent.

## Rollout and verification

Apply `supabase/migrations/20261116223007_dashboard_analytics_upgrades.sql` before
releasing the new frontend. It only adds read-only RPCs and does not alter
business data or the overview API. PR #513 was merged and deployed on 2026-11-16;
the read-only migration was subsequently applied and validated against production.
Future releases must check database readiness before publishing the frontend.

Run the repository gates: `bun run typecheck`, `bun run lint`,
`bun run test:unit`, `bun run build`, and the fixture-backed `bun run test:ssr`.
The new behavioral SQL tests use isolated PGlite databases and include caller
RLS, anonymous denial, currencies, refund eligibility, discounts, duplicate
product names, distinct order counts, empty results and alert pagination.

The Dashboard Workflows CI job runs `e2e/dashboard-analytics-browser.mjs` against
the production artifact with intercepted synthetic sessions and data. It tests
cards, rankings, exact chart values, ranges/comparison, filters, navigation,
export, stale requests, error/empty states, responsive widths, mobile drawer,
editor permission visibility, Arabic and dark mode. Screenshots are written to
`test-results/analytics/` (ignored by git). No test writes to a live database.

## Release readiness gate (engineering phase P0)

`bun run check:analytics-release` makes two bounded requests using only the public
publishable key (or a legacy JWT with role `anon`). It never loads a staff session,
uses a secret/service-role key, follows redirects, or prints response bodies.
The expected response is PostgreSQL `42501`, naming the requested RPC: its signature
exists and anonymous execution is denied. A missing RPC, incorrect credentials,
network timeout, ambiguous denial, or unexpected successful data response blocks
release. No anonymous grants should be added to make this check pass.

The gate checks existence/signatures and anonymous denial, not authenticated output
semantics or every RLS rule. Those remain covered by the database behavior suite,
production-artifact browser tests, and authorized read-only validation after rollout.
It does not apply migrations or make business writes.

The CLI follows the same public URL/key environment precedence as the browser:
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, then `SUPABASE_URL` /
`SUPABASE_PUBLISHABLE_KEY`, then the existing public defaults read from the browser
client source. Missing or unrecognized defaults fail closed. No configuration
values or raw transport errors are logged. Each probe has a 10-second deadline.

Use the existing Cloudflare build, then the protected deploy command:

```sh
bun run build:cloudflare
bun run deploy:cloudflare
```

Cloudflare Workers Builds currently builds `main` with `bun run build:cloudflare`
and deploys with `npx wrangler deploy`. After the new scripts have reached `main`,
change only that trigger's deploy command to `bun run deploy:cloudflare`. Preserve
the build command, repository, branches, domains, bindings and credentials. The
external trigger must not reference an unpublished script. Until this setting is
switched, the automatic deployment path is not yet protected by the new gate.
Manual `wrangler deploy` also bypasses it and should not be used for routine releases.

Local/CI builds remain independent of live network access. CI tests the gate with
synthetic transports; a release runs the public-key probe against its actual target.
In a local environment requiring an HTTP proxy, Node's `NODE_USE_ENV_PROXY=1` may be
needed to use the environment's proxy configuration.

If a deployed client encounters a missing RPC (`PGRST202`/`42883`), the dashboard
shows a localized temporary-unavailability message and a retry action rather than
presenting the condition as an empty sales period or exposing an internal signature.
The inventory and sales panels keep their independent error behavior.

The next phases and their acceptance criteria are recorded in
`docs/superpowers/plans/2026-11-16-dashboard-engineering-roadmap.md`.
