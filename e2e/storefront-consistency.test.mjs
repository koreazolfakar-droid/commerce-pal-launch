import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");
const withoutComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

test("merchant brand artwork overrides curated local fallbacks", async () => {
  for (const asset of [
    "public/brand-logos/apple.svg",
    "public/brand-logos/xiaomi.svg",
    "public/brand-logos/anker.svg",
    "public/brand-logos/poco.png",
    "public/brand-logos/tecno.svg",
    "public/brand-logos/samsung.png",
    "public/brand-logos/ugreen.png",
    "public/brand-logos/vention.png",
  ]) await access(new URL(asset, root));

  const [brandLogo, brands, brandDirectory] = await Promise.all([
    source("src/components/BrandLogo.tsx"),
    source("src/lib/brands.ts"),
    source("src/lib/brandDirectory.ts"),
  ]);
  assert.match(brandLogo, /safeImageSource/);
  assert.match(brandDirectory, /compactBrandIdentity/);
  for (const name of ["apple", "xiaomi", "anker", "poco", "tecno"]) {
    assert.match(brands, new RegExp(`/${name}\\.(?:svg|png)`));
  }
});

test("homepage catalog preserves the last successful Supabase snapshot during transient refresh failures", async () => {
  const queries = await source("src/lib/queries.ts");
  assert.match(queries, /CATALOG_REFRESH_FALLBACK_TTL_MS = 5 \* 60 \* 1000/);
  assert.match(queries, /CATALOG_REFRESH_FALLBACK_STORAGE_KEY = "space-call-supabase-catalog-fallback-v1"/);
  assert.match(queries, /window\.sessionStorage\.setItem\([\s\S]*?CATALOG_REFRESH_FALLBACK_STORAGE_KEY/);
  assert.match(queries, /window\.sessionStorage\.getItem\(CATALOG_REFRESH_FALLBACK_STORAGE_KEY\)/);
  assert.match(queries, /Supabase catalog refresh failed; keeping the last successful tab snapshot/);
  assert.match(queries, /QUERY_RETRY_COUNT = 2/);
  assert.match(queries, /retryDelay/);
  assert.doesNotMatch(queries, /Shopify catalog refresh|SHOPIFY_QUERY_RETRY_COUNT/);
});

test("shared footer stays lightweight and hides technical build data", async () => {
  const footer = await source("src/components/SiteFooter.tsx");
  const runtimeFooter = withoutComments(footer);
  assert.doesNotMatch(runtimeFooter, /catalogQueryOptions|shopPoliciesQueryOptions/);
  assert.match(runtimeFooter, /cmsQueryOptions/);
  assert.doesNotMatch(runtimeFooter, /STORE_VERSION|app-version|No brands yet|لا توجد علامات بعد/);
  assert.match(runtimeFooter, /cmsWhatsApp/);
  assert.match(runtimeFooter, /FOOTER_SHOP_LINKS/);
  assert.match(runtimeFooter, /FOOTER_BRAND_LINKS/);
});

test("HTML documents cannot remain stale across deploys", async () => {
  const server = await source("src/server.ts");
  assert.match(server, /Cache-Control", "no-store, max-age=0, must-revalidate"/);
  assert.match(server, /CDN-Cache-Control", "no-store"/);
  assert.match(server, /Surrogate-Control", "no-store"/);
  assert.doesNotMatch(server, /stale-while-revalidate|s-maxage=/);
});

test("account support remains first-party and never hands users to Shopify", async () => {
  const [config, infoPage] = await Promise.all([
    source("src/lib/storeConfig.ts"),
    source("src/components/InfoPage.tsx"),
  ]);
  assert.match(config, /SHOP_ACCOUNT_URL = `\$\{SITE_URL\}\/help#account-orders`/);
  assert.doesNotMatch(config, /SHOPIFY_ACCOUNT_URL|myshopify/);
  assert.match(infoPage, /id="account-orders"/);
  assert.match(infoPage, /whatsappHref/);
  assert.doesNotMatch(infoPage, /secure Shopify account page|SHOPIFY_ACCOUNT_URL|myshopify/);
});

test("homepage hero remains CMS-first", async () => {
  const [home, hero] = await Promise.all([
    source("src/routes/index.tsx"),
    source("src/components/HomeHero.tsx"),
  ]);
  assert.doesNotMatch(home, /ensureQueryData\(newestQueryOptions\(\)\)/);
  assert.match(home, /collectionQueryOptions\(HOME_HERO_COLLECTION_HANDLE, 4\)/);
  assert.match(home, /cmsHeroSlides=\{cms\.heroSlides\}/);
  assert.match(home, /const firstCmsHero = cms\.heroSlides\[0\]/);
  assert.match(home, /rel: "preload", as: "image"/);
  assert.match(home, /media: "\(max-width: 639px\)"/);
  assert.match(home, /media: "\(min-width: 640px\)"/);
  assert.match(hero, /localizeHeroSlide/);
  assert.match(hero, /const usingCms = localizedCmsSlides\.length > 0/);
  assert.match(hero, /"supabase-cms"/);
});


test("brands page uses CMS/dashboard logos without loading collections", async () => {
  const [brandsPage, brandDirectory] = await Promise.all([
    source("src/routes/brands.tsx"),
    source("src/lib/brandDirectory.ts"),
  ]);

  assert.doesNotMatch(brandsPage, /collectionsQueryOptions/);
  assert.match(brandsPage, /buildShopifyBrands\(catalog\.brands, undefined\)/);
  assert.match(brandDirectory, /override\?\.logo_url\?\.trim\(\)/);
  assert.match(brandDirectory, /\{ image: override\.logo_url\.trim\(\) \}/);
});
