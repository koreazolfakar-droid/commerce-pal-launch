# Homepage sections, day/night mode & phone details

Everything below stays 100% live from Shopify — no demo or placeholder products, and no hardcoded brands or sections. If a collection or brand has no products, its section simply does not render.

## 1. Day / Night mode (visible switch)

The theme engine already exists (light / dark / system, saved per user, no flash on load) but the switch is not mounted anywhere.

- Add the sun/moon toggle to the desktop header and to the mobile top bar.
- Sweep every surface (cards, rails, promo blocks, drawers, product page, footer) so both modes keep strong contrast and no pure black.
- Smooth color transition when switching.

## 2. Homepage order (top to bottom)

```text
1  Hero
2  Item types  (Phones, Tablets, Power banks, Headphones, Cases ...)
3  Best sellers
4  Bundles
5  Brand section + promo hero   (e.g. Samsung)
6  Brand section + promo hero   (e.g. Apple / iPhone)
7  ...repeats automatically for every brand in the store
8  Deals / New arrivals / All products
```

- **Item types**: generated from live product data (type, collections, vendor, tags) with cleaner modern icons; each tile shows the real product count.
- **Best sellers**: uses Shopify's own best-selling ordering, not a manual list.
- **Bundles**: auto-detected from Shopify (a collection or tag named "bundle"/"combo"/"pack"). Hidden if none exists.
- **Brand sections**: one block per brand present in the catalogue, each with its own promo hero band above it (brand name, the collection's real Shopify description, and the collection image when one is uploaded — otherwise a clean typographic band, never an invented banner). Ordered by how many products the brand has.
- **Adding new sections/heroes yourself in Shopify**: create a collection, give it an image + description, and it appears as its own section with a hero automatically. Optional ordering control via a collection tag (e.g. `home:1`, `home:2`) so you can reorder sections from Shopify without code changes.

## 3. Icons

Replace the current icon set with a tighter, modern line set already bundled in the app (no extra download, no extra page weight), consistent stroke and size across categories, nav, benefits and trust rows.

## 4. Phone information & details (product page)

Enriched from real Shopify fields only:

- Title, vendor/brand, price + compare-at, availability, gallery.
- **Spec table** built from Shopify data: variant options (storage, colour, RAM), product type, SKU, barcode when present, weight, and `key: value` tags (e.g. `Display: 6.7 AMOLED`, `Battery: 5000mAh`) rendered as a clean spec list.
- Full description rendered as rich text, with tabs: Details / Specs / Shipping & Warranty.
- Reviews: empty state only ("No reviews yet") — no fabricated ratings.
- Related products from the same category/brand.

## Technical notes

- New: `bestSellersQueryOptions` (Shopify `BEST_SELLING` sort), bundle detection and homepage-section ordering helpers in `src/lib/taxonomy.ts`, a reusable `SectionHero` + `BrandSection` component, and a `SpecsTable` built from variant options / tags / SKU.
- Homepage `src/routes/index.tsx` reordered to the sequence above; sections render only when they have products.
- Mount `ThemeToggle` in `SiteHeader.tsx` and `MobileTopBar.tsx`; audit dark tokens in `src/styles.css`.
- Fix the current hydration warning in `SiteHeader.tsx` (server/client nav mismatch).
- Cart, checkout, wishlist, search, filters and sorting stay untouched.
