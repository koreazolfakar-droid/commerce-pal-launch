import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const catalog = await readFile(
  new URL("../src/dashboard/data/catalog.ts", import.meta.url),
  "utf8",
);
const nativeStore = await readFile(
  new URL("../src/lib/nativeStore.ts", import.meta.url),
  "utf8",
);
const productRoute = await readFile(
  new URL("../src/routes/product.$handle.tsx", import.meta.url),
  "utf8",
);

test("product edits preserve the existing public handle", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20260928050000_atomic_product_editor_save.sql", import.meta.url),
    "utf8",
  );
  const update = migration.slice(
    migration.indexOf("update public.store_products"),
    migration.indexOf("where id = v_product_id"),
  );
  assert.match(catalog, /"save_store_product_editor"/);
  assert.match(update, /title = btrim\(p_title\)/);
  assert.doesNotMatch(update, /^\s*handle\s*=/m);
  assert.match(migration, /'handle', v_product\.handle/);
});

test("product saves invalidate the storefront catalog cache", () => {
  assert.match(catalog, /invalidateNativeStoreCache\(\)/);
});

test("product detail fetch bypasses the catalog snapshot cache", () => {
  const start = nativeStore.indexOf("export async function fetchProductByHandle");
  const end = nativeStore.indexOf("export async function fetchCollections", start);
  assert.ok(start >= 0 && end > start, "fetchProductByHandle function should exist");
  const source = nativeStore.slice(start, end);
  assert.match(source, /from\("store_products"\)/);
  assert.match(source, /eq\("handle", normalized\)/);
  assert.match(source, /eq\("status", "active"\)/);
  assert.doesNotMatch(source, /loadSnapshot\(\)/);
});

test("product route resolves product data from the Supabase native store", () => {
  assert.match(productRoute, /fetchProductByHandle.*@\/lib\/storefrontData/s);
  assert.match(productRoute, /loader: async \(\{ params \}\) =>/);
  assert.match(productRoute, /fetchProductByHandle\(params\.handle\)/);
});
