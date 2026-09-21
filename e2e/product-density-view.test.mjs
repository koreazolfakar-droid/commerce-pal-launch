import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("storefront keeps list view and uses market cards for 3-up and 2-up modes", async () => {
  const [hook, toggle, grid, rail, card, styles] = await Promise.all([
    read("src/hooks/useProductViewMode.ts"),
    read("src/components/ProductViewToggle.tsx"),
    read("src/components/ProductGrid.tsx"),
    read("src/components/ProductRail.tsx"),
    read("src/components/CompactProductCard.tsx"),
    read("src/styles.css"),
  ]);

  assert.match(hook, /"dense"\s*\|\s*"grid"\s*\|\s*"list"/);
  assert.match(toggle, /onChange\("dense"\)/);
  assert.match(toggle, /onChange\("grid"\)/);
  assert.match(toggle, /onChange\("list"\)/);

  assert.match(grid, /grid-cols-3/);
  assert.match(grid, /grid-cols-2/);
  assert.match(grid, /market/);
  assert.doesNotMatch(grid, /ProductCard key=/);

  assert.match(rail, /product-rail--\$\{viewMode\}/);
  assert.match(rail, /market/);
  assert.match(card, /market-product-card/);
  assert.match(card, /whitespace-nowrap/);

  assert.match(styles, /product-rail-items\.product-rail--dense/);
  assert.match(styles, /calc\(\(100% - 1rem\) \/ 3\)/);
  assert.match(styles, /product-rail-items\.product-rail--grid/);
  assert.match(styles, /calc\(\(100% - 0\.625rem\) \/ 2\)/);
});
