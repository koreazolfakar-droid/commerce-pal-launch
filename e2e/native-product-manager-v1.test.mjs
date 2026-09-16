import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("native product manager stays isolated from Shopify writes", async () => {
  const [route, editor] = await Promise.all([
    read("src/routes/dashboard.products.tsx"),
    read("src/components/admin/ProductEditor.tsx"),
  ]);

  assert.match(route, /Space Call Native Catalog/);
  assert.match(route, /Shopify/);
  assert.match(route, /Untouched/);
  assert.match(editor, /store_products/);
  assert.match(editor, /store_product_variants/);
  assert.match(editor, /store_product_images/);

  assert.doesNotMatch(editor, /SHOPIFY_ADMIN_API_TOKEN/);
  assert.doesNotMatch(editor, /X-Shopify-Access-Token/);
  assert.doesNotMatch(editor, /productUpdate\s*\(/);
  assert.doesNotMatch(editor, /productCreate\s*\(/);
});

test("native catalog migration keeps staff-only writes and public active-only reads", async () => {
  const migration = await read("supabase/migrations/20260916111500_native_store_catalog.sql");

  assert.match(migration, /store_products_staff_write/);
  assert.match(migration, /private\.is_dashboard_staff\(\)/);
  assert.match(migration, /status = 'active'/);
  assert.match(migration, /store_variant_sync_product_summary/);
  assert.match(migration, /stock_quantity = coalesce\(next_stock, 0\)/);
  assert.match(migration, /base_price = coalesce\(next_price, base_price\)/);
});

test("product editor supports the core native product workflow", async () => {
  const editor = await read("src/components/admin/ProductEditor.tsx");

  assert.match(editor, /Product created/);
  assert.match(editor, /Product saved/);
  assert.match(editor, /Compare at price/);
  assert.match(editor, /SKU/);
  assert.match(editor, /Barcode/);
  assert.match(editor, /Variants & inventory/);
  assert.match(editor, /Upload image/);
  assert.match(editor, /Draft/);
  assert.match(editor, /Active/);
  assert.match(editor, /Archived/);
});

test("saved products archive safely instead of being hard-deleted", async () => {
  const editor = await read("src/components/admin/ProductEditor.tsx");

  assert.match(editor, /const archiveProduct = async/);
  assert.match(editor, /status: "archived"/);
  assert.match(editor, /Product archived and data preserved/);
  assert.match(editor, /Archive product without deleting its data/);
  assert.doesNotMatch(
    editor,
    /from\("store_products" as never\)[\s\S]{0,180}?\.delete\(\)/,
  );
});

test("product and variant pricing inputs validate before database writes", async () => {
  const editor = await read("src/components/admin/ProductEditor.tsx");

  assert.match(editor, /Currency must be 3 letters such as USD/);
  assert.match(editor, /Base price must be zero or greater/);
  assert.match(editor, /Compare-at price must be equal to or greater than the current price/);
  assert.match(editor, /Variant price must be zero or greater/);
  assert.match(editor, /Stock must be a whole number of zero or greater/);
  assert.match(editor, /variants\.length === 0/);
  assert.match(editor, /Base price \(from variants\)/);
});
