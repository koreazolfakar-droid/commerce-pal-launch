import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("sitemap paginates Shopify and uses meaningful lastmod data", async () => {
  const [sitemap, documents] = await Promise.all([
    source("src/routes/sitemap[.]xml.ts"),
    source("src/lib/shopifyDocuments.ts"),
  ]);

  assert.match(sitemap, /storefrontApiRequest\(PRODUCTS_QUERY/);
  assert.match(sitemap, /pageInfo\?\.hasNextPage/);
  assert.match(sitemap, /isIndexableProduct/);
  assert.match(sitemap, /price > 0/);
  assert.match(sitemap, /productLastmod/);
  assert.match(sitemap, /categoryLastmods/);
  assert.match(sitemap, /brandLastmods/);
  assert.match(sitemap, /catalogLastmod/);
  assert.match(documents, /createdAt updatedAt tags/);
  assert.match(documents, /description updatedAt image/);
  assert.doesNotMatch(sitemap, /<changefreq>|<priority>/);
});

test("global crawler metadata stays indexable without fake hreflang alternates", async () => {
  const root = await source("src/routes/__root.tsx");

  assert.match(root, /max-image-preview:large/);
  assert.match(root, /og:locale/);
  assert.doesNotMatch(root, /hrefLang:/);
});

test("Arabic landing emits a single Arabic Open Graph locale", async () => {
  const [arabic, seo] = await Promise.all([
    source("src/routes/ar.tsx"),
    source("src/lib/seo.ts"),
  ]);

  assert.match(arabic, /locale: "ar_LB"/);
  assert.doesNotMatch(arabic, /property: "og:locale"/);
  assert.match(seo, /locale = "en_LB"/);
  assert.match(seo, /locale === "ar_LB" \? "en_LB" : "ar_LB"/);
});

test("Shopify SEO metadata is fetched and preferred for search snippets", async () => {
  const [documents, seo, collection, productRoute] = await Promise.all([
    source("src/lib/shopifyDocuments.ts"),
    source("src/lib/seo.ts"),
    source("src/routes/collections.$handle.tsx"),
    source("src/routes/product.$handle.tsx"),
  ]);

  assert.match(documents, /const SEO = `title description`/);
  assert.match(documents, /seo \{ \$\{SEO\} \}/);
  assert.match(seo, /merchantSeoDescription/);
  assert.match(seo, /productSeo\(product\)\?\.description/);
  assert.match(productRoute, /productSeoTitle\(product\)/);
  assert.match(collection, /collection\.seo\?\.title/);
  assert.match(collection, /collection\.seo\?\.description/);
});

test("product structured data exposes Google product and variant-accurate offer fields", async () => {
  const [seo, productRoute] = await Promise.all([
    source("src/lib/seo.ts"),
    source("src/routes/product.$handle.tsx"),
  ]);

  assert.match(seo, /"@type": "Product"/);
  assert.match(seo, /variants\.map/);
  assert.match(seo, /"@type": "Offer"/);
  assert.match(seo, /priceCurrency:/);
  assert.match(seo, /variant\.availableForSale/);
  assert.match(seo, /seller:/);
  assert.match(seo, /gtin8/);
  assert.match(seo, /gtin12/);
  assert.match(seo, /gtin13/);
  assert.match(seo, /gtin14/);
  assert.match(seo, /areaServed/);
  assert.match(seo, /name: "Lebanon"/);
  assert.match(productRoute, /jsonLd\(productJsonLd\(product\)\)/);
});

test("brand, category and collection directories expose crawlable list metadata", async () => {
  const [brands, categories, collections] = await Promise.all([
    source("src/routes/brands.tsx"),
    source("src/routes/categories.tsx"),
    source("src/routes/collections.index.tsx"),
  ]);

  for (const page of [brands, categories, collections]) {
    assert.match(page, /max-image-preview:large/);
    assert.match(page, /socialMeta/);
    assert.match(page, /breadcrumbJsonLd/);
    assert.match(page, /"@type": "ItemList"/);
    assert.match(page, /canonicalLink/);
  }

  assert.match(brands, /Phone & Electronics Brands in Lebanon/);
  assert.match(categories, /Phone & Electronics Categories in Lebanon/);
  assert.match(collections, /Electronics Collections in Lebanon/);
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
  assert.match(infoPage, /SHOPIFY_ACCOUNT_URL/);
  assert.match(infoPage, /secure Shopify account page/);
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
