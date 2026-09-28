import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [app, routes, catalog, data, variants, products, form, migration, atomicSave, types] = await Promise.all([
  readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/config/routes.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/productManagement.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/products/ProductVariantManager.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/ProductsPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/ProductFormPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260919082451_product_management_step5.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260928084456_atomic_product_editor_save_20260928.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/integrations/supabase/types.ts", import.meta.url), "utf8"),
]);

test("dashboard routes lazy-load the Step 5 product pages", () => {
  assert.match(routes, /const productsPage = lazyPage\(\(\) => import\("@\/dashboard\/pages\/ProductsPage"\)\)/);
  assert.match(routes, /const productFormPage = lazyPage\(\(\) => import\("@\/dashboard\/pages\/ProductFormPage"\)\)/);
  assert.match(routes, /id: "products"[\s\S]*path: "\/dashboard\/products"[\s\S]*page: productsPage/);
  assert.match(routes, /id: "products-new"[\s\S]*path: "\/dashboard\/products\/new"[\s\S]*page: productFormPage/);
  assert.match(routes, /id: "product-detail"[\s\S]*productFormPage[\s\S]*params\.id/);
  assert.match(app, /resolveDashboardRoute\(route\)/);
  assert.doesNotMatch(app, /import ProductsPageLive from/);
  assert.doesNotMatch(app, /import ProductFormPageLive from/);
});

test("multi-variant product save cannot overwrite variant-derived summaries", () => {
  assert.match(catalog, /save_store_product_editor/);
  assert.match(atomicSave, /select count\(\*\)[\s\S]*into v_variant_count/);
  assert.match(atomicSave, /if v_variant_count <= 1 then/);
  assert.match(
    atomicSave,
    /sku = case[\s\S]*when v_variant_count <= 1[\s\S]*else v_product\.sku/,
  );
  assert.match(
    atomicSave,
    /barcode = case[\s\S]*when v_variant_count <= 1[\s\S]*else v_product\.barcode/,
  );
});

test("product editor core persists in one PostgreSQL transaction", () => {
  assert.match(catalog, /looseSupabase\.rpc\([\s\S]*"save_store_product_editor"/);
  assert.match(atomicSave, /create or replace function public\.save_store_product_editor/);
  assert.match(atomicSave, /security invoker/);
  assert.match(atomicSave, /perform public\.set_store_product_collections/);
  assert.match(atomicSave, /insert into public\.store_product_variants/);
  assert.match(atomicSave, /update public\.store_product_variants/);
  assert.match(atomicSave, /insert into public\.store_inventory_movements/);
  assert.match(atomicSave, /reference_type,[\s\S]*'product_editor'/);
  assert.match(atomicSave, /store_product_images/);
  assert.match(atomicSave, /pg_advisory_xact_lock/);
  assert.match(
    atomicSave,
    /grant execute on function public\.save_store_product_editor[\s\S]*to authenticated/,
  );
  assert.doesNotMatch(catalog, /set_store_product_collections/);
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
  assert.match(variants, />\s*Retry/);
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

