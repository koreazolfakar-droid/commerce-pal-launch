import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("home starts secondary product requests without waiting for the hero collection", async () => {
  const home = await read("src/routes/index.tsx");
  assert.match(home, /const secondaryQueriesReady = deferredWorkReady/);
  assert.match(home, /const catalogReady =[\s\S]*heroCollectionFetched/);
});

test("loading feedback uses product-shaped placeholders and respects reduced motion", async () => {
  const [home, shop, grid, styles] = await Promise.all([
    read("src/routes/index.tsx"), read("src/routes/shop.tsx"),
    read("src/components/ProductGrid.tsx"), read("src/styles.css"),
  ]);
  assert.match(home, /<ProductRailSkeleton/);
  assert.match(shop, /pendingComponent: ShopPending/);
  assert.match(grid, /viewMode === "dense" \? DENSE : GRID/);
  assert.match(styles, /prefers-reduced-motion: no-preference[\s\S]*?\.store-layout \.shimmer::after[\s\S]*?animation: var\(--animate-shimmer\) !important/);
});

test("homepage offers a retry when the catalogue fails instead of loading forever", async () => {
  const home = await read("src/routes/index.tsx");
  assert.match(home, /catalogFailed \? \([\s\S]*?retryCatalog\(\)/);
});

test("slow product navigation shows a product-shaped loading state", async () => {
  const product = await read("src/routes/product.$handle.tsx");
  assert.match(product, /pendingComponent: ProductPending/);
  assert.match(product, /Loading product/);
});
