# Space Cell Shopify Merchandising & Shopping UX

## Goal

Upgrade the existing storefront without removing any current section, route, product data, filtering behavior, cart flow, or Shopify integration. The work will reuse the current design system and live Shopify catalogue only.

## Implementation

### 1. Shopify-managed hero slider

- Use a dedicated Shopify automated/manual collection named **Homepage Hero** with handle `homepage-hero` as the merchant-controlled source of hero products and ordering.
- Add a query option for that collection and use its products when available; if it is absent or empty, gracefully fall back to the existing real Shopify best sellers/in-stock products so the page never breaks and no mock slide appears.
- Refine the current dark hero into a spacious split layout with real product title, vendor/type, image, current/compare-at pricing, discount, and feature highlights derived only from tags/options.
- Add previous/next arrows, accessible dots, touch swipe, smooth transitions, gentle autoplay, pause on hover/focus, and reduced-motion support. Every slide image and CTA links to its product page.

### 2. Premium Shop by Category

- Match each dynamic catalogue category to a Shopify collection by normalized title/handle.
- Use the matching collection image first, then a real representative product image from that category; retain the existing line icon only when Shopify provides no usable image.
- Keep live taxonomy names/counts and existing category links. Restyle the cards as clean white/dark-aware tiles with fixed circular media areas, `object-contain`, responsive sizing, lazy loading, and an elegant View all action.

### 3. Central WhatsApp ordering

- Add one central commerce-contact setting for `96181813805` and helpers that build official `wa.me` URLs safely.
- Add a premium “Order via WhatsApp” action beside the product purchase controls and in the mobile sticky purchase bar.
- Generate the message at click time from the real product title, current product URL, quantity, and selected Shopify variant options (color/capacity/etc.).
- Add one restrained global floating WhatsApp contact action that does not overlap the existing bottom navigation or mobile purchase bar.

### 4. Phone comparison

- Add a small persisted comparison store capped at four products, with duplicate prevention and clear feedback. Comparison controls appear only for products classified as smartphones by the existing strict taxonomy.
- Add Compare controls to normal/compact product cards and the product page without disturbing cart or wishlist actions.
- Create `/compare` with route-specific metadata, an empty state, removal controls, clear-all, copy/share URL, and a responsive horizontal comparison table.
- Populate image, name, price, availability, rating only if real data exists, and grouped specifications extracted from the existing Shopify description/variant parser. Missing values render as `—`; no specifications are invented.
- Support 2–4 selected phones and restore a shared comparison from URL handles when possible.

### 5. Product page and global polish

- Preserve the current gallery, variant-to-image sync, quantity, cart/checkout, wishlist, description tabs, grouped specifications, assurances, and Shopify recommendations.
- Tighten spacing, hierarchy, controls, mobile tab behavior, and dark-mode surfaces only where needed for the new actions.
- Add a Compare destination to appropriate navigation surfaces while preserving all existing navigation, search, cart, and account behavior.

## Technical details

- No new dependencies and no backend/database changes.
- Shopify remains authoritative for products, variants, prices, stock, images, collections, recommendations, and merchandising order.
- Existing Storefront query sanitization and checkout flow remain unchanged except for adding the new collection query usage.
- New focused modules: centralized WhatsApp helper, comparison store/UI, `/compare` route, and reusable compare/WhatsApp controls.
- Existing files updated only where needed: Shopify queries, homepage, hero, product cards, product page, shared layout/navigation, and semantic theme tokens/styles.

## Shopify Admin setup

Create a collection named **Homepage Hero** with handle `homepage-hero`, publish it to the Online Store channel, add the desired products, and arrange their order. The storefront will consume it automatically; until then it uses only real Shopify products as a safe fallback.

For premium category artwork, assign an image to each published category collection. When no collection image exists, the storefront uses a real product image from that category rather than fabricated artwork.

## Validation

- Run TypeScript checks and targeted tests.
- Verify homepage, product page, cart actions, WhatsApp message composition, comparison add/remove/share, and `/compare` on desktop and mobile.
- Confirm no horizontal overflow, no broken dark-mode surfaces, no console/runtime errors, and no regression to strict category filtering.