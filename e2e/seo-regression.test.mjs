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

test("safe SEO phase keeps production runtime untouched", async () => {
  const [server, root, config] = await Promise.all([
    source("src/server.ts"),
    source("src/routes/__root.tsx"),
    source("src/lib/storeConfig.ts"),
  ]);
  assert.doesNotMatch(server, /canonicalHostRedirect|CANONICAL_HOST|ALTERNATE_HOST/);
  assert.doesNotMatch(root, /useLocation/);
  assert.match(root, /<html lang="en" suppressHydrationWarning>/);
  assert.match(config, /https:\/\/spacecallapp\.store/);
});

test("faceted crawl states are disallowed without changing the canonical host", async () => {
  const robots = await source("public/robots.txt");
  assert.match(robots, /Disallow: \/shop\?\*/);
  assert.match(robots, /Disallow: \/category\/\*\?\*/);
  assert.match(robots, /Disallow: \/brand\/\*\?\*/);
  assert.match(robots, /Disallow: \/collections\/\*\?\*/);
  assert.match(robots, /Sitemap: https:\/\/spacecallapp\.store\/sitemap\.xml/);
  assert.doesNotMatch(robots, /www\.spacecallapp\.store/);
});

test("product schema uses the primary variant and omits invalid zero-price offers", async () => {
  const seo = await source("src/lib/seo.ts");
  assert.match(seo, /productPrimaryVariant\(product\)/);
  assert.match(seo, /hasValidMerchantPrice/);
  assert.match(seo, /activePrice > 0/);
  assert.match(seo, /offers: hasValidMerchantPrice/);
  assert.doesNotMatch(seo, /mpn:\s*sku/);
  assert.match(seo, /UsedCondition/);
  assert.match(seo, /RefurbishedCondition/);
  assert.match(seo, /additionalProperty/);
});

test("CMS canonicals cannot point outside the current Space Call origin", async () => {
  const [seo, home, brands] = await Promise.all([
    source("src/lib/seo.ts"),
    source("src/routes/index.tsx"),
    source("src/routes/brands.tsx"),
  ]);
  assert.match(seo, /resolved\.origin !== site\.origin/);
  assert.match(home, /canonicalUrl\("\/", cmsSeo\?\.canonical_url\)/);
  assert.match(brands, /canonicalUrl\("\/brands", seo\?\.canonical_url\)/);
});

test("Arabic social metadata emits a single Arabic primary locale", async () => {
  const ar = await source("src/routes/ar.tsx");
  assert.match(ar, /locale:\s*"ar_LB"/);
  assert.match(ar, /alternateLocale:\s*"en_LB"/);
  assert.doesNotMatch(ar, /socialMeta\([\s\S]*?\),\s*\{ property: "og:locale"/);
});

test("commercial indexes noindex themselves when empty", async () => {
  const [categories, brands, collections, product] = await Promise.all([
    source("src/routes/categories.tsx"),
    source("src/routes/brands.tsx"),
    source("src/routes/collections.index.tsx"),
    source("src/routes/product.$handle.tsx"),
  ]);
  assert.match(categories, /"noindex, follow"/);
  assert.match(brands, /"noindex, follow"/);
  assert.match(collections, /"noindex, follow"/);
  assert.match(product, /const hasValidPrice = productPrice\(product\) > 0/);
  assert.match(product, /"noindex, follow"/);
});
