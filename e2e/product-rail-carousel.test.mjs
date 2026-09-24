import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const rail = await read("src/components/ProductRail.tsx");

test("product sections use a horizontal swipe rail", () => {
  assert.match(rail, /scroll-rail product-rail-items product-swipe-rail/);
  assert.match(rail, /data-product-layout="swipe"/);
  assert.match(rail, /snap-start/);
});

test("old static density grids and their toggle are removed from the rail", () => {
  assert.doesNotMatch(rail, /grid-cols-2|grid-cols-3|product-static-grid/);
  assert.doesNotMatch(rail, /<ProductViewToggle|useProductViewMode\(\)/);
});

test("purchase cards keep the market presentation", () => {
  assert.match(rail, /CompactProductCard/);
  assert.match(rail, /market/);
  assert.match(rail, /eager=\{index < 3\}/);
});

test("compact sections remain bounded without reverting to a grid", () => {
  assert.match(rail, /compactGrid \? 6 : 10/);
  assert.doesNotMatch(rail, /overflow-x-auto/);
});
