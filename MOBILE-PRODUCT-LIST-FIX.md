# Mobile product list card fix

## Cause

The list card grid stretched its image column to the full height of the information column. The product link and image wrapper also used `h-full`, so the image background continued far below the contained product image. Large padding and `mt-auto` on the cart action increased the empty area.

## Changes

- `src/components/ProductListCard.tsx`
  - Uses a content-sized horizontal card with a dedicated media column and information column.
  - Removes full-height image behavior and bottom-pushing layout.
  - Keeps brand, wishlist, comparison, title, variant, price, stock, and cart action in a compact spacing system.
  - Uses the shared `ProductImage` component with `object-fit: contain` and a larger visible product area.
- `src/styles.css`
  - Defines one shared mobile list layout with a bounded square media frame.
  - Uses logical CSS so column order mirrors correctly in RTL.
  - Keeps card height content-driven and the cart button at the width of the information column.
- `e2e/product-list-layout.spec.ts`
  - Covers 360px, 390px, and 430px viewports in English and Arabic.
  - Checks mixed image ratios, card overflow and height, media consistency, `object-fit`, button sizing and spacing, RTL/LTR placement, and cart/wishlist/comparison interactions.
  - Confirms the homepage Best sellers list uses the same shared layout.

The fix applies wherever `ProductListCard` is rendered, including homepage rails and shop, category, brand, collection, search, and wishlist list views.
