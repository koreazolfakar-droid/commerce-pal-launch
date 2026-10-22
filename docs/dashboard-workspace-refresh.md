# Dashboard workspace refresh

The dashboard uses shared controls, readable form labels, theme-aware panels, and layouts that fit mobile, tablet and desktop widths. Styles are scoped to `.dashboard-theme-scope` so storefront layouts remain independent.

## Connected workflows

- Every registered section has contextual navigation and breadcrumbs. Detail pages link back to their list; receipt details keep Receiving selected in the sidebar.
- Orders link to their products and a customer search using the saved phone/email/name. Collections and inventory link to the product editor.
- Stock alerts open Inventory with the appropriate threshold. Related links connect purchasing, receiving, suppliers and inventory.
- Global search includes available dashboard sections as well as authenticated product results. The account menu and search support keyboard navigation and Escape.
- A section error leaves the shell usable and provides reload/back actions.

## Reports and product management

- Dashboard and Analytics support 7, 30 and 90 calendar-day windows through the existing aggregate RPC. Sales/orders follow the chosen period; catalog/inventory values remain current totals.
- Report and filtered-product exports download UTF-8 CSV files with formula protection for user-authored text.
- Product status values stay stable across language changes. Filters have labels and a reset action. Pagination limits rendered rows; selection applies to the visible page and reports selections retained across pages.
- Low stock includes 10 units, matching the dashboard's default threshold.

Campaigns, coupons, messages and reviews still require their operational integrations. Their pages clearly explain availability and link to existing sections.

## Verification

Run the normal typecheck, lint, unit and build commands. Browser checks use synthetic authentication and intercepted API responses; they never write to the live database.

With a dev server running on port 5173:

```sh
npm run test:dashboard:browser
```

Use `SPACE_CALL_DASHBOARD_ORIGIN` to target another local server. The browser suite covers every navigation route on mobile and Arabic dark tablet layouts, unsaved-change navigation, product filtering/pagination/selection/CSV export, report-period RPC arguments, search keyboard controls and route-error recovery.
