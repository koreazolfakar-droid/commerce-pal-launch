# Product editor repair and Shopify comparison

Inspected base: `78520d32318f673eba007e45c82ee1329473550a`. Branch: `fix/product-editor-repair-qa-20261102`.

This report distinguishes implemented changes, existing behavior, compatibility gaps, executed tests and production verification. It is not a claim of complete Shopify parity.

## Repaired defects

1. The variant editor was a fixed descendant of the product panel, without dialog semantics, focus trapping, focus restoration or body scroll locking. It now uses a body portal and the existing dashboard modal hook. Its layout is isolated from the desktop dashboard grid, following the PR #473 AI-dialog fix. Escape, named close control, busy-state dismissal protection and keyboard focus are provided.
2. Compact editor validation rejected locked price/stock values on multi-variant products. Validation now checks the fields the compact editor actually owns. A PostgreSQL regression reproduces the server-side equivalent with a zero-price variant; the additive migration preserves existing values and retains positive-price/valid-stock validation for creates and single-variant products.
3. Invalid specification values inside collapsed Specifications were reported only in a toast. Saving now opens that section and focuses/scrolls to the actual invalid input.
4. Product navigation omitted Collections and Publishing. Both destinations are now included, while preserving the existing Advanced destination and all existing managers.
5. Mobile sticky footer actions could float over fields. The editor action footer now stays in document flow, with the dashboard bottom-navigation clearance preserved.
6. The 1024–1279px editor used a single long column despite available desktop space. It now has a scoped main/aside grid, with one-column pricing/inventory inputs in the narrower aside. Dialog geometry is not affected by these rules.
7. AI request cancellation required closing the dialog. A dedicated Cancel research action aborts and invalidates the request, keeps the draft unchanged, and offers retry. Errors now have an explicit retry action and wrap long messages.
8. SKU/barcode length errors lacked client feedback. Bounded identifier validation is connected to inline errors and focus targets.
9. Inline validation text changed the input's accessible name. Product inputs now keep stable explicit names while describing errors separately.
10. Both storefront and dashboard toast renderers were mounted on dashboard routes, producing duplicate save/error messages. Dashboard routes now use their own themed toast renderer; storefront deferred feedback is preserved on storefront routes.
11. Product metadata saves overwrote custom primary-image alternative text. The migration now initializes alt text on insertion and preserves it on existing images.
12. Additional-option review identified dedicated color/capacity alias loss and numeric values turning into strings after clearing/retyping. Dedicated options now normalize names consistently and custom numeric options retain their declared type until payload parsing.
13. Variant image files could remain queued after cancelling or switching editors. Each editor session now clears pending files and rejects delayed image-editor results from older sessions.

## Added compatible capabilities

- Editable image alternative text, persisted to the exact `store_product_images` row with staff authorization, product-ID scoping, bounded input, existing RLS and storefront cache invalidation.
- Additional variant options such as RAM, size and material using the existing variant `options` JSON and existing variant RPCs. Existing number/boolean values remain typed. Duplicate names, dedicated color/storage aliases and unsafe object keys are rejected. Each variant still represents one combination; this is not a Cartesian-combination generator.
- Live search-engine preview, SEO character guidance and the existing canonical origin/handle. A new product's URL is explicitly shown as pending generation. The preview does not change the URL or SEO policy.
- A private product-card preview on Edit as well as Add. It is labeled Local preview for saved products and does not expose drafts publicly.
- Arabic translations for the added controls and feedback.

## Field-to-storage map and storefront flow

The main editor calls `saveDashboardProduct` → `save_store_product_editor` with named arguments. The RPC validates staff, locks existing products, enforces expected-stock concurrency, writes specifications/collections and records actual stock movements. The new migration defers owned-field validation and preserves existing image alt text; it adds no table/column and updates no product rows during installation.

| Editor field | Storage / operation | Public use |
| --- | --- | --- |
| Title | `store_products.title` | Cards, product page, search and metadata |
| Description | `store_products.description` | Merchant-content parser and product content |
| Brand | `store_products.brand_id` → `cms_brands` | Vendor, brand navigation/filtering |
| Category | `store_products.category_id`; existing RPC also derives `product_type` from category | Category routes and specification template |
| Status | `store_products.status`, `published_at` | Public RLS and queries expose active published rows |
| Price / compare-at | Default `store_product_variants.price`, `compare_at_price`; summary trigger | Product/variant prices, cart and checkout |
| SKU / barcode | Default variant and product summary identifiers | Variant/cart identifiers and catalog search |
| Stock | Variant `stock_quantity`; summary + `store_inventory_movements` | Availability, checkout stock checks |
| Collection membership | `store_collection_products` via atomic RPC | Collection queries |
| SEO title / description | `store_products.seo_title`, `seo_description` | Product route metadata |
| Specifications | Existing `specifications` document `{values, keySpecs}` | Category-aware specification display |
| Images | `cms-media` objects and `store_product_images` | Gallery, thumbnails and primary card image |
| Image alt text | `store_product_images.alt_text` | Accessible gallery image descriptions |
| Variant title / identifiers / pricing / stock | `store_product_variants` through existing guarded RPCs | Product selection, cart and checkout |
| Color / storage / additional options | `store_product_variants.options` JSON | Native catalog normalizes options into storefront selectedOptions |
| Variant image | `store_product_variants.image_url` + `cms-media` | Selected-variant imagery |
| Track inventory / backorder / active variant | Variant booleans through existing RPCs | Availability and checkout policy |
| Shipping link | Existing store-wide delivery settings | Existing checkout delivery fee rules |
| AI suggestions | Local editor state until manual save; no product write from AI | Becomes public only through ordinary save/publication |

