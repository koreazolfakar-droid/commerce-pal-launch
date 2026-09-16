import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage keeps critical UI small and defers secondary work", async () => {
  const [home, categories] = await Promise.all([
    read("src/routes/index.tsx"),
    read("src/components/HomeCategorySection.tsx"),
  ]);

  assert.match(home, /HomeCategorySection/);
  assert.doesNotMatch(home, /import \{ BrandShowcase, BundleSection, CategorySection \}/);
  assert.match(home, /import\("@\/components\/BrandShowcaseSections"\)/);
  assert.match(home, /LazyProductRail/);
  assert.match(home, /LazyDealSpotlight/);
  assert.match(home, /requestIdleCallback/);
  assert.match(home, /enabled: secondaryQueriesReady/);
  assert.match(home, /deferredWorkReady/);

  assert.match(categories, /data-testid="category-section"/);
  assert.match(categories, /loading="lazy"/);
  assert.match(categories, /width=\{128\}/);
  assert.match(categories, /height=\{128\}/);
});

test("router preloads only after navigation intent", async () => {
  const router = await read("src/router.tsx");
  assert.match(router, /defaultPreload:\s*"intent"/);
  assert.match(router, /defaultPreloadStaleTime:\s*30_000/);
});
