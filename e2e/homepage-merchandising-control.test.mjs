import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [builder, preview, nativeStore, queries, storefront] = await Promise.all([
  readFile(new URL("../src/dashboard/pages/HomepageBuilder.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/homepagePreview.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/nativeStore.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/queries.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/index.tsx", import.meta.url), "utf8"),
]);

test("homepage builder exposes simple automatic and manual merchandising modes", () => {
  assert.match(builder, /Automatic · Best sellers/);
  assert.match(builder, /Automatic · Newest products/);
  assert.match(builder, /Manual · I choose and order products/);
  assert.match(builder, /function ManualProductPicker/);
  assert.match(builder, /Search product name, brand, category or SKU/);
  assert.match(builder, /the first product here is the first product customers see/);
  assert.match(builder, /listDashboardProducts/);
  assert.match(builder, /manualProductIds/);
  assert.match(builder, /manual-product-id/);
  assert.match(builder, /Drag to reorder on desktop/);
  assert.match(builder, /ids\.length >= 10/);
  assert.match(builder, /needsManualProducts/);
  assert.match(builder, /\[needsManualProducts, productsReady\]/);
});

test("manual preview preserves dashboard product order", () => {
  assert.match(preview, /manualIds\(section\)/);
  assert.match(preview, /requestedOrder/);
  assert.match(preview, /new Map\(requestedOrder\.map/);
  assert.match(preview, /order\.get\(a\.id\)/);
});

test("storefront can fetch exact manually selected products by id in configured order", () => {
  assert.match(nativeStore, /export async function fetchProductsByIds/);
  assert.match(nativeStore, /\.in\("id", normalizedIds\)/);
  assert.match(nativeStore, /order\.get\(a\.node\.id\)/);
  assert.match(queries, /productsByIdsQueryOptions/);
});

test("configured manual homepage source preserves the CMS-selected order", () => {
  const start = nativeStore.indexOf("export async function fetchHomepageConfiguredProducts");
  const end = nativeStore.indexOf("export async function fetchNewestProducts", start);
  const configured = nativeStore.slice(start, end);
  assert.match(configured, /config\.source === "manual"/);
  assert.match(configured, /fetchProductsByIds\(config\.manualProductIds \?\? \[\]\)/);
  assert.match(configured, /\.slice\(0, count\)/);
});

test("live featured rail honors every dashboard product source", () => {
  assert.match(storefront, /cmsFeaturedProductConfig/);
  assert.match(storefront, /homepageConfiguredProductsQueryOptions\(featuredProductConfig\)/);
  assert.match(nativeStore, /export async function fetchHomepageConfiguredProducts/);
  for (const source of ["best_sellers", "newest", "manual", "collection", "brand", "category"]) {
    assert.match(nativeStore, new RegExp(source));
  }
  assert.match(preview, /source === "newest"/);
  assert.match(storefront, /configuredFeaturedProducts\.filter\(isHomepageMerchandise\)/);
  assert.match(storefront, /takeUniqueProducts/);
});
