import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  cart,
  cartSync,
  checkout,
  checkoutClient,
  quickView,
  cartRoute,
  catalog,
  variants,
  inventory,
  brands,
  categories,
  collections,
  receiving,
  settings,
  router,
  nativeStore,
  storeTypes,
  taxonomy,
  productRoute,
  categoryRoute,
  brandRoute,
  collectionRoute,
  backorderMigration,
  retiredCiDebug,
] = await Promise.all([
  read("src/stores/cartStore.ts"),
  read("src/hooks/useCartSync.ts"),
  read("src/components/CheckoutDetailsForm.tsx"),
  read("src/lib/orderCheckout.ts"),
  read("src/components/product/QuickViewDialog.tsx"),
  read("src/routes/cart.tsx"),
  read("src/dashboard/data/catalog.ts"),
  read("src/dashboard/data/productManagement.ts"),
  read("src/dashboard/data/inventory.ts"),
  read("src/dashboard/data/brands.ts"),
  read("src/dashboard/data/categories.ts"),
  read("src/dashboard/data/collections.ts"),
  read("src/dashboard/data/receiving.ts"),
  read("src/dashboard/data/settings.ts"),
  read("src/router.tsx"),
  read("src/lib/nativeStore.ts"),
  read("src/lib/storeTypes.ts"),
  read("src/lib/taxonomy.ts"),
  read("src/routes/product.$handle.tsx"),
  read("src/routes/category.$slug.tsx"),
  read("src/routes/brand.$slug.tsx"),
  read("src/routes/collections.$handle.tsx"),
  read("supabase/migrations/20260926115500_fix_backorder_inventory_release.sql"),
  read("supabase/functions/ci-debug-log/index.ts"),
]);

