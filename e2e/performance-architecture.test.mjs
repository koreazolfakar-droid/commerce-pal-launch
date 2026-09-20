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
  assert.match(home, /\.\.\.homepageCatalogQueryOptions\(\),\s*enabled: deferredWorkReady/s);
  assert.match(home, /\.\.\.collectionsQueryOptions\(\),\s*enabled: deferredWorkReady/s);
  assert.doesNotMatch(home, /<HomeHero[\s\S]*?products=\{products\}/);
  assert.match(home, /deferredWorkReady/);
  assert.match(home, /HOME_SECONDARY_IDLE_TIMEOUT_MS\s*=\s*450/);
  assert.match(home, /HOME_SECONDARY_FALLBACK_DELAY_MS\s*=\s*120/);

  assert.match(categories, /data-testid="category-section"/);
  assert.match(categories, /loading="lazy"/);
  assert.match(categories, /width=\{128\}/);
  assert.match(categories, /height=\{128\}/);
});

test("router preloads only after navigation intent", async () => {
  const router = await read("src/router.tsx");
  assert.match(router, /defaultPreload:\s*"intent"/);
  assert.match(router, /defaultPreloadDelay:\s*20/);
  assert.match(router, /defaultPreloadStaleTime:\s*30_000/);
});


test("storefront internal navigation stays client-side", async () => {
  const [bottom, cmsControls, cartDrawer, siteHeader, home] = await Promise.all([
    read("src/components/BottomNav.tsx"),
    read("src/components/CmsStoreControls.tsx"),
    read("src/components/CartDrawer.tsx"),
    read("src/components/SiteHeader.tsx"),
    read("src/routes/index.tsx"),
  ]);

  assert.match(bottom, /href=\{item\.href \?\? "\/"\}[\s\S]*?preload="intent"/);
  assert.match(cmsControls, /function isInternalStoreHref/);
  assert.match(cmsControls, /<Link key=\{item\.id\} href=\{item\.href\} preload="intent"/);
  assert.doesNotMatch(cartDrawer, /href="\/cart(?:#whatsapp-checkout)?"/);
  assert.doesNotMatch(siteHeader, /href="\/help#(?:track-order|account-orders)"/);
  assert.match(home, /function CmsActionLink/);
  assert.match(home, /<Link href=\{href\} preload="intent"/);
});


test("root warms the primary storefront backend connection", async () => {
  const root = await read("src/routes/__root.tsx");
  assert.match(
    root,
    /rel:\s*"preconnect"[\s\S]*?href:\s*"https:\/\/rtwyankpxtffqqrasyzw\.supabase\.co"[\s\S]*?crossOrigin:\s*"anonymous"/,
  );
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
  assert.match(cms, /cache:\s*"default"/);
});


test("storefront disables decorative motion and continuous auto-play", async () => {
  const [styles, hero, brands, ticker, home] = await Promise.all([
    read("src/styles.css"),
    read("src/components/HomeHero.tsx"),
    read("src/components/TopBrands.tsx"),
    read("src/home-ticker.css"),
    read("src/routes/index.tsx"),
  ]);

  assert.match(styles, /\.store-layout \*[\s\S]*?animation:\s*none !important/);
  assert.match(styles, /transition-duration:\s*0s !important/);
  assert.match(hero, /HERO_AUTO_ROTATION_ENABLED\s*=\s*false/);
  assert.match(brands, /AUTO_SCROLL_ENABLED\s*=\s*false/);
  assert.doesNotMatch(ticker, /animation:\s*home-promo-ticker/);
  assert.doesNotMatch(home, /animate-pulse/);
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
  const collectionsStart = nativeStore.indexOf("export async function fetchCollections");
  const collectionsEnd = nativeStore.indexOf("export async function fetchCollectionByHandle", collectionsStart);
  assert.ok(collectionsStart >= 0 && collectionsEnd > collectionsStart);
  const collectionsSource = nativeStore.slice(collectionsStart, collectionsEnd);
  assert.doesNotMatch(collectionsSource, /loadSnapshot\(\)/);
});
