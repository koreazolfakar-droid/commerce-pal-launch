# Space Call storefront hardening

## Implemented

- Centralized all public store settings in `src/lib/storeConfig.ts`:
  store name, public URL, Shopify permanent domain, Storefront API version, account URL and WhatsApp number.
- Replaced the customer-facing `Space Cell` identity with the configurable `Space Call` identity.
- Upgraded the default Storefront API version from `2025-07` to `2026-07`.
- Split Storefront GraphQL documents into `src/lib/shopifyDocuments.ts`:
  lightweight card/list fields and rich single-product fields.
- Removed `first: 250` product image, variant and collection requests.
- Bounded discovery to 60 products, collections to 50, collection pages to 48,
  sitemap discovery to 100, images to 2 for cards / 20 for details and variants
  to 20 for cards / 100 for details.
- Added a bounded two-minute server response cache for read-only Shopify queries.
  Cart queries and every mutation always bypass the cache.
- Product pages now fetch a single product, Shopify recommendations and a
  bounded vendor query. They no longer load the discovery catalog.
- Wishlist, Compare and AI recommendations request only their saved handles.
- Shopify Cart responses now rebuild local cart state after create, add,
  update, remove and sync operations. Prices, selected variant availability,
  quantities, checkout URL, subtotal and total come back from Shopify.
- Added CSP, HSTS and Cross-Origin-Opener-Policy while retaining the existing
  content-type, referrer, permissions and frame protections.
- Moved additional visible cart and product-card text into the English/Arabic
  translation dictionary.
- Preserved the existing homepage, mobile product cards, wishlist, compare,
  search, AI, SSR and Shopify checkout architecture.

## Operational notes

- Configure deployment values using `.env.example`; keep Storefront and AI keys
  server-only and never prefix secrets with `VITE_`.
- The discovery index is deliberately bounded. A very large catalog should add
  cursor-based “Load more” UI and Shopify-native filter inputs instead of
  increasing the initial limit.
- CSP uses a per-request SSR nonce for executable script elements and no longer
  permits `'unsafe-inline'` in `script-src`. TanStack hydration plus the
  theme/language/font bootstrap scripts are nonce-bound. Inline style attributes
  remain allowed for component compatibility.
- Shopify policy and product copy is rendered in the language supplied by the
  merchant. It is not machine-translated by the storefront.

## Verification

- TypeScript: pass
- Production build: pass
- ESLint: zero errors (nine existing Fast Refresh warnings)
- Unit/architecture tests: 29/29 pass
- SSR smoke: 11 routes pass
- Playwright: 50 tests discovered, including 360/390/430px English and Arabic
  list-card coverage. Browser execution remains dependent on an environment
  where Chromium preview traffic is allowed.
