# Dashboard repair evidence

Baseline: `3b7e61d342671be1bf217cf842949135b12d7f43`. The screenshots use intercepted synthetic data and a local development server, not production records. The before screenshots predate the collection and homepage layout changes; the after screenshots show the same fixtures. They are evidence for those two layouts only.

## Findings

| ID | Status | Evidence and remaining work |
| --- | --- | --- |
| F01 | Fixed locally; server workflow unverified | The PO list does not request product options but used their empty array to disable New PO. The list now opens the creation route, which loads its own prerequisites and identifies missing ones. `dashboard-po-entry-browser.mjs` exercises a synthetic staff session; actual server authorization and successful creation remain untested. |
| F02 | Investigated; deployed configuration blocked | The security card reports only the browser site-key presence; login and password reset pass the challenge token to Supabase Auth. This does not verify server-side CAPTCHA or all bot protections. Operator steps already exist in `docs/dashboard-security-hardening.md`; no keys or policies were changed. |
| F03 | Fixed locally; partial validation | Products distinguish initial load from empty results and retain data during refresh; request sequencing remains in place. `dashboard-products-loading-browser.mjs` covers delayed initial load and refresh. Retry, refresh failures, expired sessions and all navigation paths need further testing. |
| F04 | Definitions documented and labels clarified | See metric definitions below. Values were not changed. Staging verification remains outstanding. |
| F05 | Fixed locally | `dashboard-procurement-ratios.test.mjs` covers unavailable denominators, eligible completed POs, missing dates, partial/cancelled cases and damage units. The on-time denominator contains completed orders with both valid expected and approved receipt dates. |
| F06 | Partially addressed | Existing non-archived tracked-product eligibility is preserved; draft suggestions are labelled and the list is searchable and paginated. `dashboard-procurement-ratios.test.mjs` covers projected quantity and `dashboard-reorder-browser.mjs` covers the list. The intended inclusion of drafts needs business confirmation; no orders or stock were changed. |
| F07 | Partially addressed | Source inspection finds `/brands` consumes the public SEO record; `/` currently has static SSR metadata and intentionally avoids an async loader. The dashboard now marks home as prepared and explains that Arabic metadata and JSON-LD are not applied. `dashboard-seo-coverage-browser.mjs` covers the labels. Reconnecting home or additional fields requires SSR, caching and performance work. |
| F08 | Partially addressed | Catalog events show a product identifier, actor identifier and product link when available; CMS events show record and actor identifiers where provided. No payload contents are displayed. `dashboard-activity-context-browser.mjs` covers the catalog case. Names, changed-field summaries and CMS link coverage remain unverified. |
| F09 | Partially addressed | Supplier/location fields and Orders search have persistent labels; supplier-name validation associates an inline error and moves focus. Collection icon actions have accessible names. `dashboard-supplier-labels-browser.mjs` and `dashboard-orders-search-browser.mjs` cover these cases. The rest of the forms, dialogs, announcements and screen-reader flows require audit. |
| F10 | Partially addressed | The Products “Drafts” preset and new strings have Arabic translations. A full translation, pluralization, date/currency and mixed-direction audit remains outstanding. |
| V01 | Fixed locally | `dashboard-layout-repairs-browser.mjs` checks collection-action clipping at 320, 375, 390, 768, 1024 and 1440 CSS pixels, both languages and themes. |
| V02 | Fixed locally | The same browser check covers section-name clipping in both languages and themes at those widths; selection is exposed through `aria-pressed`. |
| V03 | Partially addressed | Desktop PO dates share the PO column, mobile cards include both dates, and the scroll region is keyboard reachable. `dashboard-po-table-browser.mjs` covers a synthetic desktop/mobile row. All data and actions still need real workflow verification. |
| V04 | Outstanding | Products and Orders need further density and workflow review. |
| V05 | Partially addressed | Shared workspace primary/sidebar tokens use neutral colors; `dashboard-workspace-identity-browser.mjs` measures primary-button contrast in both themes. Numerous page-specific colors and secondary/status contrasts remain to be audited. |
| V06 | Partially addressed | Collections, Homepage and SEO primary copy is task-oriented. Other sections still need review. |
| V07 | Partially addressed | Desktop navigation rows and group gaps are denser while mobile touch targets remain unchanged. `dashboard-sidebar-density-browser.mjs` checks desktop density and active-route visibility when a group is collapsed. Full keyboard, scroll-retention and permission coverage remains. |

