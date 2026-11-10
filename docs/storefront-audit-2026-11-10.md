# Space Call storefront remediation — 2026-11-10

The current source is `koreazolfakar-droid/commerce-pal-launch`. The initial review's 24-item count was the initial catalogue page, rather than the full active catalogue. The current database contains 145 active products.

## Live data changes

- Added BANGE, CMF, Mark Ryden and WiWU brand records and repaired 10 missing product relationships using explicit product identities.
- Repaired three missing category relationships (ACEFAST charger, ACEFAST cable, Mark Ryden Expandos backpack).
- Recovered five exact product images, inspected them, uploaded them to the existing public `cms-media` bucket, and attached them only where no product image existed. Original sources and prior metadata are in `storefront-data-remediation-2026-11-10.json`.
- Verified 218 distinct existing original/thumbnail URLs: all returned HTTP 200 and image content types.
- Final SQL verification: 145 active products; 0 missing brands, 0 missing categories, 0 missing images.
- Published bilingual shipping, returns and warranty CMS policies at the merchant's explicit request to author balanced terms. Text is in `store-policies-2026-11-10.json`.
- A temporary fixed-input image uploader authenticated by a random token was used for recovery. It was replaced immediately after upload with a disabled handler; it now requires JWT and returns HTTP 410. No privileged upload capability remains active.

## Code changes

- Reject placeholder vendor names such as `Brand` when resolving/displaying real brands.
- Classify used phones by item category and whole-word condition signals, avoiding headphones, phone accessories and `unused` false positives.
- Show the primary desktop/mobile Used Phones link only when lightweight navigation metadata identifies matching products. The direct route remains available; the unconditional information-page discovery link was removed.
- Read warranty policy content from CMS as with shipping/returns.
- Keep checkout browser persistence checks out of the server render, and tolerate unavailable browser storage during store hydration. The old direct `persist.hasHydrated()` call aborted checkout SSR.
- Transfer policy route loader snapshots into the first client render. Browser testing exposed a server/client policy-content mismatch which this fixes.

## Policy reference

Withdrawal was set to 10 calendar days, without requiring a reason, preserving mandatory rights. Opening packaging for inspection alone is not treated as use. Product-specific warranty terms remain controlling; no universal manufacturer's warranty duration is invented. Reference: Lebanese University legal information centre, Law 81/2018, Article 129 amending Article 55: https://legiliban.ul.edu.lb/LawArticles.aspx?LawID=278573&LawTreeSectionID=291567&language=ar

## Verification

- TypeScript: `pnpm exec tsc --noEmit` passed.
- Unit suite: 705 passed, 0 failed.
- Lint: 0 errors; 27 existing React fast-refresh warnings.
- Production build passed.
- Live-data SSR smoke passed: checkout pending shell, home, help, privacy, shop, categories, Samsung brand, Samsung search, sitemap.
- Browser: published shipping/returns/warranty content, wishlist persistence after reload, ACEFAST search, product selection, persistent cart and checkout rendering; mobile at 390px has no horizontal overflow.

No live order was submitted and no customer account was used. Actual authenticated order submission/payment and subsequent order tracking require a controlled test account/order. The current `/compare` route intentionally redirects home; comparison is not an active feature in this revision. Homepage section selection and featured brands remain governed by merchant CMS settings; the full directory is a separate view.

Live database/content corrections are already applied. Code changes require merging/deploying the accompanying branch to reach the production storefront.
