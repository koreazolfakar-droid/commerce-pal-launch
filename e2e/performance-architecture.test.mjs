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
  assert.match(home, /\.\.\.catalogQueryOptions\(\),\s*enabled: deferredWorkReady/s);
  assert.match(home, /\.\.\.collectionsQueryOptions\(\),\s*enabled: deferredWorkReady/s);
  assert.match(
    home,
    /\.\.\.collectionQueryOptions\(HOME_HERO_COLLECTION_HANDLE, 4\),\s*enabled: deferredWorkReady/s,
  );
  assert.doesNotMatch(
    home,
    /loader:[\s\S]*ensureQueryData\(collectionQueryOptions\(HOME_HERO_COLLECTION_HANDLE, 4\)\)/,
  );
  assert.doesNotMatch(home, /<HomeHero[\s\S]*?products=\{products\}/);
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


test("small storefront collections avoid hydrating the full native snapshot", async () => {
  const nativeStore = await read("src/lib/nativeStore.ts");

  assert.match(nativeStore, /SMALL_COLLECTION_FAST_PATH_MAX\s*=\s*12/);
  assert.match(nativeStore, /pageSize <= SMALL_COLLECTION_FAST_PATH_MAX/);
  assert.match(nativeStore, /fetchSmallCollectionByHandle\(handle, pageSize\)/);
  assert.match(nativeStore, /\.eq\("collection_id", row\.id\)/);
  assert.match(nativeStore, /\.in\("product_id", activeProductIds\)/);
});


test("homepage hero refresh never replays stale local fallback", async () => {
  const [hero, cms] = await Promise.all([
    read("src/components/HomeHero.tsx"),
    read("src/lib/cms.ts"),
  ]);

  assert.doesNotMatch(hero, /space-call-home-hero-refresh-fallback-v1/);
  assert.doesNotMatch(hero, /readStoredHero|storeHero|sessionStorage/);
  assert.match(cms, /cache:\s*"no-store"/);
});


test("native storefront data path avoids wildcard payloads", async () => {
  const nativeStore = await read("src/lib/nativeStore.ts");

  assert.doesNotMatch(nativeStore, /\.select\("\*"\)/);
  assert.match(nativeStore, /STOREFRONT_PRODUCT_SELECT/);
  assert.match(nativeStore, /STOREFRONT_VARIANT_SELECT/);
  assert.match(nativeStore, /STOREFRONT_IMAGE_SELECT/);
  assert.match(nativeStore, /STOREFRONT_COLLECTION_SELECT/);
  assert.match(nativeStore, /STOREFRONT_COLLECTION_LINK_SELECT/);
  assert.match(nativeStore, /STOREFRONT_BRAND_SELECT/);
  assert.match(
    nativeStore,
    /export async function fetchCollections[\s\S]*?\.from\("store_collections"\)[\s\S]*?\.limit\(Math\.max\(0, first\)\)/,
  );
  assert.doesNotMatch(
    nativeStore,
    /export async function fetchCollections[\s\S]*?loadSnapshot\(\)/,
  );
});
