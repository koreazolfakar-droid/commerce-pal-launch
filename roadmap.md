# Space Cell — Redesign Roadmap

## Completed: premium reference redesign

1. [x] **BrandLogo system** — reusable `BrandLogo` component; normalized vendor/alias
   resolution (Xiaomi/MI, Redmi, POCO, Samsung, Apple, Lenovo, Anker, UGREEN,
   Baseus, Honor, Huawei, OPPO, vivo, OnePlus, Google, Sony, JBL, Bose,
   Logitech, ASUS, Acer, Dell, HP, Nokia, Motorola, Tecno, Infinix); crisp
   SVG/vector, premium rounded tiles, polished monogram fallback for unknown
   brands; used in Top Brands, product cards, filters, product page, search,
   nav. Lightweight assets only.
2. [x] **Category + option icons** — consistent thin line icons for All /
   Smartphones / Tablets / Laptops / Headphones / Chargers / Cables / Power
   Banks / Cases / Smartwatches / Audio / Deals; desktop horizontal category
   nav + category cards; mobile circular icon shortcuts in horizontal scroll.
3. [x] **Button/action icon audit** — Search, Add to cart, Shop now, View all,
   Wishlist, Bag, Account, Back, Filter, Sort, Close, Menu, Share, Compare,
   Checkout, Continue shopping; consistent sizing + accessible labels.
4. [x] **Hero redesign** — large rounded banner: uppercase brand label, big product
   title, feature bullets, price + compare-at + discount badge, premium CTA,
   large product image right, carousel dots; data-driven from real Shopify
   products; responsive + lazy imagery.
5. [x] **Homepage order** — utility bar → header + search → category nav → hero →
   trust strip → Shop by Category → Top Brands → Best Sellers → promo brand
   banners → Today's Deals → Why Shop With Space Cell → newsletter/footer;
   hide empty sections automatically.
6. [x] **Product cards** — reference-quality: clean image area, wishlist, brand
   logo, title, price/old price/discount/stock only when real, compact
   add-to-cart icon; data stays tied to the same Shopify product.
7. [x] **Filtering guard** — preserve strict category filtering; brand pages only
   that brand; search/filters must not leak unrelated products.
8. [x] **Mobile polish** — compact header, search, circular category shortcuts,
   hero, trust strip, sections, fixed bottom nav (Home/Search/Shop/Saved/Bag)
   with real actions.
9. [x] **Performance pass** — responsive images via `cdnImage`, lazy below fold,
   correct object-fit, reuse lucide icons (no new icon deps).
10. [x] **QA** — Playwright desktop + mobile: homepage and product-page rendering,
    product open, wishlist, add-to-cart, cart, nav, hero CTA, shortcuts,
    responsive layouts, Shopify-driven links, and console/runtime errors.

## Notes

- Taxonomy engine (`src/lib/taxonomy.ts`) already has strict tiered category
  matching + brand resolution — build BrandLogo on top of `resolveBrand` /
  `CatalogIndex.brands`; do not duplicate alias lists, extend `BRAND_KEYWORDS`
  (add Acer; verify Baseus/Infinix already present).
- No fake data anywhere: ratings/reviews/discounts/stock only when Shopify
  provides them.
- Keep Shopify layer (`src/lib/shopify.ts` sanitizeQuery/deniedFields) intact.

## Planned: Shopify merchandising, WhatsApp, and comparison

1. [ ] Shopify-managed multi-product hero with controls, swipe, pause, and real product data.
2. [ ] Premium category cards using Shopify collection/product imagery and live counts.
3. [ ] Central WhatsApp ordering configuration and product-aware messages.
4. [ ] Phone comparison store, controls, and responsive `/compare` page for 2–4 products.
5. [ ] Product-page and global polish without changing cart, filters, or Shopify ownership.
6. [ ] Desktop/mobile interaction QA plus TypeScript checks.
