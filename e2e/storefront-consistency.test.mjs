import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");
const withoutComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

test("merchant brand artwork overrides curated local fallbacks and raw SVG markup is rejected", async () => {
  for (const asset of [
    "public/brand-logos/apple.svg",
    "public/brand-logos/xiaomi.svg",
    "public/brand-logos/anker.svg",
    "public/brand-logos/poco.png",
    "public/brand-logos/tecno.svg",
    "public/brand-logos/samsung.png",
    "public/brand-logos/ugreen.png",
    "public/brand-logos/vention.png",
  ]) {
    await access(new URL(asset, root));
  }

  const brandLogo = await source("src/components/BrandLogo.tsx");
  const brands = await source("src/lib/brands.ts");
  const brandDirectory = await source("src/lib/brandDirectory.ts");

  assert.match(brandLogo, /safeImageSource/);
  assert.match(brandLogo, /<\\s\*svg\\b/);
  assert.match(brandLogo, /merchant \? \[merchant, \.\.\.builtIn\] : builtIn/);
  assert.doesNotMatch(brandLogo, /builtInIsLocal/);
  assert.match(brandLogo, /PADDED_SQUARE_WORDMARKS = new Set\(\["ugreen"\]\)/);
  assert.match(brandLogo, /paddedSquareMerchantWordmark/);
  assert.match(brandLogo, /paddedSquareMerchantWordmark \? "object-cover" : "object-contain"/);
  assert.match(brandLogo, /imageAspectRatio >= 0\.85/);
  assert.match(brandLogo, /imageAspectRatio <= 1\.15/);
  assert.match(brandDirectory, /compactBrandIdentity/);
  assert.match(brandDirectory, /slugify\(value\)\.replace\(\/-\/g, ""\)/);
  assert.match(brandDirectory, /dedicatedCollectionBrandIdentity/);
  assert.match(brandDirectory, /const exact = exactCandidates\.find\(looksLikeLogoImage\);/);
  assert.doesNotMatch(brandDirectory, /exactCandidates\[0\]/);

  for (const name of ["apple", "xiaomi", "anker", "poco", "tecno"]) {
    assert.match(brands, new RegExp(`/${name}\\.(?:svg|png)`));
  }
  assert.doesNotMatch(brands, /from "@\/assets\/brands\//);
});

test("Shopify brand artwork cache refreshes quickly and cannot pin stale logos", async () => {
  const shopify = await source("src/lib/shopify.ts");
  const queries = await source("src/lib/queries.ts");

  assert.match(shopify, /PERSISTENT_STOREFRONT_CACHE_NAME = "space-call-storefront-v2"/);
  assert.match(shopify, /PERSISTENT_STOREFRONT_CACHE_TIMESTAMP_HEADER = "x-space-call-cached-at"/);
  assert.match(shopify, /Date\.now\(\) - cachedAt >= STOREFRONT_CACHE_TTL_MS/);
  assert.match(shopify, /await cache\.delete\(request\)/);
  assert.match(
    shopify,
    /\[PERSISTENT_STOREFRONT_CACHE_TIMESTAMP_HEADER\]: String\(Date\.now\(\)\)/,
  );
  assert.doesNotMatch(shopify, /caches\.open\("space-call-storefront-v1"\)/);
  assert.match(queries, /BRAND_COLLECTION_STALE_TIME = 60 \* 1000/);
  assert.match(queries, /brand-logo-cache-v5/);
  assert.match(queries, /staleTime: BRAND_COLLECTION_STALE_TIME/);
  assert.doesNotMatch(queries, /brand-logo-cache-v4/);
});

test("shared footer stays lightweight and hides technical build data", async () => {
  const footer = await source("src/components/SiteFooter.tsx");
  const runtimeFooter = withoutComments(footer);

  assert.doesNotMatch(runtimeFooter, /catalogQueryOptions|shopPoliciesQueryOptions/);
  assert.match(runtimeFooter, /cmsQueryOptions/);
  assert.doesNotMatch(runtimeFooter, /STORE_VERSION|app-version|No brands yet|لا توجد علامات بعد/);
  assert.match(runtimeFooter, /cmsWhatsApp/);
  assert.match(runtimeFooter, /https:\/\/wa\.me\/\$\{whatsappDigits\}/);
  assert.doesNotMatch(runtimeFooter, /https:\/\/wa\.me\/\d{6,}/);
  assert.match(runtimeFooter, /FOOTER_SHOP_LINKS/);
  assert.match(runtimeFooter, /FOOTER_BRAND_LINKS/);
  assert.match(runtimeFooter, /MessageCircle/);
});

test("HTML documents cannot remain stale across deploys", async () => {
  const server = await source("src/server.ts");

  assert.match(server, /Cache-Control", "no-store, max-age=0, must-revalidate"/);
  assert.match(server, /CDN-Cache-Control", "no-store"/);
  assert.match(server, /Surrogate-Control", "no-store"/);
  assert.doesNotMatch(server, /stale-while-revalidate|s-maxage=/);
});

test("account links stay branded before the Shopify hand-off", async () => {
  const config = await source("src/lib/storeConfig.ts");
  const infoPage = await source("src/components/InfoPage.tsx");

  assert.match(config, /SHOP_ACCOUNT_URL = `\$\{SITE_URL\}\/help#account-orders`/);
  assert.match(
    config,
    /SHOPIFY_ACCOUNT_URL = `https:\/\/\$\{STORE_CONFIG\.shopifyDomain\}\/account`/,
  );
  assert.match(infoPage, /id="account-orders"/);
  assert.match(infoPage, /secure Shopify account page/);
});

test("hero never becomes an empty black panel when remote artwork is unavailable", async () => {
  const home = await source("src/routes/index.tsx");
  const hero = await source("src/components/HomeHero.tsx");

  assert.doesNotMatch(home, /ensureQueryData\(newestQueryOptions\(\)\)/);
  assert.doesNotMatch(home, /Newsletter/);
  assert.match(home, /collectionQueryOptions\(HOME_HERO_COLLECTION_HANDLE, 4\)/);
  assert.match(home, /<HomeHero/);
  assert.match(home, /products=\{products\}/);
  assert.match(home, /heroCollection=\{heroCollection\}/);
  assert.match(home, /cmsHeroSlides=\{cms\.heroSlides\}/);
  assert.match(hero, /const shopifyImage = shopifySlide\?\.image/);
  assert.match(hero, /heroFallbackProduct = heroCollection\?\.products\.find/);
  assert.match(hero, /heroFallbackImage = heroFallbackProduct\?\.node\.images\.edges\[0\]\?\.node/);
  assert.match(hero, /onError=\{\(\) => setFailedCmsSlideId\(cmsSlide\.id\)\}/);
  assert.match(hero, /to="\/collections\/\$handle"/);
  assert.match(hero, /to="\/product\/\$handle"/);
  assert.match(hero, /data-hero-source=\{heroSource\}/);
  assert.match(hero, /hero-product-fallback/);
  assert.match(hero, /bg-gradient-to-br/);
  assert.match(hero, /src="\/logo\.svg"/);
  assert.doesNotMatch(hero, /_products\[0\]/);
});
