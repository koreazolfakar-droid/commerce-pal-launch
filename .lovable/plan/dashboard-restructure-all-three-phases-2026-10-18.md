# Dashboard restructure — all three phases

Keep every existing page, route, and data flow. Change only organization, layout, and presentation.

## Phase 1 — Clearer side menu
Regroup the current 8 sections into 4:
- **Daily operations**: Dashboard, Orders, Customers, Inventory, Receiving, Purchase Orders, Suppliers
- **Catalog**: Add New Product, Products, Brands, Collections, Categories
- **Storefront & marketing**: Homepage, Hero banners, Navigation, Media library, Promotions, Campaigns, Coupons, SEO, Reviews, Messages
- **Insights & settings**: Analytics, Sales, Procurement, Users, Activity logs, Security, Settings

Also: sections can collapse (choice remembered), Arabic labels for section names, and a mobile bottom bar with Home / Orders / Products / Add / Menu.

## Phase 2 — Same layout on every list page
One shared page header (title, description, main action button always in the same top-right spot) and one shared toolbar (search, filters, sort, item count). Apply to Products, Orders, Customers, Brands, Collections, Categories, Inventory. On mobile, the main action becomes a fixed floating button. Consistent empty, loading, and error states.

## Phase 3 — Smarter Overview page
Add to the top of the Dashboard home:
- Quick actions: Add product, New order view, Receive stock, Edit homepage
- "Needs attention": pending orders, low-stock and out-of-stock items (each links to the filtered list)
- Keep existing real stats and charts below. No invented numbers.

## Technical details
- Menu: change `SECTION_ORDER` and each route's `navigation.section/order` in `src/dashboard/config/routes.tsx`; collapse state in `preferenceStorage`; translations in `uiTranslations.ts`; bottom bar in `App.tsx`.
- New shared components `components/layout/PageHeader.tsx` and `ListToolbar.tsx`, adopted page by page without touching data functions.
- Overview uses existing `loadDashboardHomeSnapshot` data plus a pending-orders count.
- Update e2e dashboard route/navigation tests; run dashboard tests and check mobile (384px) and desktop screenshots.
- No database or security changes; not published until reviewed.
