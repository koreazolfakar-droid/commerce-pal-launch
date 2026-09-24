import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("sitemap is generated from the native storefront facade", async () => {
  const sitemap = await source("src/routes/sitemap[.]xml.ts");
  assert.match(sitemap, /fetchCatalogProducts/);
  assert.match(sitemap, /fetchCollections/);
  assert.match(sitemap, /@\/lib\/storefrontData/);
  assert.doesNotMatch(sitemap, /storefrontApiRequest|SHOPIFY_|myshopify/);
  assert.doesNotMatch(sitemap, /<changefreq>|<priority>/);
});

test("global crawler metadata stays indexable without fake hreflang alternates", async () => {
  const root = await source("src/routes/__root.tsx");
  assert.match(root, /max-image-preview:large/);
  assert.match(root, /og:locale/);
  assert.doesNotMatch(root, /hrefLang:/);
});

test("product structured data exposes Google product and offer fields", async () => {
  const [seo, productRoute] = await Promise.all([
    source("src/lib/seo.ts"),
    source("src/routes/product.$handle.tsx"),
  ]);
  assert.match(seo, /"@type": "Product"/);
  assert.match(seo, /"@type": "Offer"/);
  assert.match(seo, /priceCurrency:/);
  assert.match(seo, /availability:/);
  assert.match(seo, /seller:/);
  assert.match(seo, /productPrimaryVariant/);
  assert.match(seo, /additionalProperty/);
  assert.doesNotMatch(seo, /mpn:\s*sku/);
  assert.match(seo, /gtin8/);
  assert.match(seo, /gtin12/);
  assert.match(seo, /gtin13/);
  assert.match(seo, /gtin14/);
  assert.match(productRoute, /jsonLd\(productJsonLd\(product\)\)/);
});

test("header account and tracking links stay first-party", async () => {
  const [header, infoPage] = await Promise.all([
    source("src/components/SiteHeader.tsx"),
    source("src/components/InfoPage.tsx"),
  ]);
  assert.match(header, /to="\/help"[\s\S]*?hash="track-order"/);
  assert.match(header, /to="\/help"[\s\S]*?hash="account-orders"/);
  assert.doesNotMatch(header, /myshopify\.com|SHOPIFY_ACCOUNT_URL/);
  assert.match(infoPage, /id="track-order"/);
  assert.match(infoPage, /id="account-orders"/);
  assert.doesNotMatch(infoPage, /SHOPIFY_ACCOUNT_URL|secure Shopify account page|myshopify\.com/);
});

test("commercial landing pages carry Lebanon search intent", async () => {
  const [shop, category, brand, collection] = await Promise.all([
    source("src/routes/shop.tsx"),
    source("src/routes/category.$slug.tsx"),
    source("src/routes/brand.$slug.tsx"),
    source("src/routes/collections.$handle.tsx"),
  ]);
  for (const page of [shop, category, brand, collection]) {
    assert.match(page, /Lebanon/);
    assert.match(page, /canonicalLink/);
  }
});


test("production canonical signals resolve to the www origin", async () => {
  const [config, robots] = await Promise.all([
    source("src/lib/storeConfig.ts"),
    source("public/robots.txt"),
  ]);
  assert.match(config, /https:\/\/www\.spacecallapp\.store/);
  assert.match(config, /normalized === "https:\/\/spacecallapp\.store"/);
  assert.match(robots, /Sitemap: https:\/\/www\.spacecallapp\.store\/sitemap\.xml/);
});

test("CMS canonical overrides stay on the Space Call origin", async () => {
  const seo = await source("src/lib/seo.ts");
  const home = await source("src/routes/index.tsx");
  const brands = await source("src/routes/brands.tsx");
  assert.match(seo, /resolved\.origin !== site\.origin/);
  assert.match(home, /canonicalLink\("\/", canonicalUrl\)/);
  assert.match(brands, /canonicalUrl\("\/brands", seo\?\.canonical_url\)/);
});

test("bare production host redirects permanently to canonical www without changing path or query", async () => {
  const server = await source("src/server.ts");
  assert.match(server, /CANONICAL_HOST = "www\.spacecallapp\.store"/);
  assert.match(server, /ALTERNATE_HOST = "spacecallapp\.store"/);
  assert.match(server, /status:\s*308/);
  assert.match(server, /Location:\s*url\.toString\(\)/);
  assert.match(server, /method !== "GET" && method !== "HEAD"/);
});
