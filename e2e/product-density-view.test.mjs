import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("storefront keeps list view while adding Toters-style 3-up and 2-up density modes", async () => {
  const [hook, toggle, grid, rail] = await Promise.all([
    read("src/hooks/useProductViewMode.ts"),
    read("src/components/ProductViewToggle.tsx"),
    read("src/components/ProductGrid.tsx"),
    read("src/components/ProductRail.tsx"),
  ]);

  assert.match(hook, /"dense"\s*\|\s*"grid"\s*\|\s*"list"/);
  assert.match(toggle, /onChange\("dense"\)/);
  assert.match(toggle, /onChange\("grid"\)/);
  assert.match(toggle, /onChange\("list"\)/);

  assert.match(grid, /grid-cols-3/);
  assert.match(grid, /grid-cols-2/);
  assert.match(grid, /viewMode === "dense"/);
  assert.match(grid, /CompactProductCard/);

  assert.match(rail, /viewMode !== "list"/);
  assert.match(rail, /basis-\[31%\]/);
});