test("single-variant product stock edits use the audited variant RPC", () => {
  const start = catalog.indexOf("export async function saveDashboardProduct");
  const end = catalog.indexOf("export type DashboardProductImage", start);
  assert.ok(start >= 0 && end > start);
  const save = catalog.slice(start, end);

  assert.match(save, /rpc\("update_store_product_variant"/);
  assert.match(save, /rpc\("create_store_product_variant"/);
  assert.doesNotMatch(save, /from\("store_product_variants"\)\s*\.update\(variantPayload\)/);
  assert.match(save, /broadcastStorefrontRefresh\(\)/);
});

test("native cart synchronizes price, availability and quantity from live products", () => {
  assert.match(cart, /fetchProductsByIds/);
  assert.match(cart, /export function cartItemMaxQuantity/);
  assert.match(cart, /variant\.stockQuantity/);
  assert.match(cart, /variant\.availableForSale/);
  assert.match(cart, /price: variant\.price/);
  assert.match(cart, /quantity: Math\.min\(Math\.max\(1, item\.quantity\), maxQuantity\)/);
  assert.match(cartSync, /subscribeStorefrontRefresh/);
  assert.match(cartSync, /void syncCart\(\)/);
  assert.match(cart, /fetchedProductIds/);
  assert.match(cart, /for \(const item of get\(\)\.items\)/);
});

test("all shopper quantity controls respect tracked on-hand stock", () => {
  assert.match(quickView, /const maxQuantity =/);
  assert.match(quickView, /max=\{maxQuantity\}/);
  assert.match(quickView, /amount <= maxQuantity/);
  assert.match(cartRoute, /item\.quantity >= maxQuantity/);
  assert.match(cartRoute, /cartItemMaxQuantity\(item\)/);
});

test("checkout keys are bound to the full payload and stale failures recover", () => {
  assert.match(checkoutClient, /function checkoutFingerprint/);
  for (const field of [
    "customer",
    "paymentMethod",
    "expectedSubtotal",
    "expectedDeliveryFee",
    "notes",
    "reference",
    "deliveryLocation",
  ]) {
    assert.match(checkoutClient, new RegExp(field));
  }
  assert.match(
    checkoutClient,
    /idempotency_key: await checkoutIdempotencyKey\(checkoutFingerprint\(input\)\)/,
  );
  assert.match(checkout, /clearCheckoutAttempt\(\)/);
  assert.match(checkout, /await syncCart\(\)/);
  assert.match(checkout, /Promise\.all\(\[syncCart\(\), refetchCms\(\)\]\)/);
});

test("backorders only decrement and release stock that physically existed", () => {
  assert.match(backorderMigration, /v_stock_decrement := least\(greatest\(v_stock, 0\), v_qty\)/);
  assert.match(backorderMigration, /stock_quantity = stock_quantity - v_stock_decrement/);
  assert.match(backorderMigration, /'sale',[\s\S]*-v_stock_decrement/);
  assert.match(backorderMigration, /group by \(duplicate_item ->> 'variant_id'\)::uuid/);
  assert.match(backorderMigration, /quantity_to_release/);
  assert.match(backorderMigration, /reference_type = 'order'/);
  assert.match(backorderMigration, /movement\.movement_type = 'sale'/);
  assert.match(
    backorderMigration,
    /stock_quantity = stock_quantity \+ v_item\.quantity_to_release/,
  );
  assert.doesNotMatch(
    backorderMigration,
    /stock_quantity = stock_quantity \+ v_item\.quantity,[\s\S]*Released after cancellation/,
  );
});

test("storefront refresh covers catalog, CMS and cross-tab cart state", () => {
  for (const source of [catalog, variants, inventory, brands, categories, collections, receiving]) {
    assert.match(source, /broadcastStorefrontRefresh\(\)/);
  }
  assert.match(settings, /broadcastStorefrontRefresh\(\)/);
  assert.match(router, /query\.queryKey\[0\] === "supabase"/);
  assert.match(router, /query\.queryKey\[0\] === "storefront"/);
});

test("dashboard SEO fields reach the actual storefront metadata", () => {
  assert.match(storeTypes, /seoTitle\?: string/);
  assert.match(storeTypes, /seoDescription\?: string/);
  assert.match(nativeStore, /seo_title/);
  assert.match(nativeStore, /seo_description/);
  assert.match(productRoute, /product\.node\.seoTitle/);
  assert.match(productRoute, /product\.node\.seoDescription/);
  assert.match(categoryRoute, /managedCategory\.seo_title/);
  assert.match(categoryRoute, /managedCategory\.seo_description/);
  assert.match(brandRoute, /seo_title,seo_description/);
  assert.match(collectionRoute, /collection\.seoTitle/);
  assert.match(collectionRoute, /collection\.seoDescription/);
});

test("brand identity uses the persisted slug and hidden brands stay hidden", () => {
  assert.match(storeTypes, /vendorSlug\?: string/);
  assert.match(storeTypes, /vendorHidden\?: boolean/);
  assert.match(nativeStore, /STOREFRONT_BRAND_SELECT = "id,name,slug"/);
  assert.match(nativeStore, /vendorHidden: Boolean\(row\.brand_id && !brand\)/);
  assert.match(taxonomy, /if \(product\.node\.vendorHidden\) return null/);
  assert.match(taxonomy, /const canonicalSlug = product\.node\.vendorSlug/);
  assert.ok(
    taxonomy.indexOf("const canonicalSlug = product.node.vendorSlug") <
      taxonomy.indexOf("for (const tag of product.node.tags"),
  );
});

test("homepage collection source filters active products before applying its display count", () => {
  const start = nativeStore.indexOf("export async function fetchHomepageConfiguredProducts");
  const end = nativeStore.indexOf("export async function fetchNewestProducts", start);
  const configured = nativeStore.slice(start, end);
  assert.match(configured, /store_collection_products/);
  assert.doesNotMatch(configured, /\.limit\(count\)[\s\S]*fetchProductsByIds/);
  assert.match(configured, /fetchProductsByIds\(links\.map/);
  assert.match(configured, /\.slice\(0, count\)/);
});

test("product media mutations serialize on the parent product row", async () => {
  const mediaMigration = await read(
    "supabase/migrations/20260926115600_atomic_product_media_mutations.sql",
  );
  assert.equal(
    (mediaMigration.match(/from public\.store_products[\s\S]*?for update/g) ?? []).length,
    3,
  );
});

test("brand metadata remains optional for route availability", () => {
  assert.match(brandRoute, /console\.warn\("Loading optional storefront brand metadata failed\."/);
  assert.match(brandRoute, /managedBrandResult\.error \? null : managedBrandResult\.data/);
});

test("retired CI log endpoint cannot write through a service-role client", () => {
  assert.match(retiredCiDebug, /ci_debug_log_retired/);
  assert.match(retiredCiDebug, /status: 410/);
  assert.doesNotMatch(retiredCiDebug, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(retiredCiDebug, /createClient/);
  assert.doesNotMatch(retiredCiDebug, /ci_debug_logs/);
});
