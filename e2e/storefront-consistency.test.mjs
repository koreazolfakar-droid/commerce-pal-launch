import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");
const withoutComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

test("curated broken-brand assets are static local URLs and raw SVG markup is rejected", async () => {
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

  assert.match(brandLogo, /safeImageSource/);
  assert.match(brandLogo, /<\\s\*svg\\b/);
  assert.match(brandLogo, /builtInIsLocal/);
  for (const name of ["apple", "xiaomi", "anker", "poco", "tecno"]) {
    assert.match(brands, new RegExp(`/${name}\\.(?:svg|png)`));
  }
  assert.doesNotMatch(brands, /from "@\/assets\/brands\//);
});

test("shared footer is deterministic and hides technical build data", async () => {
  const footer = await source("src/components/SiteFooter.tsx");
  const runtimeFooter = withoutComments(footer);

  assert.doesNotMatch(runtimeFooter, /catalogQueryOptions|shopPoliciesQueryOptions|useQuery\(/);
  assert.doesNotMatch(runtimeFooter, /STORE_VERSION|app-version|No brands yet|لا توجد علامات بعد/);
  assert.doesNotMatch(runtimeFooter, /wa\.me\//);
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

test("hero uses Shopify collection artwork and routes to the matching collection", async () => {
  const home = await source("src/routes/index.tsx");
  const hero = await source("src/components/HomeHero.tsx");

  assert.doesNotMatch(home, /ensureQueryData\(newestQueryOptions\(\)\)/);
  assert.doesNotMatch(home, /Newsletter/);
  assert.match(home, /collectionQueryOptions\(HOME_HERO_COLLECTION_HANDLE, 4\)/);
  assert.match(home, /<HomeHero products=\{products\} heroCollection=\{heroCollection\} \/>/);
  assert.match(hero, /const image = activeSlide\?\.image/);
  assert.match(hero, /to="\/collections\/\$handle"/);
  assert.match(hero, /params=\{\{ handle: activeSlide\.handle \}\}/);
  assert.match(hero, /alt=\{image\.altText \?\? activeSlide\.title \?\? "Space Call"\}/);
  assert.doesNotMatch(hero, /products\[0\]|featuredProduct|featuredNode|Latest arrival|أحدث وصول/);
});
