import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("sitemap uses lightweight paginated Supabase data with truthful lastmod", async () => {
  const [sitemap, nativeStore] = await Promise.all([
    source("src/routes/sitemap[.]xml.ts"),
    source("src/lib/nativeStore.ts"),
  ]);
  assert.match(sitemap, /publicSupabase/);
  assert.match(sitemap, /QUERY_PAGE_SIZE\s*=\s*1000/);
  assert.match(sitemap, /\.range\(offset, offset \+ QUERY_PAGE_SIZE - 1\)/);
  assert.match(sitemap, /updated_at/);
  assert.match(sitemap, /MAX_SITEMAP_URLS\s*=\s*50_000/);
  assert.match(sitemap, /nonEmptyCollectionIds/);
  assert.match(sitemap, /managedCategories/);
  assert.doesNotMatch(sitemap, /fetchCatalogProducts\(500\)|@\/lib\/storefrontData/);
  assert.doesNotMatch(sitemap, /storefrontApiRequest|SHOPIFY_|myshopify/);
  assert.doesNotMatch(sitemap, /<changefreq>|<priority>/);
  assert.match(nativeStore, /"updated_at"/);
  assert.match(nativeStore, /updatedAt:\s*row\.updated_at/);
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

test("merchant product markup stays truthful for condition, returns, and sale pricing", async () => {
  const seo = await source("src/lib/seo.ts");
  const infoPages = await source("src/lib/infoPages.ts");
  assert.match(seo, /"@type": "OnlineStore"/);
  assert.match(seo, /merchantReturnLink: absoluteUrl\("\/returns"\)/);
  assert.match(seo, /RefurbishedCondition/);
  assert.match(seo, /UsedCondition/);
  assert.match(seo, /NewCondition/);
  assert.match(seo, /StrikethroughPrice/);
  assert.match(seo, /UnitPriceSpecification/);
  assert.match(infoPages, /merchantReturnPolicyJsonLd/);
});

test("faceted listing URLs are kept out of crawl while search remains crawlable for noindex", async () => {
  const [robots, search] = await Promise.all([
    source("public/robots.txt"),
    source("src/routes/search.tsx"),
  ]);
  assert.match(robots, /Disallow: \/shop\?\*/);
  assert.match(robots, /Disallow: \/category\/\*\?\*/);
  assert.match(robots, /Disallow: \/brand\/\*\?\*/);
  assert.match(robots, /Disallow: \/collections\/\*\?\*/);
  assert.doesNotMatch(robots, /Disallow: \/search/);
  assert.match(search, /noindex, follow/);
});

test("empty commerce landing pages are not indexable", async () => {
  const pages = await Promise.all([
    source("src/routes/shop.tsx"),
    source("src/routes/categories.tsx"),
    source("src/routes/brands.tsx"),
    source("src/routes/collections.index.tsx"),
    source("src/routes/category.$slug.tsx"),
    source("src/routes/brand.$slug.tsx"),
    source("src/routes/collections.$handle.tsx"),
    source("src/routes/used-phones.tsx"),
  ]);
  for (const page of pages) {
    assert.match(page, /noindex, follow/);
  }
});

test("FAQ remains a normal content page without deprecated Google FAQ rich-result markup", async () => {
  const infoPages = await source("src/lib/infoPages.ts");
  assert.doesNotMatch(infoPages, /FAQPage/);
  assert.doesNotMatch(infoPages, /acceptedAnswer/);
  assert.match(infoPages, /faq:\s*\{[\s\S]*?schemaType:\s*"WebPage"/);
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
  assert.match(brands, /url:\s*canonical/);
  assert.match(brands, /applyCmsBrands\(buildStoreBrands\(loaderData\.catalog\.brands/);
});

test("website schema keeps site-name support without retired sitelinks search markup", async () => {
  const seo = await source("src/lib/seo.ts");
  assert.match(seo, /"@type": "WebSite"/);
  assert.doesNotMatch(seo, /SearchAction/);
  assert.doesNotMatch(seo, /search_term_string/);
});

test("Arabic landing emits Arabic social locale and SSR document language", async () => {
  const [root, ar, i18n] = await Promise.all([
    source("src/routes/__root.tsx"),
    source("src/routes/ar.tsx"),
    source("src/lib/i18n.tsx"),
  ]);
  assert.match(ar, /locale:\s*"ar_LB"/);
  assert.match(ar, /alternateLocale:\s*"en_LB"/);
  assert.match(root, /useLocation/);
  assert.match(root, /pathname === "\/ar"/);
  assert.match(root, /lang=\{isArabicLanding \? "ar" : "en"\}/);
  assert.match(root, /dir=\{isArabicLanding \? "rtl" : "ltr"\}/);
  assert.match(i18n, /forceArabic = location\.pathname === "\/ar"/);
});

test("product breadcrumbs use the resolved commerce category when available", async () => {
  const productRoute = await source("src/routes/product.$handle.tsx");
  assert.match(productRoute, /const category = primaryCategory\(product\)/);
  assert.match(productRoute, /category\.label/);
  assert.match(productRoute, /\/category\/\$\{category\.slug\}/);
});

test("sitemap fails closed instead of publishing a partial URL set", async () => {
  const sitemap = await source("src/routes/sitemap[.]xml.ts");
  assert.match(sitemap, /Sitemap data is temporarily unavailable/);
  assert.match(sitemap, /status:\s*503/);
  assert.match(sitemap, /"Retry-After":\s*"300"/);
  assert.match(sitemap, /productResult\.status === "rejected"/);
  assert.match(sitemap, /supportResult\.status === "rejected"/);
});


test("category aliases converge on the managed Supabase canonical URLs", async () => {
  const [canonical, categoryRoute, sitemap, footer, header, product, showcase] =
    await Promise.all([
      source("src/lib/categoryCanonical.ts"),
      source("src/routes/category.$slug.tsx"),
      source("src/routes/sitemap[.]xml.ts"),
      source("src/components/SiteFooter.tsx"),
      source("src/components/SiteHeader.tsx"),
      source("src/routes/product.$handle.tsx"),
      source("src/components/BrandShowcaseSections.tsx"),
    ]);

  for (const [legacy, target] of [
    ["smartphones", "smartphone"],
    ["tablets", "tablet"],
    ["smartwatches", "smart-watch"],
    ["chargers", "charger"],
    ["cables", "cable"],
    ["power-banks", "power-bank"],
  ]) {
    assert.match(canonical, new RegExp(`["']${legacy}["']\\s*:\\s*["']${target}["']`));
  }

  assert.match(categoryRoute, /canonicalCategorySlug\(params\.slug\)/);
  assert.match(categoryRoute, /canonicalSlug !== params\.slug/);
  assert.match(sitemap, /isCanonicalCategorySlug\(category\.slug\)/);
  assert.match(footer, /canonicalCategorySlug\(entry\.slug\)/);
  assert.match(header, /canonicalCategorySlug/);
  assert.match(product, /canonicalCategorySlug\(category\.slug\)/);
  assert.match(showcase, /canonicalCategorySlug\(category\.slug\)/);
});