Saving invalidates native catalog reads and broadcasts storefront refresh. Existing public product, search, collection and brand queries, product structured data, cart/wishlist/compare and order snapshots are retained.

## Official Shopify benchmark

Sources reviewed on 2026-11-02:

- [Product details page](https://help.shopify.com/en/manual/products/details/product-details-page/)
- [Adding and updating products](https://help.shopify.com/en/manual/products/add-update-products)
- [Product status and availability](https://help.shopify.com/en/manual/products/product-status)
- [Adding variants](https://help.shopify.com/en/manual/products/variants/add-variants)
- [Adding product media](https://help.shopify.com/en/manual/products/product-media/add-media)

Shopify is the functional reference; its layout and architecture have not been copied. The table is a compact feature comparison, not an exhaustive specification of Shopify.

| Capability | Shopify behavior | Space Call currently | Gap / implementation decision | Test / evidence |
| --- | --- | --- | --- | --- |
| Title | Editable product title | Existing title | Preserve | Create/edit browser, unit |
| Description | Rich-text editor | Existing plain-text content editor/parser | Rich-text authoring still missing; existing `description_html` is a separate representation | Source audit; no false rich-text claim |
| Product type | Independent organization value | Derived from selected category in current atomic RPC | Independent product type remains a gap | SQL + field map |
| Vendor / brand | Vendor field | Existing brand relation and inline admin creation | Preserve | Source + browser fixtures |
| Category | Catalog taxonomy | Existing categories and templates | Preserve original taxonomy | AI/template tests |
| Collections | Membership selection | Existing multiple membership save | Navigation added | Atomic-save tests |
| Tags | Searchable product tags | Stored/read by catalog; absent in this editor's save contract | Editor tags remain a gap | Source audit |
| Status | Active, Draft, Archived, Unlisted | Active, Draft, Archived | Preserve current statuses; no unlisted access policy introduced | RLS and RPC audit |
| Multiple images | Product media gallery | Existing gallery | Preserve | Media regression tests |
| Upload / removal | Media controls | Existing upload, replace and guarded delete | Preserve | Media transport/source tests; full real upload acceptance pending |
| Ordering | Rearrange media | Existing accessible move buttons | Drag-and-drop remains a gap | Existing reorder RPC tests |
| Cover image | Primary product image | Existing Primary action | Preserve | Atomic media tests |
| Alternative text | Editable media alt text | Previously read/uploaded only | Added scoped persisted editor | New transport and browser tests |
| Optimization | Media optimization | Existing resolution/compression preview and WebP pipeline | Preserve | Image-processing tests |
| Variant imagery | Image for variant | Existing upload/clear/replace | Preserve | Variant/media regressions |
| Upload feedback | Progress and recovery | Existing file progress, retained partial create ID/uploads | Preserve; no claim of byte-level progress | Partial-create regression tests |
| Price / compare-at | Pricing fields | Existing per-variant values | Preserve and repair ownership validation | PostgreSQL and form tests |
| Cost / profit / margin | Cost entry and projected margin | Existing inventory accounting has average-cost concepts | Standalone editor cost/margin not added; must reconcile with receiving/valuation | Accounting compatibility review |
| Currency | Store / market currency | Existing USD business model | No new multi-currency checkout | Existing pricing tests |
| Price validation | Valid pricing | Existing positive default price, variant pricing | Locked metadata validation fixed in UI and SQL | New PostgreSQL regression |
| Tax settings | Product tax configuration | No complete product-tax contract in editor/checkout | Not fabricated | Backend audit |
| SKU / barcode | Product/variant identifiers | Existing fields | Added client bounds and inline errors | New validation tests |
| Quantity tracking | Track inventory | Existing variant toggle | Preserve | Variant and stock tests |
| Out-of-stock selling | Inventory policy | Existing allow-backorder toggle | Preserve business policy | Existing availability tests |
| Inventory locations | Location-specific quantities | Separate inventory/procurement locations, compact product aggregate | No unverified per-location allocation editor | Inventory architecture audit |
| Stock visibility / history | Quantities and adjustments | Existing stock, movement log and inventory page | Preserve ledger ownership | SQL movement/concurrency tests |
| Colors / storage | Options and variant combinations | Existing dedicated editors | Preserve | Variant browser fixtures |
| RAM / size / material | General option values | JSON already supported; editor only exposed color/storage | Added general option editing | Typed-option unit + browser tests |
| Combination generation | Add option combinations | One explicit variant per combination | Bulk Cartesian generator remains a gap | No placeholder action added |
| Variant identifiers | Per-variant SKU/barcode | Existing | Preserve | Existing variant RPC tests |
| Variant price / stock | Independent values | Existing | Protect against top-level overwrite | SQL and stock regression tests |
| Variant availability | Per-variant availability | Existing active, track and backorder controls | Preserve | Source and availability tests |
| Physical / digital | Product shipping classification | Physical electronics store | Digital fulfillment not implemented; no disconnected toggle | Checkout compatibility audit |
| Weight / dimensions | Shipping details | No product-specific shipping contract | Not added as inert fields | Backend audit |
| Shipping / delivery fees | Shipping configuration | Existing store-wide delivery rules | Preserve settings link and checkout | Delivery tests |
| SEO title / description | Editable search listing | Existing persisted metadata | Added live preview and length guidance | New helper + browser tests |
| URL handle | Editable search listing URL | Generated on create, preserved on edit | Editing handles requires redirect/link policy; left unchanged | Canonical/storefront audit |
| Canonical / structured data | Storefront SEO | Existing route canonical and JSON-LD | Preserve | SSR/SEO regressions |
| Translation-aware SEO | Localized content | Existing bilingual global SEO; product editor has shared title/meta fields | Per-language product SEO remains a gap | Existing bilingual AI test |
| Technical specifications | Custom product data | Existing category templates and grouped specs | Added invalid-field focus/reveal | Specification + browser tests |
| Typed metafields | Typed custom data | Category values are normalized strings | Typed variant options added; no claim of general metafield definitions | Typed-option tests |
| Reusable templates | Category-dependent definitions | Existing category specification templates | Preserve | Specification normalization tests |
| Required fields | Product validation | Title/price/stock; optional unit-aware specs | Required per-spec definitions not supported by current schema | Honest limitation |
| Draft / publish / update | Product lifecycle | Existing explicit actions | Preserve real RPC flow and draft-only AI | Creation/edit/AI tests |
| Sales channels | Channel availability | One public storefront | Additional channel system not fabricated | Publishing/RLS audit |
| Preview | Product preview | Add-only local card and active-product link | Added private Edit card and SEO preview | Browser screenshots |
| Unsaved changes | Navigation protection | Existing shared dirty registry/history guard | Preserve | Existing unsaved-change tests |
| Duplicate | Copy product | Existing draft copy, zero stock, blank identifiers | Preserve stock safety | Existing product-management tests |
| Async save / errors | Loading and recovery | Existing guarded async save and retryable partial create | Added AI cancel/retry, inline identifier errors | Browser and unit tests |
| Keyboard / accessibility | Accessible editor controls | Existing dashboard modal infrastructure | Variant portal, focus trap, Escape and named close added | Browser keyboard checks |

## Verification record

- Base source and recent work: PRs #473, #472, #471 and #463 reviewed. PR #473 desktop grid isolation is retained.
- Initial full dependency-backed unit run: **672 passed, 0 failed**. A fresh run after the additional migration/tests is recorded in the final delivery update below.
- New regression tests were run failing before the relevant implementation: owned-field validation, identifier bounds, generic option parsing, SEO preview, alt-text transport and server ownership validation.
- The new migration passed embedded PostgreSQL execution. The full existing stock/concurrency suite was moved to the new migration and updated to assert the already-deployed `{values,keySpecs}` specification representation; **11 tests passed** in that focused run.
- Production build and fixture-backed SSR smoke executed successfully. TypeScript and ESLint final results are recorded at delivery.
- AI responsive browser suite passed 13 widths from 320 to 1920px, plus reduced viewport height. AI workflow browser suite passed 46-field batching, existing-value protection, operational-field exclusion, blocked suggestions, draft-only apply, failed batches, stale cancellation, category discovery, nested dialogs and Arabic dark mode with no page errors.
- Full editor browser fixture writes are intercepted and never reach production. They demonstrate UI transport and fixture reload behavior, not a production database write or a physical Android test.
- Connected production Supabase was inspected read-only: the 17-argument function body matched the base migration exactly; product/image/variant/membership RLS policies and security-invoker functions were verified. No real product records were created or edited for testing.
- Browser screenshots/matrix are generated under `test-results/product-editor/`. Final selected evidence is copied into this report's evidence directory when available.

## Remaining acceptance limitations

The broader brief includes capabilities beyond this incremental repair. In particular, rich-text authoring, independent product type/tags editing, cost/margin UI, tax settings, digital fulfillment, weight/dimensions, per-location editing, Cartesian variant generation, drag-and-drop ordering, redirect-safe handle editing, per-language product SEO and general typed metafield definitions are **not complete**. These are documented gaps, not hidden or simulated controls.

Production write persistence, real provider responses/quota, physical Android keyboard/desktop-site behavior and every upload/replace/delete path require additional acceptance evidence. Browser interception and embedded PostgreSQL tests do not establish those claims.

Merge and deployment must be reported using actual remote PR/commit/deployment evidence. Passing compilation alone is insufficient.

## Current delivery evidence

- Pull request: https://github.com/koreazolfakar-droid/commerce-pal-launch/pull/475 (draft while final checks run).
- Full local unit suite after independent-review fixes and toast-host repair: **678 passed, 0 failed**.
- New PostgreSQL/transport/editor regression group: **20 passed, 0 failed**.
- TypeScript: passed (`node node_modules/typescript/bin/tsc --noEmit`).
- Full ESLint: **0 errors, 27 existing warnings** (`--fix-dry-run`).
- Production build: passed; fixture-backed SSR smoke passed eight routes.
- Product editor Playwright: **31 checks passed**, 5 intercepted fixture writes, no page/runtime errors. This covers add-layout widths 320/360/375/390/430/600/768/980/1024/1280/1440/1600/1920, real section navigation at mobile/desktop, invalid submission, revealing/focusing an invalid specification, draft creation, edit/save failure recovery, reload persistence in the fixture, alt text, generic variant options, edit/variant portal widths, focus trap, Escape, Arabic at 980px and a separate desktop-UA/touch-enabled Android desktop-site approximation.
- Before screenshots were built from the inspected main snapshot in a separate source directory; both before/after show expanded optional sections, using the same system-font test fixture.
- Cloudflare's branch preview initially failed after a successful build with authentication codes 10000/9109. The existing preview trigger referenced the invalid older build token. Its token reference was switched to the already-existing Workers Builds token in the same account. The subsequent Cloudflare preview build succeeded. No token secret was read and no account permissions were changed.
- GitHub frozen-lockfile Cloudflare build/workerd smoke and real isolated Auth/PostgREST/PostgreSQL commerce acceptance passed on the first implementation commit. Exact final-head checks remain the merge gate.

### Visual and interactive evidence

| View | Before | After |
| --- | --- | --- |
| Add Product, 390px | [Before](product-editor-evidence/before-add-390.png) | [After](product-editor-evidence/after-add-390.png) |
| Add Product, 1440px | [Before](product-editor-evidence/before-add-1440.png) | [After](product-editor-evidence/after-add-1440.png) |
| Variant editor | — | [390px](product-editor-evidence/after-variant-390.png), [1440px](product-editor-evidence/after-variant-1440.png) |
| Arabic desktop-site viewport | — | [980px](product-editor-evidence/after-edit-ar-980.png) |

[Executed browser matrix and fixture transport evidence](product-editor-evidence/browser-matrix.json).

### Changed files

Source: `ProductFormPage.tsx`, `AiAssistPanel.tsx`, `ProductVariantManager.tsx`, `ProductMediaManager.tsx`, `ProductSpecificationEditor.tsx`, `ProductCreatePreview.tsx`, new `ProductSearchPreview.tsx`, `catalog.ts`, `validation.ts`, new `variantOptions.ts` and `productSearchPreview.ts`, `uiTranslations.ts`, `workspace.css`, and `src/routes/__root.tsx` (single toast host).

Database: new additive `supabase/migrations/20261102002908_product_editor_owned_field_validation.sql`; no tables/columns/data are deleted, and prior migrations are unchanged.

Verification: four new regression suites (editor helpers/lifecycle, alt-text transport, PostgreSQL metadata ownership, full editor browser), existing stock SQL regression updated to the current specification document shape/new migration, expanded AI responsive/control regressions, browser helper and dashboard CI workflow, this report and its evidence, implementation plan.

Production migration application, merge SHA and deployment state are recorded separately after the final gate; they are not implied by the preview build.

- The product editor migration was applied successfully to the connected production project and its security-invoker/alt-text-preservation properties were re-read. No product rows were edited during installation.
- Explicit AI retry/cancel browser checks passed; the full dashboard professional workflow suite passed with no page errors.
- Screenshot: [Arabic AI dialog, 390px, dark mode](product-editor-evidence/ai-after-ar-390.png).
