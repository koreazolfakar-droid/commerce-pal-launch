# Space Call Admin Dashboard

Standalone React/Vite admin console for Space Call. It is intentionally separated from the storefront UI and communicates with the store server only through authenticated `/api/admin/*` endpoints.

The dashboard is **live-data only**. It does not fall back to demo products, orders, customers, revenue, or inventory.

## Shopify access

Recommended setup for a Dev Dashboard app acting on your own store:

- `SHOPIFY_ADMIN_CLIENT_ID`
- `SHOPIFY_ADMIN_CLIENT_SECRET`
- `SHOPIFY_ADMIN_API_VERSION=2026-07`

The server exchanges the client credentials for a short-lived Shopify Admin access token and caches it until shortly before expiry. The client secret and generated access token stay server-only.

For an existing legacy/admin-created custom app, `SHOPIFY_ADMIN_API_TOKEN` remains supported as a fallback and takes precedence when configured.

Minimum read scopes for the current dashboard should include the resources it displays, including products/inventory, orders, and customers. Add write scopes only when the corresponding Phase 2 mutation is implemented.

## Local development

1. Copy `dashboard/.env.example` to `dashboard/.env`.
2. Set `VITE_SPACE_CALL_API_URL` to the storefront server URL.
3. In the storefront server environment configure:
   - `SHOPIFY_ADMIN_CLIENT_ID`
   - `SHOPIFY_ADMIN_CLIENT_SECRET`
   - `SHOPIFY_ADMIN_API_VERSION=2026-07`
   - `ADMIN_DASHBOARD_ORIGIN=http://localhost:5174`
   - `ADMIN_DASHBOARD_API_KEY=<strong random secret>`
4. Install and run the dashboard:

```bash
npm install
npm run dev
```

Open `http://localhost:5174` and enter the same `ADMIN_DASHBOARD_API_KEY` in the login screen. The dashboard key is stored only in `sessionStorage` for the current browser session; Shopify credentials are never compiled into the dashboard bundle.

## Production deployment

Deploy `dashboard/` independently from the storefront, ideally at `https://admin.spacecallapp.store`. Set the storefront server's `ADMIN_DASHBOARD_ORIGIN` to that exact origin and keep all Shopify credentials plus `ADMIN_DASHBOARD_API_KEY` server-only.

## Current live API modules

- `GET /api/admin/health` — verifies dashboard authentication and server configuration.
- `GET /api/admin/products` — reads live Shopify products, variants, prices, and inventory.
- `GET /api/admin/orders` — reads live recent Shopify orders and normalizes fulfillment state for the dashboard.
- `GET /api/admin/customers` — reads live Shopify customer totals, order count, last-order date, and CRM segment.

The Overview chart and KPIs are calculated from the live API responses. No fake sales or CRM records are used.

## Next modules

Product create/edit, inventory receiving and stock movements, suppliers and purchase orders, richer order details/actions, analytics pagination, users/roles, and audit logs. Write endpoints must stay behind the same authentication layer and use the minimum required Shopify scopes.
