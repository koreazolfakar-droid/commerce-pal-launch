import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const rail = await read("src/components/ProductRail.tsx");

test("dense product layout is a real three-column grid with a second row", () => {
  assert.match(rail, /gridProducts = products\.slice\(0, 6\)/);
  assert.match(rail, /viewMode === "dense"/);
  assert.match(rail, /grid-cols-3/);
  assert.match(rail, /gap-y-5/);
  assert.match(rail, /data-product-layout=\{viewMode\}/);
});

test("two-column product layout is also a static grid", () => {
  assert.match(rail, /grid-cols-2/);
  assert.doesNotMatch(rail, /scroll-rail|overflow-x-auto|snap-x|snap-start/);
});

test("static product grids do not expose carousel arrows or scrolling navigation", () => {
  assert.doesNotMatch(rail, /useRailNavigation|scrollBy\(|ChevronLeft|ChevronRight/);
  assert.doesNotMatch(rail, /Previous products|Next products/);
});

test("horizontal list view is removed and purchase cards keep the market presentation", () => {
  assert.doesNotMatch(rail, /viewMode === "list"/);
  assert.doesNotMatch(rail, /ProductListCard/);
  assert.match(rail, /CompactProductCard/);
  assert.match(rail, /market/);
});
