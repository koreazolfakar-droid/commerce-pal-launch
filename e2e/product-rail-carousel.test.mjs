import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [rail, styles] = await Promise.all([
  read("src/components/ProductRail.tsx"),
  read("src/styles.css"),
]);

test("product grid mode stays a horizontal swipe rail on every breakpoint", () => {
  assert.match(rail, /className="scroll-rail product-rail-items"/);
  assert.doesNotMatch(rail, /sm:grid sm:snap-none/);
  assert.match(styles, /\.product-rail-items\s*\{[\s\S]*display:\s*flex/);
  assert.doesNotMatch(
    styles,
    /@container \(min-width: 36rem\)[\s\S]{0,260}\.product-rail-items\s*\{[\s\S]{0,120}display:\s*grid/,
  );
  assert.match(styles, /padding-inline-end:\s*clamp\(/);
});

test("product rail exposes touch scrolling and contextual previous-next arrows", () => {
  assert.match(rail, /useRailNavigation/);
  assert.match(rail, /scrollBy\(\{/);
  assert.match(rail, /behavior:\s*"smooth"/);
  assert.match(rail, /navigation\.canPrevious/);
  assert.match(rail, /navigation\.canNext/);
  assert.match(rail, /Previous products/);
  assert.match(rail, /Next products/);
  assert.match(rail, /ChevronLeft/);
  assert.match(rail, /ChevronRight/);
});

test("carousel navigation handles RTL and hides arrows when all items fit", () => {
  assert.match(rail, /getComputedStyle\(node\)\.direction === "rtl"/);
  assert.match(rail, /node\.scrollWidth <= node\.clientWidth \+ 2/);
  assert.match(rail, /rtl \? -1 : 1/);
  assert.match(rail, /rtl:rotate-180/);
});

test("list view remains intact and compact rails keep deferred rendering", () => {
  assert.match(rail, /viewMode === "list"/);
  assert.match(rail, /ProductListCard/);
  assert.match(rail, /useCompactGridVisibility/);
  assert.match(rail, /IntersectionObserver/);
  assert.match(rail, /aria-busy/);
});
