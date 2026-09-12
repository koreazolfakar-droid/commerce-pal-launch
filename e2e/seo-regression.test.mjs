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
  assert.match(sitemap, /productLastmod/);
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

test("product structured data exposes supported GTIN fields and Lebanon seller context", async () => {
  const seo = await source("src/lib/seo.ts");

  assert.match(seo, /gtin8/);
  assert.match(seo, /gtin12/);
  assert.match(seo, /gtin13/);
  assert.match(seo, /gtin14/);
  assert.match(seo, /areaServed/);
  assert.match(seo, /name: "Lebanon"/);
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
