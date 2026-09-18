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

test("no-Shopify staging adapter is local-only and keeps brand queries short-lived", async () => {
  const shopify = withoutComments(await source("src/lib/shopify.ts"));
  const queries = await source("src/lib/queries.ts");

  assert.match(shopify, /SHOPIFY_API_VERSION = "local-test"/);
  assert.match(shopify, /SHOPIFY_STORE_PERMANENT_DOMAIN = "disabled\.local"/);
  assert.match(shopify, /SHOPIFY_STOREFRONT_URL = "local:\/\/space-call-storefront"/);
  assert.match(shopify, /const LOCAL_PRODUCTS: ShopifyProduct\[\]/);
  assert.match(shopify, /const LOCAL_COLLECTIONS: ShopifyCollection\[\]/);
  assert.match(shopify, /export async function storefrontApiRequest/);
  assert.doesNotMatch(shopify, /X-Shopify-Storefront-Access-Token/);
  assert.doesNotMatch(shopify, /process\.env\["SHOPIFY_STOREFRONT/);
  assert.doesNotMatch(shopify, /await fetch\(/);
  assert.doesNotMatch(shopify, /caches\.open\(/);

  assert.match(queries, /BRAND_COLLECTION_STALE_TIME = 60 \* 1000/);
  assert.match(queries, /brand-logo-cache-v5/);
  assert.match(queries, /staleTime: BRAND_COLLECTION_STALE_TIME/);
  assert.doesNotMatch(queries, /brand-logo-cache-v4/);
});

test("homepage catalog survives transient storefront failures across repeated refreshes", async () => {
  const queries = await source("src/lib/queries.ts");

  assert.match(queries, /CATALOG_REFRESH_FALLBACK_TTL_MS = 5 \* 60 \* 1000/);
  assert.match(queries, /CATALOG_REFRESH_FALLBACK_STORAGE_KEY = "space-call-catalog-refresh-fallback-v1"/);
  assert.match(queries, /window\.sessionStorage\.setItem\(CATALOG_REFRESH_FALLBACK_STORAGE_KEY/);
  assert.match(queries, /window\.sessionStorage\.getItem\(CATALOG_REFRESH_FALLBACK_STORAGE_KEY/);
  assert.match(queries, /Storefront catalog refresh failed; keeping the last successful catalog for this tab/);
  assert.match(queries, /allowing React Query to retry instead of caching an empty catalog/);
  assert.doesNotMatch(queries, /return buildCatalogIndex\(\[\]\)/);
  assert.match(queries, /STOREFRONT_QUERY_RETRY_COUNT = 3/);
  assert.match(queries, /retry: STOREFRONT_QUERY_RETRY_COUNT/);
  assert.match(queries, /retryDelay: storefrontRetryDelay/);
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

test("account support stays Space Call owned with no Shopify hand-off", async () => {
  const config = await source("src/lib/storeConfig.ts");
  const infoPage = await source("src/components/InfoPage.tsx");

  assert.match(config, /SHOP_ACCOUNT_URL = `\$\{SITE_URL\}\/help#account-orders`/);
  assert.doesNotMatch(config, /SHOPIFY_|shopifyDomain|shopifyApiVersion|myshopify/);
  assert.match(infoPage, /id="account-orders"/);
  assert.match(infoPage, /generalWhatsAppUrl\(\)/);
  assert.doesNotMatch(infoPage, /SHOPIFY_ACCOUNT_URL|secure Shopify account page|myshopify/);
});

test("homepage hero is Shopify-first, inert, high-resolution, and refresh-resilient", async () => {
  const home = await source("src/routes/index.tsx");
  const hero = await source("src/components/HomeHero.tsx");

  assert.doesNotMatch(home, /ensureQueryData\(newestQueryOptions\(\)\)/);
  assert.doesNotMatch(home, /Newsletter/);
  assert.match(home, /collectionQueryOptions\(HOME_HERO_COLLECTION_HANDLE, 4\)/);
  assert.match(home, /<HomeHero/);
  assert.match(home, /products=\{products\}/);
  assert.match(home, /heroCollection=\{heroCollection\}/);
  assert.match(hero, /cmsHeroSlides: _cmsHeroSlides/);
  assert.doesNotMatch(hero, /localizeHeroSlide/);
  assert.match(hero, /HERO_REFRESH_FALLBACK_STORAGE_KEY = "space-call-home-hero-refresh-fallback-v1"/);
  assert.match(hero, /window\.sessionStorage\.setItem\(HERO_REFRESH_FALLBACK_STORAGE_KEY/);
  assert.match(hero, /window\.sessionStorage\.getItem\(HERO_REFRESH_FALLBACK_STORAGE_KEY/);
  assert.match(hero, /const effectiveHeroCollection = heroCollection\?\.collection/);
  assert.match(hero, /const shopifyImage = shopifySlide\?\.image/);
  assert.match(hero, /heroFallbackProduct = effectiveHeroCollection\?\.products\.find/);
  assert.doesNotMatch(hero, /heroTargetProduct/);
  assert.doesNotMatch(hero, /to="\/collections\/\$handle"/);
  assert.doesNotMatch(hero, /to="\/product\/\$handle"/);
  assert.doesNotMatch(hero, /from "@tanstack\/react-router"/);
  assert.match(hero, /HERO_IMAGE_WIDTHS = \[640, 960, 1280, 1600, 1920, 2400, 2880\]/);
  assert.match(hero, /parsed\.searchParams\.set\("quality", "88"\)/);
  assert.match(hero, /src=\{heroCdnImage\(shopifyImage\.url, 1920\)\}/);
  assert.match(hero, /srcSet=\{heroCdnSrcSet\(shopifyImage\.url\)\}/);
  assert.match(hero, /sizes="100vw"/);
  assert.match(hero, /onError=\{\(\) => setFailedShopifySlideId\(shopifySlide\.id\)\}/);
  assert.match(hero, /key=\{`\$\{shopifySlide\.id\}:\$\{shopifyImage\.url\}`\}/);
  assert.match(hero, /data-hero-source=\{heroSource\}/);
  assert.match(hero, /hero-product-fallback/);
  assert.match(hero, /bg-gradient-to-br/);
  assert.match(hero, /src="\/logo\.svg"/);
  assert.doesNotMatch(hero, /_products\[0\]/);
});
