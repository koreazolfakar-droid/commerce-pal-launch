# Space Cell — Roadmap

## In progress: full storefront audit & upgrade (Shopify-managed content, UX, security)

### Audit findings (verified against the live store, 88 products, 4 collections)
- Brand logos invisible after SSR: `BrandLogo` only revealed the image on `onLoad`,
  which never fires for images already complete at hydration → monograms shown
  everywhere. Fixed with a post-mount `complete/naturalWidth` check.
- Third-party favicon fallbacks (duckduckgo/google) produced 404 noise and
  low-quality logos → removed; Shopify collection image → Simple Icons → monogram.
- `buildShopifyBrands` renamed "Apple" to "Apple iPhone" on fuzzy collection
  matches → label now overrides only on exact key match.
- Checkout `window.open` without `noopener` (CartDrawer, /cart) → fixed.
- Dead/misleading links: Account → /wishlist, Track order → /cart, Help/Support →
  /collections. Shopify customer accounts are live at
  `https://dj6qeq-j9.myshopify.com/account` (orders + tracking) → wired.
- Newsletter forms (homepage + footer) show success but store nothing;
  `customerCreate` is ACCESS_DENIED for this token and the online store's
  /contact form is password/captcha protected → must be replaced (see item 6).
- Footer payment badges are invented; Shopify `shop.paymentSettings` returns no
  card brands yet → render only what Shopify returns.
- Footer Support/Company items are plain text, social icons are non-links.
- `homepage-hero` collection does not exist yet (hero uses deal/in-stock fallback).
- Store data available via Storefront API: shop name/description/brand, policies
  (privacy only so far), paymentSettings, collection metafields
  (`custom.sort_order` readable). NOT available: pages, blogs, menus, metaobjects.
- Dead code: `Hero.tsx`, `BrandBanners.tsx`, `CollectionSections.tsx`,
  `PromoBanner.tsx`, most of `HomeSections.tsx`, `lib/catalog.ts`.
- Mobile: sticky header + category rail eats ~210px on every page.
- "Today's deals" renders a single lonely card in a 4-col grid when 1 deal exists.
- Duplicate `BenefitsBar` (top and bottom of homepage).

### Ready items (in order)
1. [x] BrandLogo hydration fix + drop favicon fallbacks; exact-match brand labels.
2. [x] Security quick wins: `noopener` on checkout windows; header links point to
   real destinations (Shopify accounts, WhatsApp help).
3. [ ] `src/lib/merchandising.ts` — Shopify-managed content layer:
   showcases from `showcase-*` collections (image, title, description, CTA,
   `custom.sort_order` metafield, product count; unpublished = hidden) with
   automatic fallback showcases from top brands; `shop` info (name, brand logo,
   policies, paymentSettings) query + `shopQueryOptions`.
4. [ ] Brand Showcase section replacing `PromoBanners`: hero image stage, brand
   logo, title, description, product rail, count, CTA; alternating layout.
5. [ ] Hero redesign: light image stage inside dark panel, arrows/dots/progress,
   tagline from `homepage-hero` collection description.
6. [ ] Newsletter → honest "Deal alerts on WhatsApp" CTA (single instance);
   remove footer email form; document how to enable email capture
   (Storefront API `unauthenticated_write_customers`).
7. [ ] Footer: policy links from Shopify (`/policies/$handle` route rendering
   `shop.*Policy.body`), Help/Contact page (`/help`: WhatsApp, account/orders,
   policies), payment badges only from `paymentSettings`, remove fake socials,
   fix column layout.
8. [ ] Header: keyboard-accessible dropdowns (focus-within), mobile hamburger
   menu (Sheet: categories, brands, collections, help, account), category rail
   non-sticky on mobile.
9. [ ] Product cards: Quick View dialog (gallery, VariantPicker, qty, add to
   cart), second-image hover when real, brand link.
10. [ ] Product page: "More from {brand}" rail, share button (Web Share/copy),
    keep WhatsApp + compare.
11. [ ] Homepage: adaptive Deals layout (spotlight for 1–2 deals), remove
    duplicate BenefitsBar, customer-facing WhyShop copy sourced from
    `storeAssurances.ts`.
12. [ ] Delete dead components/`lib/catalog.ts`; tidy `HomeSections.tsx` to
    `BenefitsBar` only.
13. [ ] Security headers middleware (nosniff, referrer-policy,
    permissions-policy; no frame-ancestors to keep the preview iframe working);
    validate checkout URL host is Shopify before opening; dependency scan.
14. [ ] Sitemap/robots: add `/help` and `/policies/*`; verify head() on new routes.
15. [ ] QA: Playwright desktop/mobile/dark mode for home, product, shop, cart,
    help, policies; `bunx tsgo --noEmit`; `bun run build`.

## Completed earlier
- Premium reference redesign, dynamic taxonomy, brand logos from collections,
  WhatsApp ordering, compare, technical SEO (canonicals, JSON-LD, sitemap, noindex).
