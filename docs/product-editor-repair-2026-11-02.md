# Space Call product editor repair and Shopify comparison

Base: `78520d32318f673eba007e45c82ee1329473550a` (main, PR #473 included). Scope: Add/Edit Product; existing staff authorization, inventory accounting and storefront routes retained.

## Audited implementation and data flow

`ProductFormPage` loads `getDashboardProduct`, brands, categories, collections and role. Product saves validate the draft, call the staff-authorized PostgreSQL editor transaction, invalidate the native catalog and broadcast storefront refresh. New media/variant setup first creates a hidden Draft; publication follows successful setup. Existing media and variants save through their independent operations. AI applies reviewed suggestions to local state; it does not save or publish.

The new `save_store_product_editor_details(jsonb,jsonb)` wrapper invokes the existing stock-aware editor signature in the same SQL transaction, then writes the existing organization/translation columns. It uses `SECURITY INVOKER`, the existing staff predicate and table RLS, revokes public/anonymous execution and grants authenticated execution. No tables, policies, records or prior migrations are removed.

| Editor field | Existing storage / public consumer |
| --- | --- |
| Title / description | `store_products.title`, `description`; native catalog and product detail |
| Arabic title / description | `title_ar`, `description_ar`; existing language-aware storefront rendering |
| Imported HTML description | `description_html`; preserved when plain description is unchanged; cleared on a real plain-description edit so old HTML cannot mask it |
| Brand / category | `brand_id` → `cms_brands`; `category_id` → `store_categories` |
| Product type / tags | `product_type`, `tags`; existing native product type and search matching |
| Status | `status`, `published_at`; public product queries require `active` |
| Price / compare-at | default variant `price`, `compare_at_price`; product summaries maintained by existing logic |
| SKU / barcode | default variant identifiers; multi-variant identifiers remain independently managed |
| Stock | variant `stock_quantity`; existing expected-stock check and movement ledger; multi-variant summary protected |
| Cost | existing `average_cost`; shown read-only for a single-variant product, with gross profit/margin estimates; procurement owns writes |
| Currency | existing editor contract uses USD; no currency or tax accounting change |
| Images | `store_product_images`, `cms-media` storage, thumbnail and WebP pipeline |
| Image alternative text | `store_product_images.alt_text`; staff-authorized, image-and-product-scoped update |
| Variants | `store_product_variants`, including options JSON, price, stock, image, tracking/backorder and active state |
| Collections | `store_collection_products`; synchronized by the existing transaction |
| Specifications | category `spec_template` and product `{values,keySpecs}` document; existing typed validators and storefront grouping |
| SEO | `seo_title`, `seo_description`, permanent `handle`; existing canonical/structured-data route behavior |
| Shipping | existing store-wide settings and checkout delivery rules; no independent product shipping/tax fields |

Inspected all form panels, expanded collections/specification/SEO content, variant/media managers, color picker, preview, publishing controls, More Actions/confirmation dialogs, AI portal/client, validation, catalog transport, relevant SQL/RLS, native public queries, cart/search product types, design tokens and recent PRs #467–#473. Inspection alone is not labeled as browser or live-persistence evidence.

## Defects repaired

1. At 1280px the integrated sidebar and two-column editor reduced price inputs to about 137px. Pricing/inventory now choose columns from their actual panel width; minimum usable field width is covered by browser geometry assertions.
2. Small image controls and inconsistent labels: scoped 44px panel controls, readable labels, resizeable descriptions, explicit focus outlines; no dashboard-wide grid changes.
3. A core save carrying a stale image URL could undo a completed primary-image deletion/replacement. Existing-product media is now excluded from core writes in the new wrapper, including requests from other sessions. Independent image operations remain authoritative.
4. Core saves overwrote custom image alternative text. Existing media metadata now stays outside core writes.
5. Plain description changes could remain invisible because old HTML took precedence on the storefront. Clear HTML only when normalized plain description changes; unrelated saves preserve it.
6. A successfully created partial Draft plus an unconvertible image could trap retry forever. Nonuploaded files can now be removed/replaced while the same Draft ID and successful upload set are retained.
7. Alternative-text responses discarded text typed after submission. Reconcile the saved snapshot without clearing newer edits.
8. Parent save actions could overlap independent media/variant mutations. Child busy states now disable top-level save actions until those operations finish.
9. Media fetch failures appeared as an empty gallery. Added an explicit error and Retry state.
10. Section overview omitted collections, organization and publishing destinations. All twelve actual destinations are now represented.
11. Save response reconciliation protects newer specification/status state. PR #473's explicit vertical portal flex override is retained unchanged.

## Added capabilities

- Product type and de-duplicated comma-separated tags, validated client/server and saved atomically.
- Arabic title and description editing connected to the existing public translations.
- Image alternative-text editor with immediate persistence, failure recovery and unsaved-change protection.
- Search-engine listing preview, character counts and permanent URL display.
- Private live card preview on Edit as well as Add, with current draft status.
- Read-only weighted cost, estimated gross profit and gross margin for applicable existing single-variant products.
- Portable production-artifact browser runner and additional behavioral/PostgreSQL/browser coverage.

## Official Shopify comparison

References reviewed 2026-11-02:

- https://help.shopify.com/en/manual/products/details/product-details-page
- https://help.shopify.com/en/manual/products/add-update-products
- https://help.shopify.com/en/manual/products/variants/edit-variants

Shopify is the functional benchmark; this is not a claim of complete Shopify parity.

| Capability | Shopify behavior | Space Call baseline | Gap | Implementation | Test / evidence |
| --- | --- | --- | --- | --- | --- |
| Title | Merchant title | Editable/persisted | None | Preserved | Draft validation, create/edit browser flow |
| Description | Rich-text editing | Plain text plus imported HTML | Rich-text toolbar absent | Fix stale HTML precedence; retain plain editor | PostgreSQL unchanged/changed HTML assertions |
| Product type | Separate type | Column existed; UI absent | Editor/persistence | Added atomic field | PostgreSQL + browser reload |
| Vendor/brand | Select vendor | Existing searchable brand selector/create | None | Preserved | Existing catalog tests; browser selection |
| Category | Taxonomy/category | Existing category/template selector | Different taxonomy | Preserved Space Call templates | Specification tests and browser selection |
| Collections | Multiple memberships | Existing multiple collections | None | Preserved; navigation destination added | Existing atomic membership tests |
| Tags | Searchable tags | Column/search existed; UI absent | Editor/persistence | Added normalization and bounds | PostgreSQL invalid-tag rollback and browser reload |
| Status | Draft/active/archive, other Shopify-specific states | Draft/Active/Archived | No Shopify Unlisted equivalent | Preserve supported statuses | Existing status/RLS tests; browser publish/cancel |
| Images | Multiple upload/delete | Existing gallery | None for image media | Preserved | Existing media/storage tests |
| Ordering | Drag/drop plus ordering | Keyboard-accessible move controls | Drag/drop absent | Preserve move controls | Existing reorder tests; not claimed as drag/drop |
| Cover image | Primary media | Existing primary control | None | Protect against stale core writes | Real PostgreSQL stale-URL reproduction/regression |
| Alternative text | Editable alt text | Read/display existed | Editor absent; core overwrote it | Added scoped update and draft protection | Failure/race unit tests + browser retry |
| Optimization | Process media | Existing WebP/thumbnail pipeline | None | Preserved | Existing image pipeline tests |
| Variant image | Per-variant media | Existing image picker/upload/clear | None | Preserved | Existing variant tests |
| Upload recovery | Progress and retry | Existing pipeline and partial Draft retry | Bad queued file could be trapped | Allow replacing nonuploaded files | Actual staging-function regression |
| Video / 3D | Supported media types | Image-only | Unsupported | Not added to image-only storage contract | Gap documented |
| Price / compare-at | Per-product/variant pricing | Existing fields and validation | None | Preserved | Existing price and stock tests |
| Cost / margin | Cost and profit display | Weighted cost in procurement | No editor display | Read-only cost/gross estimates | Schema mapping; UI uses actual cost, no cost writes |
| Currency | Shop currency/markets | USD editor | Multi-currency product editor absent | Preserve business contract | Existing checkout/pricing tests |
| Tax | Product tax settings | Existing store-level business rules | No per-product tax override | No unreviewed tax change | Gap documented |
| SKU / barcode | Per variant | Existing controls | None | Preserved | Existing variant/save tests |
| Quantity | Track/adjust inventory | Existing stock-aware transaction/ledger | None | Preserve expected-stock conflict guard | Real PostgreSQL conflict/rollback tests |
| Track quantity / backorder | Per-variant settings | Existing Variant Manager settings | Not top-level controls | Preserve independent policy | Existing variant tests |
| Locations / history | Multi-location stock/history | Existing inventory/receiving workflows | No Shopify multi-location editor | Preserve ledger/source of truth | Existing inventory/authorization tests |
| Colors / capacity | Product options | Existing color/storage editor | None for these options | Preserve canonical names/options | Browser new default-variant options |
| RAM / size / material | Arbitrary options/combinations | Existing JSON preserves arbitrary options; UI focuses color/storage | No generic combination generator | No unsupported bulk generator added | Gap documented; existing options preserved |
| Variant price / stock / availability | Independent per variant | Existing manager | None | Busy-state coordination with parent | Existing stock/variant tests |
| Physical/digital | Classification and fulfillment | Electronics store with store-wide delivery | Digital fulfillment absent | No fake physical/digital switch | Gap documented |
| Weight / dimensions | Product/variant shipping details | No shipping-weight contract | Unsupported | Keep real settings link | Existing delivery settings/checkout retained |
| SEO fields | Title/description/URL preview | Editable metadata; stable URL | Preview absent | Added preview/counts; keep handle stable | Browser SEO preview; existing canonical/schema tests |
| URL changes | Editable handle/redirects | Permanent handle | Redirect-safe handle editing absent | Keep existing links/orders safe | Existing handle-preservation tests |
| Bilingual content | Localization | Public Arabic fields existed | Merchant editor absent | Added Arabic editor | Atomic SQL and browser reload |
| Typed custom data | Metafields/category fields | Existing category specifications/groups/validation | No arbitrary metafield definition UI in product form | Preserve reusable category templates | Existing specification tests |
| Save/publish | Explicit save and visibility | Existing real save/publish | Races described above | Repair coordination/retry | Browser + PostgreSQL tests |
| Channels/scheduling | Channel availability/scheduling | Native storefront active status only | Additional channels/scheduling absent | No nonfunctional controls added | Gap documented |
| Preview | Preview current product | Add-only private preview + published link | Edit preview absent | Add private Edit preview | Browser visibility checks |
| Duplicate/archive/delete | Managed actions | Existing safe workflows | None | Preserved | Existing permission/history tests; browser cancellation |
| Unsaved navigation | Warn before discard | Existing navigation guard | Alt draft absent | Include alt drafts | Existing guard tests; snapshot race regression |
| AI assistance | Product assistance | Evidence/review/apply/manual save | Provider cannot browse all supplied URLs | Preserve provider, flag unsupported claims; validate real controls | 46-field browser workflow, cancellation, failures, RTL |

## Verification record

Baseline: 668/668 unit tests and TypeScript passed. Baseline screenshots/metrics captured from an isolated unmodified snapshot, widths 320/390/768/980/1280/1440/1920, with no page errors.

Actual RED→GREEN cases include missing organization RPC, custom-alt overwrite, stale-primary resurrection, newer alt edit loss, and trapped partial-create replacement. PostgreSQL tests execute real predecessor and new migrations in PGlite; authentication predicates are controlled test fixtures. They do not claim a live staff browser session or live provider inference.

The final executed commands, counts, browser outcomes and deployment state are recorded in the PR. Any unsuccessful/interrupted run is not a pass. Browser sessions intercept dashboard writes; no synthetic session is sent to production. Real-device keyboard, Android browser UI scaling, camera/file pickers and arbitrary third-party AI responses need device/staging verification beyond viewport simulation.

## Delivery gates and limitations

- Apply the additive migration before deploying code that calls the new RPC.
- Re-run required checks against the final commit; merge only with successful applicable gates.
- Drafts still require a title and positive price under the existing backend rules.
- Rich text, generic option combinations, video/3D, new sales channels, per-product shipping/tax and scheduling remain explicit gaps. They require separate business/storage/checkout contracts.
- New tag/translation limits use JavaScript UTF-16 lengths on the client and SQL character counts on the server; emoji-heavy values can be rejected conservatively by the client.
- Do not label the full user acceptance criteria complete unless all required browser/backend/deployment evidence is present.
