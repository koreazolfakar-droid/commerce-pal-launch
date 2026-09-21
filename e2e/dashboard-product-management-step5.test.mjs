import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [app, catalog, data, variants, products, form, migration, types] = await Promise.all([
  readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/productManagement.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/products/ProductVariantManager.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/ProductsPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/ProductFormPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260919082451_product_management_step5.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/integrations/supabase/types.ts", import.meta.url), "utf8"),
]);

test("dashboard routes use the Step 5 product pages", () => {
  assert.match(app, /route === "\/dashboard\/products"\)\s+content = <ProductsPageLive \/>/);
  assert.match(app, /route === "\/dashboard\/products\/new"\)\s+content = <ProductFormPageLive \/>/);
  assert.match(app, /productDetail\)\s+content = <ProductFormPageLive id=\{productDetail\[1\]\} \/>/);
});

test("multi-variant product save cannot overwrite variant-derived summaries", () => {
  assert.match(catalog, /preexistingVariants\.length > 1/);
  assert.match(catalog, /variantManagedSeparately\s*\? \{\}/);
  assert.match(catalog, /base_price: input\.price/);
  assert.match(catalog, /stock_quantity: Math\.max/);
});

test("variant manager uses atomic RPCs and inventory-aware stock updates", () => {
  assert.match(data, /rpc\("create_store_product_variant"/);
  assert.match(data, /rpc\("update_store_product_variant"/);
  assert.match(data, /rpc\("reorder_store_product_variants"/);
  assert.match(data, /rpc\("delete_store_product_variant_safe"/);
  assert.match(variants, /Color/);
  assert.match(variants, /Storage \/ capacity/);
  assert.match(variants, /SKU/);
  assert.match(variants, /Barcode/);
  assert.match(variants, /Track inventory/);
  assert.match(variants, /Allow backorder/);
  assert.match(variants, /uploadDashboardVariantImage/);
  assert.match(migration, /insert into public\.store_inventory_movements/);
  assert.match(migration, /'variant_manager'/);
});

test("variant loading is stable across product-form rerenders and exposes recovery UI", () => {
  assert.match(form, /useCallback/);
  assert.match(form, /const handleSingleVariantChange = useCallback/);
  assert.match(variants, /onCountChangeRef/);
  assert.match(variants, /onSingleVariantChangeRef/);
  assert.match(variants, /const publishState = useCallback/);
  assert.match(variants, /setLoadError\(message\)/);
  assert.match(variants, />Retry</);
});

test("product management supports multi-collection, duplication, bulk status and safe deletion", () => {
  assert.match(data, /set_store_product_collections/);
  assert.match(data, /duplicate_store_product/);
  assert.match(data, /set_store_products_status/);
  assert.match(data, /delete_store_product_safe/);
  assert.match(form, /multiple collections/);
  assert.match(products, /Move to draft/);
  assert.match(products, /Archive/);
  assert.match(products, /duplicateDashboardProduct/);
  assert.match(migration, /'draft'/);
  assert.match(migration, /null,null,0/);
  assert.match(migration, /product has order or inventory history; archive it instead/);
});

test("Step 5 RPCs are caller-RLS functions with explicit authenticated grants", () => {
  const securityInvokerCount = (migration.match(/security invoker/g) ?? []).length;
  assert.ok(securityInvokerCount >= 8);
  assert.doesNotMatch(migration, /security definer/i);
  assert.match(migration, /grant execute on function public\.duplicate_store_product\(uuid\) to authenticated/);
  assert.match(migration, /grant execute on function public\.create_store_product_variant/);
  assert.match(migration, /grant execute on function public\.update_store_product_variant/);
  assert.doesNotMatch(data, /service_role|SUPABASE_SERVICE_ROLE|sb_secret_/);
});

test("generated Supabase types include Step 5 RPC contracts", () => {
  assert.match(types, /create_store_product_variant:/);
  assert.match(types, /update_store_product_variant:/);
  assert.match(types, /duplicate_store_product:/);
  assert.match(types, /set_store_product_collections:/);
  assert.match(types, /set_store_products_status:/);
  assert.match(types, /delete_store_product_safe:/);
});

