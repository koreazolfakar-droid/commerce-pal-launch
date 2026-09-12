# Space Call — Production Improvement Plan

## Goal
Turn Space Call into a fast, consistent, measurable, sales-ready and SEO-ready storefront.

**Execution order is mandatory:** Data Integrity → Conversion Tracking → Performance → UX → SEO → Visual Polish.

## Phase 1 — P0 Critical

### 1. Shopify ↔ Storefront integrity
- Shopify Storefront API is the single source of truth.
- Only products actually available to the Storefront sales channel may render.
- DRAFT/ARCHIVED/unpublished products must never appear in shop, search, category, brand, collection, recommendations or sitemap.
- Audit published collections and compare catalog counts across Shopify Admin, `/shop`, `/collections`, category and brand pages.
- Avoid stale catalog responses and provide an explicit invalidation strategy for product/inventory changes.

**Acceptance:** moving a product to Draft removes it from shop, search, category, brand and sitemap.

### 2. Centralized footer
- Resolve footer data once at root/layout level and reuse it everywhere.
- Prefer SSR-prefetched data.
- Do not let individual pages independently fetch footer brands.
- Provide a deterministic fallback of key brands when Shopify is temporarily unavailable.
- Footer must be identical on Home, Shop, Product, Category, Brand, Help, Collections, Compare and Wishlist.

### 3. Analytics funnel
Track consistently: `page_view`, `view_item`, `search`, `view_item_list`, `select_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `purchase`, `add_to_wishlist`, `compare_product`.

Integrate the storefront event layer with Shopify Analytics and GA4. Keep Search Console verification/SEO ownership configured separately.

**Acceptance funnel:** Sessions → Product Views → Add to Cart → Checkout → Purchase, with no checkout event appearing without the preceding cart path for normal storefront checkout.

## Phase 2 — P0 Performance

### 4. Real pagination
- Cursor pagination from Shopify.
- Initial product payload: 16–24 products; default target 24.
- Load More fetches the next cursor page rather than preloading the full catalog.

### 5. Images
- Prefer Shopify CDN transforms and AVIF/WebP-capable delivery.
- Responsive `srcset`/`sizes`, fixed dimensions/aspect ratios and lazy loading below the fold.
- Only critical first-view imagery is eager/high priority.
- Hero image is responsive and preloaded only when it is the actual LCP candidate.
- Optimize category assets and keep dimensions consistent.

### 6. JavaScript budget
Code-split non-critical features including AI Assistant, Compare, Wishlist, recommendations and secondary search/filter UI where appropriate. Heavy AI code must not be part of the initial storefront bundle.

## Phase 3 — P1 Filters

### 7. Contextual filters
Generate available brand/category/collection facets from the current result set/page context only. Apple must not offer Samsung/Xiaomi or unrelated laptop collections; smartphone pages must not expose laptop-only facets.

### 8. Contextual price range
Price bounds must derive from the current filtered result set, not the global catalog. Example: an Apple page may show `$299–$1,499`, never a global `$11–$1,800` range when `$11` is unrelated.

## Phase 4 — P1 Homepage
- Hero: featured product, clean image, title, short copy, price/offer and direct product CTA.
- Categories: Phones, Tablets, Laptops, Smart Watches, Audio, Chargers, Power Banks, Accessories. Horizontal scroll on mobile; grid on desktop.
- Brands: Apple, Samsung, Xiaomi, POCO, Anker, UGREEN, Lenovo, Huawei, OnePlus, Tecno + View all brands.
- Best Sellers: 6–8 real products.
- New Arrivals: latest Shopify products.
- Today's Deals: real discounted/deal products, replacing static promo text.

## Phase 5 — P1 Product page
- Large primary gallery, thumbnails, variant/color image synchronization, mobile swipe, zoom and no layout shift.
- Information hierarchy: Brand → Product name → Rating → Price/compare-at/discount → Stock → Color/Storage → Quantity → Add to Cart → Buy Now → WhatsApp.
- Structured specs: Display, Processor, Camera, Battery, Charging, Storage, Connectivity, Dimensions, Warranty.
- Related products ranking: same category + similar price + same brand, not vendor-only.

## Phase 6 — P1 SEO
- Product title: `{Product} Price in Lebanon | Space Call`.
- Category title: `{Category} in Lebanon | Space Call`.
- Brand title: `{Brand} Products in Lebanon | Space Call`.
- Unique, product-aware meta descriptions.
- Preserve Product, BreadcrumbList and ItemList structured data; include Offer and only include AggregateRating/Review when real review data exists.
- Sitemap includes storefront-visible products and real/published categories, brands and collections only.
- `noindex` for cart, wishlist, compare, account and internal search result URLs as appropriate.

## Phase 7 — P1 Search
Search title, vendor, SKU, category/product type and tags with autocomplete. Suggestions must link to real storefront-visible products.

## Phase 8 — P1 Conversion UX
- Trust signals near purchase CTA: Original products, Warranty, Fast delivery in Lebanon, Secure Shopify checkout.
- Mobile sticky purchase bar with price + Add to Cart.
- WhatsApp product message includes product, selected storage/color, price and canonical product URL.

## Phase 9 — P2 Visual polish
Only after functional/performance work.
- Radius tokens: 12 / 16 / 24.
- Spacing tokens: 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Main container max-width: 1280px.
- Normalize product-card image/title/price/badge heights and spacing.
- Brand logos use local assets or Shopify CDN, white background, `object-fit: contain`, consistent padding; initials are only a true missing-asset fallback.

## Phase 10 — QA
Desktop: Chrome, Edge, Firefox, Safari. Mobile: Android Chrome, Samsung Internet, iPhone Safari. Validate widths 360, 390, 430, 768, 1024, 1440, 1920.

### Targets
- Lighthouse Performance 90+
- Accessibility 95+
- Best Practices 95+
- SEO 95+
- LCP < 2.5s
- INP < 200ms
- CLS < 0.1

## Required implementation sequence
1. Shopify ↔ Storefront sync
2. Footer
3. Analytics
4. Pagination
5. Images
6. Contextual filters
7. Price filters
8. Homepage merchandising
9. Product page
10. Search
11. SEO
12. Mobile conversion UX
13. Visual polish
14. Final QA

## Delivery policy
Implement in small reviewable commits/PRs. Preserve existing working cart, filters, search, account and checkout behavior. Add regression tests for every P0 invariant before visual refactoring. Do not claim a target score until it is measured on the deployed production build.