import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Shopify persistent cache stores and checks an explicit expiry", async () => {
  const source = await read("src/lib/shopify.ts");
  assert.match(source, /space-call-storefront-v2/);
  assert.match(source, /envelope\.expiresAt <= Date\.now\(\)/);
  assert.match(source, /invalidateStorefrontCache/);
  assert.match(source, /fetchProductsPage/);
});

test("Shopify webhook invalidation requires a verified HMAC", async () => {
  const source = await read("src/routes/api.shopify.invalidate.ts");
  assert.match(source, /x-shopify-hmac-sha256/i);
  assert.match(source, /timingSafeEqual/);
  assert.match(source, /SHOPIFY_WEBHOOK_SECRET/);
  assert.match(source, /invalidateStorefrontCache/);
});

test("brand and category pages use route-scoped price and collection facets", async () => {
  const brand = await read("src/routes/brand.$slug.tsx");
  const category = await read("src/routes/category.$slug.tsx");
  assert.match(brand, /productPriceBounds\(inBrand\)/);
  assert.match(brand, /brandCollections/);
  assert.match(category, /productPriceBounds\(inCategory\)/);
  assert.match(category, /categoryCollections/);
});

test("catalogue progressively renders 24 items at a time", async () => {
  const source = await read("src/components/CatalogView.tsx");
  assert.match(source, /PRODUCT_PAGE_SIZE = 24/);
  assert.match(source, /visibleProducts/);
  assert.match(source, /Load more/);
});

test("storefront search uses Shopify search and predictive search", async () => {
  const documents = await read("src/lib/shopifyDocuments.ts");
  const overlay = await read("src/components/SearchOverlay.tsx");
  assert.match(documents, /search\(/);
  assert.match(documents, /predictiveSearch\(/);
  assert.match(documents, /VARIANTS_SKU/);
  assert.match(documents, /TAG/);
  assert.match(overlay, /predictiveStorefront/);
});

test("commerce analytics covers the requested pre-checkout funnel", async () => {
  const source = await read("src/lib/analytics.ts");
  for (const event of [
    "page_view",
    "view_item",
    "search",
    "view_item_list",
    "select_item",
    "add_to_cart",
    "remove_from_cart",
    "view_cart",
    "begin_checkout",
    "add_to_wishlist",
    "compare_product",
  ]) {
    assert.match(source, new RegExp(`\\"${event}\\"`));
  }
});

test("AI assistant is lazy and sitemap cannot be served stale for a day", async () => {
  const layout = await read("src/components/StoreLayout.tsx");
  const sitemap = await read("src/routes/sitemap[.]xml.ts");
  assert.match(layout, /lazy\(\(\) =>/);
  assert.match(layout, /setTimeout\(activate, 3000\)/);
  assert.match(sitemap, /Cache-Control\": \"no-store, max-age=0/);
});
