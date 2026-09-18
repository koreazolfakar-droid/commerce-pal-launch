import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("sitemap uses the provider-neutral catalog and meaningful lastmod data", async () => {
  const sitemap = await source("src/routes/sitemap[.]xml.ts");

  assert.match(sitemap, /fetchCatalogProducts\(PAGE_SIZE\)/);
  assert.match(sitemap, /fetchCollections\(PAGE_SIZE\)/);
  assert.match(sitemap, /productLastmod/);
  assert.doesNotMatch(sitemap, /storefrontApiRequest|shopifyDocuments|PRODUCTS_QUERY|COLLECTIONS_QUERY/);
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
  assert.match(seo, /gtin8/);
  assert.match(seo, /gtin12/);
  assert.match(seo, /gtin13/);
  assert.match(seo, /gtin14/);
  assert.match(seo, /areaServed/);
  assert.match(seo, /name: "Lebanon"/);
  assert.match(productRoute, /jsonLd\(productJsonLd\(product\)\)/);
});

test("header account and tracking links stay first-party", async () => {
  const [header, infoPage] = await Promise.all([
    source("src/components/SiteHeader.tsx"),
    source("src/components/InfoPage.tsx"),
  ]);

  assert.match(header, /href="\/help#track-order"/);
  assert.match(header, /href="\/help#account-orders"/);
  assert.doesNotMatch(header, /myshopify\.com/);
  assert.doesNotMatch(header, /SHOPIFY_ACCOUNT_URL/);
  assert.match(infoPage, /id="track-order"/);
  assert.match(infoPage, /id="account-orders"/);
  assert.match(infoPage, /generalWhatsAppUrl\(\)/);
  assert.doesNotMatch(infoPage, /SHOPIFY_ACCOUNT_URL|secure Shopify account page|myshopify/);
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
