# Product page layout — 2026-11-11

## Result

The purchase panel presents brand/title, availability, price and discount, options, quantity, and purchase actions in that order. Single-value options are facts rather than interactive choices. Numeric storage/memory options have display units without changing the raw variant values. Repeated selection facts are excluded from the highlights; merchant specifications and explicit title facts remain the only sources.

Product details use keyboard-operable native disclosures for description, specifications, box contents and delivery/policies. Empty optional sections are omitted. The original merchant description and policy destinations are retained.

Below 640px, one safe-area-aware purchase bar replaces the bottom navigation. It includes an explicit cart opener and count. Larger layouts retain the original inline purchase controls and navigation. Color and storage selection controls have 44px touch targets. Arabic labels and direction, dark mode, variant availability and inventory limits remain supported.

## Verification

- `node --test e2e/*.test.mjs`: **732 passed, 0 failed**.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- ESLint full project with the repository's `--fix-dry-run` mode: **0 errors**, 27 pre-existing warnings outside these changes.
- Vite production build: passed.
- Production SSR smoke: passed for checkout, home, help, privacy, shop, categories, Samsung brand, search and sitemap.
- Source security gate and `git diff --check`: passed.

## Real browser verification

The environment prohibits the Unix sockets needed to start local Chromium. Verification therefore used shared Chrome and Cloudflare Browser Rendering against a public, noindex QA preview containing the real built client assets and rendered product data. These were actual React interactions, not source assertions. The initial parallel browser batch hit the provider's rate limit; successful cases below were subsequently run individually. One desktop request had a transient network error and passed on its later retry.

| Product/data | Viewport | Language/theme | Outcome |
|---|---|---|---|
| Actual HONOR Play20C | 320 × 720 | English/light | 21 interaction/layout checks passed |
| Actual HONOR Play20C | 390 × 844 | English/light | 21 interaction/layout checks passed |
| Actual HONOR Play20C | 430 × 932 | Arabic/light | 21 interaction/layout checks passed; screenshot and JSON saved |
| Actual HONOR Play20C | 768 × 1024 | Arabic/light | 17 interaction/layout checks passed |
| Actual HONOR Play20C | 1440 × 1000 | English/dark | 18 interaction/layout checks passed |
| Deterministic product fixture | 430 × 932 | Arabic/dark | 23 interaction/layout checks passed |

Checks cover quantity increase/decrease and its lower bound; single-value presentation; no repeated storage feature; details opening/closing; policy links; gallery switching; writing direction; horizontal overflow; purchase-bar position; mobile/cart access; cart line quantity, selected variant and displayed total. The fixture additionally exercises storage selection, price changes and the real inventory cap. The actual HONOR cart showed **2 × $119 = $238**. Fixture selection of 512GB showed **2 × $599 = $1,198**, and quantity stopped at its configured stock of 20.

Shared Chrome also manually verified adding two HONOR units, opening the drawer, reading its $238 total, removing the test line, and expanding specifications. No order was submitted and inventory was not changed.

The repeatable Playwright driver is `e2e/product-layout-acceptance.mjs`, integrated into Storefront CI. Use `PRODUCT_LAYOUT_LIVE=1 SPACE_CALL_VISUAL_FIXTURES=0` for the optional real-product read/cart probe. Default mode uses the existing deterministic read fixture.

Preview: https://spacecall-product-layout-qa.koreazolfakar.workers.dev/product/honor-play20c

Evidence: [mobile screenshot](./product-layout-mobile.png), [mobile browser result](./product-layout-mobile-results.json).

## Delivery boundary

The QA preview is separate from the existing production Worker. This change does not change DNS, credentials, database schema or product records. Production publication is not claimed by this report.
