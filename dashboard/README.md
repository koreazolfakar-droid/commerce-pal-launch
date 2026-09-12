# Space Call Admin Dashboard

Standalone React/Vite admin console for Space Call. It is intentionally separated from the storefront UI and communicates with the store server only through authenticated `/api/admin/*` endpoints.

## Local development

1. Copy `.env.example` to `.env`.
2. Set `VITE_SPACE_CALL_API_URL` to the storefront server URL.
3. In the storefront environment configure:
   - `SHOPIFY_ADMIN_API_TOKEN`
   - `SHOPIFY_ADMIN_API_VERSION`
   - `ADMIN_DASHBOARD_ORIGIN=http://localhost:5174`
   - `ADMIN_DASHBOARD_API_KEY=<strong random secret>`
4. Install and run the dashboard:

```bash
npm install
npm run dev
```

Open `http://localhost:5174` and enter the same `ADMIN_DASHBOARD_API_KEY` in the login screen. The key is stored only in `sessionStorage` for the current browser session; it is never compiled into the dashboard bundle.

## Production deployment

Deploy this directory independently from the storefront, for example at `https://admin.spacecallapp.store`. Then set the storefront's `ADMIN_DASHBOARD_ORIGIN` to that exact origin. Keep `SHOPIFY_ADMIN_API_TOKEN` and `ADMIN_DASHBOARD_API_KEY` server-only.

## Current API modules

- `GET /api/admin/health` — verifies authentication and server configuration.
- `GET /api/admin/products` — reads real Shopify Admin product and inventory data.

Orders, inventory mutations, customers, analytics, and product editing are intentionally left as the next modules. Write endpoints should remain behind the same authentication layer and should be enabled only with the minimum required Shopify Admin scopes.
