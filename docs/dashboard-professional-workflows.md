# Dashboard workflow review — 2026-10-22

Follow-up: the [reliability completion](dashboard-reliability.md) resolves the 13 failures and three skips below and adds real local Auth/API/database acceptance coverage. The counts in this original review describe its earlier commit.

The dashboard now preserves the operator's place when moving between lists and details, offers one keyboard-accessible search across sections and records, and protects editing work across overlapping dialogs and navigation. The implementation keeps the existing Space Call visual system and Arabic/English support.

## Changes

- URL-backed search, filters and pagination across products, orders, customers, inventory, receiving/purchase orders, collections, SEO, navigation, suppliers and media. Detail return links restore the list context within the tab.
- Presets and up to five named local views for products, orders, customers and inventory. Views store filter configuration rather than customer search text.
- A shared command center (`Ctrl/Cmd+K`) searches sections, products, orders and customers. Record queries are bounded to five results per group, run concurrently, retain successful groups on partial failure, and ignore stale responses. Editor navigation excludes the admin staff directory.
- A shared dialog stack ensures Escape and Tab apply to the uppermost dialog. Forms protect unsaved work, pending submissions block conflicting edits, and media dialogs share focus/scroll management.
- Product section navigation, preparation indicators, and visible unsaved status. These indicators do not make optional content mandatory to save a draft.
- Inline load failures and retry controls, an offline notice, denser mobile summary cards, and removal of the duplicate floating collection action.
- Supplier creation respects the Active supplier checkbox. Receiving refreshes no longer overwrite entered quantities for the same deep-linked purchase order.
- Restore tab-scoped production authentication storage with one-time legacy-session migration and an in-memory fallback when browser storage is blocked. Framed Lovable previews retain the current broker integration.
- Five planned tools (promotions, marketing, coupons, reviews and messages) remain explanatory direct routes and are excluded from primary navigation and search. They are **not implemented business workflows**.

## Backend repairs already applied

The production project was missing two functions used by existing dashboard features. The existing SQL migrations below were applied through Supabase; this PR does not add another migration for the same SQL.

1. `20261005002000_guard_referenced_dashboard_media.sql`: adds staff-scoped media usage inspection and a database trigger preventing deletion of referenced assets.
2. `20261005003000_customer_order_history_pages.sql`: adds paginated customer order history while preserving the older interface.

Post-deployment inspection confirmed the functions exist, use invoker permissions, deny anonymous execution, and grant execution to authenticated users with staff checks inside. Encoded nested media references were detected. A request without a user identity received no customer order rows. All 55 distinct RPC names found in the dashboard data layer now exist in production; this confirms interface availability, not a full production transaction test. All 31 referenced tables were present with RLS enabled.

No customer/order/catalog records were changed during the review. Existing security advice about leaked-password protection remains unresolved; authentication configuration was not changed.

## Verification

- TypeScript (generated routes plus `tsc --noEmit`), ESLint, and production build.
- `npm run test:dashboard:browser`: 28 navigation routes at mobile and Arabic dark tablet sizes; customer editing, dirty Back navigation, search races, keyboard behavior, list filtering/pagination/export, reporting period links, and five responsive widths.
- `npm run test:dashboard:professional`: seven unit tests and 15 browser workflow assertions covering session migration/blocked storage, URL recovery, local views, cross-record search, stale results, staff navigation, nested dialogs, protected drafts (including purchase orders), supplier state, retry, section focus, offline state, and Arabic mobile layout.
- `npm run test:dashboard:ai`: 18 unit tests plus browser checks of all 46 specification slots across two batches, preservation of existing values, review before application, excluded operational fields, unknown facts, failed batches, cancelled requests, nested dialogs and bilingual collection/SEO assistance.
- Full unit suite: **591 tests, 575 passed, 13 failed, 3 skipped**. Unmodified `main` (`5955c478`: 584 tests, 565 passed, 16 failed, 3 skipped) reproduces those 13 failures plus three authentication-storage failures fixed here. No additional failures were introduced. The remaining failures include source-shape assertions predating server RPCs in dashboard/storefront tests and require separate reconciliation. The existing full CI remains enabled.

The new `Dashboard Workflows` action runs focused behavior checks, browser suites, type/lint checks and a production build. Run unit tests before starting Vite: the existing hero-scene test creates a Vite server and can invalidate a concurrently running development server's dependency cache.

Browser verification uses a synthetic editor session and intercepted API fixtures. It validates interaction and request behavior without modifying live business records. Production inspection checks schema, grants and safe function behavior; it does not substitute for signed-in staff acceptance of real order transitions, stock approval, email delivery, image uploads, provider-backed AI generation or every settings save. No claim of complete live transaction coverage is made.

## Implementation notes

Shared components and hooks live under `src/dashboard/components/layout`, `src/dashboard/hooks` and `src/dashboard/lib`. List URL parsing rejects invalid enum/numeric/boolean values, preserves unrelated parameters, and resets pagination on filter changes. Unsaved-change protection retains dirty registrations when browser navigation only changes the query string or hash.

The UI changes require this PR to be merged and the connected frontend to deploy. The backend repairs described above are already live.
