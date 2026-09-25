import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("storefront density modes use static grids and preserve product information", async () => {
  const [hook, toggle, grid, rail, card, showcase] = await Promise.all([
    read("src/hooks/useProductViewMode.ts"),
    read("src/components/ProductViewToggle.tsx"),
    read("src/components/ProductGrid.tsx"),
    read("src/components/ProductRail.tsx"),
    read("src/components/CompactProductCard.tsx"),
    read("src/components/BrandShowcaseSections.tsx"),
  ]);

  assert.match(hook, /"dense"\s*\|\s*"grid"/);
  assert.doesNotMatch(hook, /ProductViewMode = .*"list"/);
  assert.match(toggle, /onChange\("dense"\)/);
  assert.match(toggle, /onChange\("grid"\)/);
  assert.doesNotMatch(toggle, /onChange\("list"\)/);

  assert.match(grid, /grid-cols-3/);
  assert.match(grid, /grid-cols-2/);
  assert.match(grid, /borderless/);

  assert.match(rail, /const visible = products\.slice\(0, compactGrid \? 6 : 10\)/);
  assert.match(rail, /data-product-layout="swipe"/);
  assert.match(rail, /scroll-rail product-rail-items product-swipe-rail/);
  assert.match(rail, /market/);
  assert.doesNotMatch(rail, /RailArrow|ChevronLeft|ChevronRight/);

  assert.match(showcase, /HOME_BRAND_PRODUCT_TARGET = 6/);
  assert.match(showcase, /products=\{products\.slice\(0, 6\)\}/);

  assert.match(card, /market-product-card/);
  assert.match(card, /line-clamp-2 min-h-\[2\.35rem\]/);
  assert.match(card, /whitespace-nowrap/);
  assert.match(card, /brand\.label/);
  assert.match(card, /t\("inStock"\)/);
  assert.match(card, /t\("outOfStock"\)/);
  assert.match(card, /Add \\$\\{node\\.title\\} to bag/);
  assert.match(card, /summary \\|\\| "\\\\u00a0"/);
  assert.match(card, /mt-1\\.5 flex min-h-9 items-center justify-between gap-2/);
  assert.match(card, /rounded-full border border-border\\/70 bg-background text-primary/);
  assert.match(grid, /gap-x-3 gap-y-5/);
});
