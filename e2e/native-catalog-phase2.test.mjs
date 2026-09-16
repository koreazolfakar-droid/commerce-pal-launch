import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("phase 2 product manager supports native images and multi variants", async () => {
  const manager = await read("src/components/admin/NativeCatalogManager.tsx");

  assert.match(manager, /store_product_variants/);
  assert.match(manager, /store_product_images/);
  assert.match(manager, /uploadMedia/);
  assert.match(manager, /colorText/);
  assert.match(manager, /storageText/);
  assert.match(manager, /options\.color/);
  assert.match(manager, /options\.storage/);
  assert.match(manager, /image_url/);
  assert.match(manager, /Variant image/);
  assert.match(manager, /Product images/);
});

test("phase 2 product metadata links native brands and categories", async () => {
  const manager = await read("src/components/admin/NativeCatalogManager.tsx");

  assert.match(manager, /cms_brands/);
  assert.match(manager, /store_categories/);
  assert.match(manager, /brand_id/);
  assert.match(manager, /category_id/);
  assert.match(manager, /\/dashboard\/brands/);
  assert.match(manager, /\/dashboard\/categories/);
});

test("phase 2 remains isolated from Shopify Admin writes", async () => {
  const manager = await read("src/components/admin/NativeCatalogManager.tsx");

  assert.doesNotMatch(manager, /SHOPIFY_ADMIN_API_TOKEN/);
  assert.doesNotMatch(manager, /X-Shopify-Access-Token/);
  assert.doesNotMatch(manager, /productCreate\s*\(/);
  assert.doesNotMatch(manager, /productUpdate\s*\(/);
  assert.match(manager, /No writes are sent to Shopify/);
});

test("variant lifecycle is non destructive and product summary stays database driven", async () => {
  const [manager, migration] = await Promise.all([
    read("src/components/admin/NativeCatalogManager.tsx"),
    read("supabase/migrations/20260916111500_native_store_catalog.sql"),
  ]);

  assert.match(manager, /is_active/);
  assert.match(manager, /Disabled and preserved/);
  assert.doesNotMatch(manager, /from\("store_product_variants" as never\)[\s\S]{0,120}\.delete\(/);
  assert.match(migration, /store_variant_sync_product_summary/);
  assert.match(migration, /stock_quantity = coalesce\(next_stock, 0\)/);
  assert.match(migration, /base_price = coalesce\(next_price, base_price\)/);
});

test("image upload keeps the established dashboard media safety limits", async () => {
  const media = await read("src/lib/adminMedia.ts");

  assert.match(media, /MAX_MEDIA_BYTES = 10 \* 1024 \* 1024/);
  assert.match(media, /image\/webp/);
  assert.match(media, /image\/avif/);
  assert.match(media, /upsert: false/);
});
