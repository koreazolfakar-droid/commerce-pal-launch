# Space Call — Add Product / Phase 1 implementation

Base revision inspected: `1706b854e6679f62f8752818300562c3ab37b38f` (`main`, 2026-11-01).

## Existing capabilities verified in source

| Capability | Existing implementation and disposition |
| --- | --- |
| Product create/edit | `src/dashboard/pages/ProductFormPage.tsx`; reused the existing `ProductDraft` state and `getDashboardProduct` load path |
| Product persistence | `saveDashboardProduct` in `src/dashboard/data/catalog.ts` calls `save_store_product_editor`; retained, including auth, stock snapshot, collections and cache refresh |
| Permissions | `requireDashboardRole` / database `private.is_dashboard_staff()` and RLS; unchanged |
| Media | `ProductMediaManager` and existing Supabase media RPCs, WebP pipeline and storage; reused |
| Variants | `ProductVariantManager` and variant RPCs; reused, without changing ledger/stock ownership |
| Catalog relationships | Brands, categories, specifications and collection IDs; existing selection/persistence unchanged |
| Visibility | Public product queries filter active products; unchanged |
| AI | `AiAssistPanel` with `hasFieldChanged` conflict guard; unchanged |
| Unsaved changes | `useDashboardUnsavedChanges` and dashboard history/unload navigation guard; reused |
| Delivery | Delivery fee exists at store level in Settings; **not** a product-specific field |

## Implemented changes

- Dedicated main content stack: general information, actual media manager, collections/organization, variant editor, specifications and SEO.
- Dedicated right stack: publishing status, pricing, inventory identifiers/stock, shipping settings link, product record and new-product preview.
- Nine section navigation destinations with scroll/focus and collapsed details expansion; uses existing `ProductFormMap`.
- Explicit Save as Draft / Publish Product actions on **both** create and edit, plus compact More Actions for duplicate/archive/delete/navigation.
- Publication and saved-status state change only after the real Supabase RPC confirms persistence. Existing one-shot save lock prevents duplicate submissions.
- Loading failure has an explicit retry control; missing product remains a distinct state.
- New-product image order can be changed before upload; the first image remains primary.
- Partially-created drafts retain the saved product ID and completed image set in the mounted editor. Retrying updates that draft and skips previously uploaded files instead of silently making another product. Failed operations keep staged file objects on-screen.
- Scoped responsive CSS, accessible focus states, compact details menu, single-column tablet/mobile layout and horizontally-scrollable section navigation. Mobile action footer stays sticky above the existing dashboard bottom navigation with extra scroll clearance.
- **No schema migrations, new AI providers, paid dependencies or changes to deployment or production data.**

## Backend rules / limitations (not disguised as completed features)

1. The **existing** `save_store_product_editor` PostgreSQL function requires a nonblank title and price greater than zero for *every* saved product, including Draft. Truly incomplete empty drafts require an approved backend rule/schema change and are not supported by this phase; the UI continues to validate honestly.
2. Shipping is currently store-wide and is managed via dashboard Settings. No per-product shipping field exists in the inspected product RPC.
3. Scheduled product publication has no corresponding contract and is intentionally not displayed.
4. During a failed multi-step new-product save, media/variant setup is not one SQL transaction; the retry path retains draft ID and completed upload tracking in the current mounted editor. Reloading after a failed upload requires opening the saved draft and using the existing media manager.
5. Phase 1 preserves the existing media and variant managers' independent local editing state and database RPC contracts. Combining their immediate DB writes into a single top-level form transaction would require a new backend contract and was intentionally avoided.
6. The exact approved image reference was not available as an attached file in this run; this implementation follows the section and layout specification from the brief. A visual overlay review against that mockup remains necessary.

## QA matrix and verification required before merge

| Check | Coverage / next verification |
| --- | --- |
| Save draft / publish / edit and failure | Added `e2e/dashboard-product-editor-phase1.test.mjs` plus existing product editor tests; repeat against staging Supabase with admin MFA |
| Media persistence | Existing media manager tests + new contract test; upload/reorder/primary test on staging |
| Variants and stock | Existing variant/editor stock concurrency tests and real RPC retained; confirm with multi-variant stock history on staging |
| Storefront visibility/SEO/cache | Existing `product-add-edit-supabase` and SEO tests; verify page/list/search/collection brand/category visibility after staging publish |
| AI conflict guard | Existing `AiAssistPanel` guard checked; manual-write-versus-response test to be verified in browser |
| Responsive visual/a11y | Verify browser at widths 360, 390, 768, 1024, 1280, 1440. Focus, drawer, media and variant dialogs require actual device/browser verification |
| CI | Run `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm build` and staging/browser suites before marking PR ready. The automated Cloudflare staging check stopped **before initialization** with zero build logs on this branch; other feature branches had the same instant failure. It provides no code-build result. |

**Deployment policy:** This branch is PR-only. Do not merge or publish before the user's approval.
