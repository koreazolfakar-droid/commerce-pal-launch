import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("deferred homepage product skeleton matches the live horizontal rail", () => {
  const skeleton = source("src/components/LoadingSkeletons.tsx");
  const rail = source("src/components/ProductRail.tsx");

  assert.match(skeleton, /className="product-rail min-w-0 overflow-hidden"/);
  assert.match(skeleton, /scroll-rail product-rail-items product-swipe-rail/);
  assert.match(skeleton, /market-product-card homepage-product-card/);
  assert.match(skeleton, /aspect-square/);
  assert.match(rail, /product-rail-items product-swipe-rail/);
});

test("deferred product rails do not compete with the critical hero for high-priority images", () => {
  const rail = source("src/components/ProductRail.tsx");
  const hero = source("src/components/HomeHero.tsx");
  assert.match(rail, /eagerCount = 0/);
  assert.match(rail, /eager=\{index < eagerCount\}/);
  assert.match(hero, /fetchPriority="high"/);
});

test("dense catalog keeps two columns on very narrow phones", () => {
  const grid = source("src/components/ProductGrid.tsx");
  assert.match(grid, /grid-cols-2 gap-x-2 gap-y-4 min-\[375px\]:grid-cols-3/);
});

test("carousel arrows share accessible 44px hit targets", () => {
  const hero = source("src/components/HomeHero.tsx");
  assert.match(hero, /role="group"/);
  const controls = [...hero.matchAll(/className="grid size-11[^"]*text-lg text-white\/90/g)];
  assert.equal(controls.length, 2);
});

test("storefront motion respects reduced-motion preferences", () => {
  const css = source("src/design-consistency.css");
  assert.match(css, /@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\)/);
  assert.match(css, /\.store-layout \.homepage-product-card:focus-within/);
  assert.match(source("src/components/StoreLayout.tsx"), /min-h-\[100dvh\]/);
});
