# Space Cell — Light Premium Storefront Redesign

Rebuild the homepage in the light, premium tech-retail language of the reference: white/off-white surfaces, soft blue promo panels, restrained blue accent, clean bordered cards, tight spacing. Add a global search overlay and dynamic collection routes. The existing Shopify Storefront API layer and cart/checkout flow stay exactly as they are.

## What your store contains today

Verified against the live Storefront API:

- 5 products, all vendor "Space cell", no product types set
- 2 collections: `frontpage` (Home page) and `phone-cases-example-products` (Phone Cases)
- No review or rating data

So brand and category sections will render **only from collections that actually exist**. As you add collections in Shopify (e.g. `apple`, `smartphones`, `earbuds`), they appear automatically — no code change needed.

## Design system

Rewrite the tokens in `src/styles.css` from the current dark theme to light:

- Background `#FFFFFF`, secondary surface `#F7F8FA`, soft promo `#F1F6FF`
- Text `#111111`, muted `#6B7280`, borders `#E5E7EB`
- Accent: modern tech blue, used only for CTAs, links, active states
- Radius stepped down to a medium value; shadows near-invisible at rest, soft on hover
- All values as oklch tokens; components keep using semantic classes only

## Homepage structure

1. **Top info bar** — three trust messages; three columns on desktop, horizontal scroll on mobile.
2. **Desktop header** — logo + wordmark, center nav (Home, Smartphones, Tablets, Accessories, Audio, Deals) with dropdowns for the multi-collection ones, right side search / wishlist / account / cart with count. Sticky.
3. **Mobile header** — purpose-built: logo, search, wishlist, cart, plus a horizontally scrollable category strip underneath.
4. **Hero row** — three-column desktop grid: category sidebar (left), hero panel (center), three compact promo product cards (right). Hero is a soft blue-to-white gradient with eyebrow, headline, supporting line, price, Shop now / Learn more, and carousel dots driven by real featured products. On mobile: sidebar becomes a scrollable chip row, side products become a swipeable carousel below the hero.
5. **Top brands** — cards built from existing brand collections; hidden when none exist, with a "View all brands" link. Horizontal scroll on mobile. Brand marks are text wordmarks, not third-party logo files.
6. **Benefits bar** — four line-icon items (shipping, secure payment, warranty, support).
7. **Best sellers** — horizontal carousel of real Shopify products.
8. **Promotional category cards** — three large soft-blue cards (Earbuds, Smartwatches, Accessories) linking to their collection when it exists, using real Shopify imagery.
9. **Services strip** — Compare phones, Trade-in, Student discount, Business solutions (informational cards).
10. **Footer** — Shop / Brands / Support / Company columns built from live collections where applicable, plus newsletter, social icons, payment marks, copyright.

## Product card

One shared component, white with a subtle border, hover elevation, large clean image, wishlist top-right, badge top-left. Below the image: brand, name, variant summary, price, compare-at price, discount badge, availability, Add to cart. No ratings and no empty star placeholders — the card leaves a dedicated slot so a real review integration can drop in later without a redesign.

## Search and collection routes

- **Search overlay** — modal opened from either header, queries the Storefront API live with debounce, grouped results (products, collections), keyboard dismissable.
- **`/collections/$handle`** — dynamic route: collection title, description, product grid, empty state when the collection has no products; 404 when the handle doesn't exist. Every brand/category link in the UI points here.
- **`/collections`** — index listing all collections in your store.

## Not included this round

- Product detail page restyle, phone comparison, brand-specific hero pages, and the audio/tablet/accessory sub-ecosystems — these follow once collections exist.
- Creating Shopify collections. I can create products, but collections have to be added in your Shopify admin; the UI is built to pick them up automatically.

## Technical notes

- `src/lib/shopify.ts` gains collection queries (`collections`, `collectionByHandle`, product search) and compare-at price fields on the product fragment. Existing exports, `src/stores/cartStore.ts`, `useCartSync`, and the checkout URL flow are untouched.
- New route file `src/routes/collections.$handle.tsx` and `src/routes/collections.index.tsx`; homepage split into focused components under `src/components/` (header, hero, category sidebar, brand rail, product carousel, promo cards, footer).
- Wishlist is a local persisted store (Shopify has no wishlist primitive).
- Data fetched with TanStack Query; images lazy-loaded with explicit dimensions; each route keeps its own `head()` metadata.
