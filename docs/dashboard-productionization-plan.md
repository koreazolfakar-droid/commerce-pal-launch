# Space Call Dashboard Productionization Plan

Branch: `feature/dashboard-productionization`

## Engineering rules

- Never delete or disable an existing working feature to make a migration easier.
- Migrate one bounded module at a time.
- Use Supabase as the primary source of truth for dashboard/store data.
- Keep production-safe fallbacks only where they are intentionally required.
- No fake business metrics in production dashboard pages.
- Every migrated module must have a regression guard/test.
- Do not merge to `main` until the changed module is verified.

## Phases

1. **Dashboard Home**
   - Replace mock KPIs, date labels, charts and top-product/brand data with Supabase-backed data.
   - Show truthful empty/zero states when no orders/customers exist.
   - Preserve current visual layout.

2. **Orders**
   - Connect list/detail/status/fulfillment actions to `store_orders` and `store_order_items`.
   - Remove mock order data from active routes.

3. **Customers**
   - Connect customer CRM to `store_customers`.
   - Replace fake lifetime/order metrics.

4. **Collections**
   - Build full collection CRUD and product membership management.

5. **Homepage/CMS**
   - Move Homepage Builder from localStorage/mock data to `cms_sections`, `cms_hero_slides`, navigation and settings.
   - Connect storefront CMS reads only after admin write path is verified.

6. **Media**
   - Add Supabase Storage-backed media library.
   - Migrate Shopify CDN assets before removing Shopify dependence.

7. **Product editor**
   - Add multi-variant editor, image gallery/upload/remove/reorder, collection membership editor, product archive/delete workflow, richer validation, specifications, cost/margin.

8. **Settings / SEO / Navigation**
   - Connect existing CMS tables and remove misleading placeholder integration states.

9. **Users / Activity / Security**
   - Connect user roles and audit logs.
   - Add password/MFA/session controls where supported.
   - Tighten editor/admin permissions.

10. **Analytics / performance / tests**
   - Replace remaining mock analytics.
   - Paginate large catalog queries.
   - Fix stale Shopify-only tests and restore reliable CI coverage.

## Current checkpoint

Products, Brands, Categories, Inventory and dashboard authentication use Supabase.

Completed on this branch:
- Phase 1: Dashboard Home now uses truthful Supabase metrics and empty states.
- Phase 2: Orders list/detail/status/payment management now use Supabase. Order cancellation restores tracked stock atomically and logs a release movement.
- Phase 3: Customers CRM now uses Supabase with search, filtering, profile editing, tags, VIP/block flags, internal notes, customer creation and order history. Staff-managed profile fields are protected from being overwritten by future order syncs.
- Phase 4: Collections now use Supabase with full create/edit/delete, active/draft/featured state, SEO metadata, collection ordering, product membership management and product ordering.
- Phase 5A: Hero CMS now uses Supabase with dedicated dashboard management, desktop/mobile uploads to Storage, bilingual content, CTA targeting, scheduling, ordering, preview, media library integration, audit logging and CMS-first storefront rendering with safe legacy fallback.

Next planned phase:
- Phase 5B: Homepage sections and navigation.
