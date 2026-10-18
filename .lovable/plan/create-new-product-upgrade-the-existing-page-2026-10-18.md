# Create New Product — upgrade the existing page

## What exists today (verified)
- A product create/edit page already exists at `/dashboard/products/new` (ProductFormPage), with media manager, variant manager, specification editor, unsaved-changes guard, Sonner toasts and AI assist.
- Saving uses the existing database function `save_store_product_editor` (atomic save, specs, stock concurrency migrations already in place).
- Images go to the existing `cms-media` bucket via existing upload helpers, with WebP conversion and thumbnails.
- Brands, categories, collections load from real database tables; collection links use `set_store_product_collections`.
- Storefront refresh helpers `invalidateNativeStoreCache()` and `broadcastStorefrontRefresh()` exist and are already called after saves.

We build on all of this. No second product system, no new bucket, no new spec schema.

## What changes for you
1. **Menu**: a clear "+ إضافة منتج جديد / Add New Product" item at the top of the dashboard menu (PackagePlus icon).
2. **Page layout (create mode only; edit mode unchanged)**:
   - Header: Back to Products, title, Draft badge, "Save as Draft", "Publish".
   - Desktop: main form left, side panel right (status, brand, category, collections, live preview card).
   - Mobile: one column, sticky bottom bar with Save Draft / Publish.
3. **Sections**: Basic info (name, description, auto handle) → Price & stock (price, compare-at, stock, auto SKU) → Images (multi upload, drag-drop, camera, reorder, primary, retry) → Specifications (existing editor by category) → SEO & advanced (collapsed by default).
4. **Relationships**: searchable brand, category and multi-collection pickers using real data; inline "create brand" / "create collection" for admins using existing functions.
5. **Live preview**: the real storefront product card rendered with the form values, labeled "Unpublished".
6. **After success**: "View product" and "Add another product" actions; form reset only on explicit choice.
7. Full Arabic/English labels and errors.

## Images before the product exists
New products have no ID until first save. Flow: on first image added, auto-save a draft (validated minimal fields) to get an ID, then upload with the existing pipeline (1600px WebP ~85%, 400px thumb). Failed DB steps clean up uploaded objects. Publishing is blocked while uploads are pending/failed.

## Security work
- Audit (read-only) of RLS on products, variants, images, brands, categories, collections and `cms-media` storage policies, and EXECUTE grants on the save/collection/media functions.
- If gaps are found: small additive migration only (e.g. server-side checks for price ≥ 0, compare-at ≥ price, stock integer ≥ 0, handle format, allowed status, valid brand/category/collection IDs, idempotency key to stop double submits). No policies weakened, no data touched.
- Description sanitized with the already-installed sanitize-html.
- Publish allowed only for roles that may publish (admin/editor per existing rules — confirmed during audit).

## Tests
- Extend existing `e2e/*.test.mjs` source-contract tests: sidebar entry, create route, use of save RPC, cache refresh calls, sanitization, idempotency.
- Database-level checks run read-only against policies and function grants (anonymous / non-staff rejection, invalid IDs/prices rejected).
- Playwright check of the page at mobile (384px) and desktop, Arabic and English.
- Run tsgo, ESLint, existing test suite, security scan.

## Honest limits
- No staff account exists yet in the database, so a full signed-in end-to-end "create and publish" run cannot be done until you sign up at /dashboard and receive the admin role. I will report it as unverified otherwise.
- Shopify is disconnected; products are stored in the site's own database only.
- I won't publish to production; you decide when.

## Technical details
- Files: `src/dashboard/config/routes.tsx` (nav entry), `src/dashboard/pages/ProductFormPage.tsx` (create-mode layout; reuse existing state/save), new small components under `src/dashboard/components/products/` (`ProductCreateHeader`, `RelationshipPicker`, `ProductCardPreview`, `StickyActionBar`), `src/dashboard/uiTranslations.ts`, `src/dashboard/data/catalog.ts` (idempotency key + draft-first image flow only if needed), optional migration for server-side validation/idempotency.
- Order: audit → nav + layout → pickers → images → persistence/idempotency → preview → tests → diff review.
