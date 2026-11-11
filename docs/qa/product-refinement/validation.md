# Product purchase section refinement — 11 November 2026

The section below the gallery now presents named color choices, capacity and quantity in one configuration card. Price and availability share a row; wishlist and share have accessible icon controls; questions use a full-width link; three assurances share one row. Product details use compact disclosures and long prose can expand.

Phone highlights recognize Chip and longer merchant display/camera specifications. The compact preview uses a complete first clause from the merchant value; full values remain available through an action that opens and focuses Specifications.

## Validation

- Unit suite: 733 passed, 0 failed.
- TypeScript and production build: passed.
- ESLint: 0 errors, 27 existing unrelated warnings.
- SSR smoke: 9 routes passed with deterministic Supabase fixtures.
- Repository security gate and diff whitespace check: passed.
- Shared Chrome: selected Deep Blue / 512GB on the real iPhone product snapshot; price changed from $1,499 to $1,799. Added to cart, opened the drawer and verified exact options and $1,799 total; removed the test item.
- Remote real-browser checks on iPhone snapshot: 430px English/light and 320px Arabic/dark, 38 checks each. Verified real stock cap (one), color/capacity interaction, four truthful highlights, specifications focus/expand, all policy links, full-width question action, single-row assurances, touch targets, no horizontal overflow, selected cart options and price, and WhatsApp draft options. No message was sent.

- Remote desktop 1440px English/dark deterministic fixture: 27 checks passed, including variant price $599, real stock cap 20, and cart 2 × $599 = $1,198.

The preview uses the production build with read-only product snapshots and serves noindex pages. It does not replace production. Local Chromium cannot launch in this executor; browser checks use remote Chromium and shared Chrome.