## Inventory metric definitions

All figures are current snapshots, independent of the overview report period. Overview's `get_dashboard_home_snapshot` sums stock and counts low/out-of-stock **variants** where `track_inventory` and `is_active` are true; it does not filter parent product status. Low stock is 1–10 units and out of stock is zero or less. Inventory's `dashboard_inventory_summary` counts and sums **all variant rows**, including inactive and untracked variants and all parent statuses; its low/out counts include tracked variants regardless of active or parent status, with the selected low-stock threshold (default 10). Products counts **products** whose `store_products.stock_quantity` is 1–10, regardless of tracking or status. The scopes therefore need not match.

## Section coverage

“Partial” means only the named local behavior was checked; it is not a pass for the complete workflow. The prior live audit's observations remain separate evidence.

| Section | Current evidence / remaining work |
| --- | --- |
| Dashboard | Metric scopes inspected; full operations, periods, refresh and exports not retested. |
| Analytics | Not retested. |
| Sales | Not retested with completed-sale fixtures. |
| Orders | Partial: search label checked in a browser fixture; maps, filters, transitions and details require fixtures. |
| Customers | Not retested. |
| Inventory | Metric definitions inspected; adjustments and movements require staging. |
| Receiving | Existing baseline unit tests passed; end-to-end receipts and inventory effects not retested. |
| Purchase Orders | Partial: synthetic entry and list layout tests; lifecycle, permissions, print and attachments remain. |
| Suppliers | Partial: synthetic supplier labels and required-name error; writes and location validation remain. |
| Procurement | Partial: ratios and reorder fixture checks; eligibility policy and transactions remain. |
| Add New Product | Not retested. |
| Products | Partial: initial loading and refresh fixture; full catalog CRUD and filters remain. |
| Brands | Not retested. |
| Collections | Partial: action layout fixture; memberships and CRUD remain. |
| Categories | Not retested. |
| Homepage | Partial: section-name layout fixture; scheduling, publishing and preview remain. |
| Hero banners | Not retested. |
| Navigation | Not retested. |
| Media library | Not retested. |
| SEO | Partial: route-coverage labels; metadata output and writes remain. |
| Users | Not retested. |
| Activity logs | Partial: synthetic catalog context; pagination, CMS context and permissions remain. |
| Security | Source inspection only; server CAPTCHA configuration, MFA and session/credential operations require dedicated accounts. |
| Settings | Not retested. |

Successful CRUD, uploads, exports, printing, stock/order/payment/delivery transactions, concurrent edits, role denial, contrast beyond the tested primary button, screen readers, failures, and full storefront propagation require isolated backend fixtures or staging. AI research was not executed. No production writes, configuration changes, deployment or merge were performed.

## AI data flow

No live AI request was sent. The browser invokes the Supabase `dashboard-ai-assist` Edge Function with batches containing the entity, action, query, requested field metadata, current form values, optional reference text/URLs and dashboard context. The function constructs a prompt from those inputs and, when configured, sends it to Google's Gemini Interactions API (`generativelanguage.googleapis.com`), with Search/URL Context where applicable. A live test requires specific authorization for the actual data and receiving service; use synthetic or approved public inputs and mocks otherwise.

## Local verification

- `bun run test:unit`: 654 passed, 0 failed. An earlier run exposed two outdated text/label expectations, which were updated before this passing run. A subsequently added zero-damage case also passed in the focused procurement suite.
- `bun run typecheck`: passed.
- `bun run lint`: passed with 27 fast-refresh warnings and no errors.
- `bun run build`: passed with bundler/Cloudflare configuration warnings.
- Fixture-backed `e2e/ssr-smoke.mjs`: passed for eight storefront paths; the fixture intentionally exercises Rust-catalog fallback warnings.
- `bun run test:dashboard:browser`: passed with intercepted fixtures; route rendering was checked at mobile and Arabic dark tablet sizes, without claiming complete workflow coverage.
- `bun run test:dashboard:professional`: passed with intercepted fixtures, including a synthetic supplier write and PO draft navigation guard.
- `bun run test:dashboard:repairs`: passed with intercepted fixtures; the CSS-width matrix is limited to the collection action and homepage section name.
- `bun run test:commerce:setup`: blocked before local services started. Docker could not register the isolated Supabase PostgreSQL image layer (`no space left on device`); the retry was stopped. `test:commerce` and its real local database/auth transaction assertions therefore did not run.
