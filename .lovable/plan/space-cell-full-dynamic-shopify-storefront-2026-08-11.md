# Space Cell — Full Dynamic Shopify Storefront

Goal: a complete, production-ready store where every page, section, filter and category is driven by live Shopify data, with zero hardcoded products.

## What I found in your store right now

Live check of the connected store (`Space Cell`) returned:

- 6 products — 4 of them are Shopify's default "Example product" samples
- 2 collections: `frontpage`, `phone-cases-example-products`
- Product type is empty on every product
- Vendor is `Space cell` on every product (no real brands)
- Tags only contain `Sample Product`

This matters: the category/brand system you described (Smartphones, Headphones, Samsung, Anker...) needs signals in Shopify. Today there are none, so the site would show a single undifferentiated list. The plan therefore builds a resolver that uses whatever signals exist, in priority order, and degrades gracefully — and I'll tell you exactly which Shopify fields to fill so new products land in the right sections automatically.

## Categorization engine (no hardcoded products)

A single `resolveTaxonomy(product)` layer assigns each product to categories and a brand using, in order:

1. Shopify **collections** the product belongs to (authoritative)
2. **Product type** (e.g. "Headphones", "Power Bank")
3. **Tags** (e.g. `category:smartphones`, `brand:samsung`)
4. **Vendor** for brand
5. Fallback: keyword matching on title/description against a keyword→category dictionary (Smartphones, Tablets, Laptops, Smartwatches, Headphones & Earbuds, Audio, Chargers, Cables, Power Banks, Cases & Protection, Accessories) and a brand keyword list (Apple/iPhone, Samsung, Xiaomi, Google, OnePlus, Anker, Honor, Oppo, Realme, Baseus, JBL, Sony…)

The dictionary maps *keywords to sections*, not products to sections — adding "Samsung Galaxy S26 Ultra" or "Anker 20,000mAh Power Bank" in Shopify automatically resolves to Smartphones+Samsung and Power Banks+Anker with no code change.

Navigation and homepage sections are generated at runtime from the products/collections actually present: a category or brand only appears in the menu when at least one product resolves into it. New Shopify collections show up automatically on the shop and menu.

## Pages and features

- **Home** — promo banner from real discounted products, dynamic category strip, brand rail, best sellers / new arrivals rails, auto-generated category sections, benefits bar
- **Shop `/shop`** — all products with faceted filters (category, brand, price range, availability, collection) and sort (featured, price, title, newest); filter state lives in the URL
- **Category `/category/$slug`** and **Brand `/brand/$slug`** — generated from resolved taxonomy, same filter/sort toolbar
- **Collections `/collections` and `/collections/$handle`** — live Shopify collections
- **Product `/product/$handle`** — gallery, variant selection with availability, compare-at pricing, description, options, related products (same category), recently viewed
- **Search** — Shopify storefront search with product + collection + suggestion results
- **Cart & checkout** — existing Shopify Cart API store kept as-is; cart page + drawer, quantity edits, and checkout via the Storefront-generated checkout URL
- **Wishlist `/wishlist`** — persisted locally, works from every product card
- **404 / error / empty / loading states** on every route; skeletons instead of spinners
- Header with mega menu, mobile drawer nav, bottom nav on mobile, full footer

## Design

Keep the current premium light direction, tightened: consistent card system, restrained motion (hover lift, image zoom, skeleton fade), strong type hierarchy, responsive from 360px to wide desktop. No fake stats, testimonials, or placeholder copy anywhere.

## Technical notes

- New `src/lib/taxonomy.ts` (keyword dictionaries + resolver), `src/lib/queries.ts` (shared TanStack Query options), extended `src/lib/shopify.ts` (paginated product fetch, sort keys, `createdAt`, collection membership per product, search suggestions)
- `src/lib/catalog.ts` becomes label/icon metadata only — it no longer decides which sections exist
- Route loaders prime the query cache; components read via `useSuspenseQuery`; filters/sort via `validateSearch`
- Cart store, `useCartSync`, and checkout flow untouched
- SEO: per-route `head()` metadata, product/collection JSON-LD, semantic headings, alt text, lazy images

## Verification before I call it done

Playwright pass at mobile and desktop: home → category → brand → product → variant select → add to cart → cart drawer → checkout URL generated; plus search, filters, sort, wishlist, and a 404 route.

## What you should do in Shopify (so categories stay automatic)

Delete the 4 "Example product" samples, then for each real product set **Product type** (e.g. Smartphones, Power Banks) and **Vendor** (e.g. Samsung, Anker). Collections are optional but preferred. The keyword fallback covers products where these are missing, but filled fields make it exact.
