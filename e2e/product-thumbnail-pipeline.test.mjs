import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("product media stores a dedicated lightweight card thumbnail", async () => {
  const [migration, processing, catalog, types] = await Promise.all([
    read("supabase/migrations/20260929114340_product_image_card_thumbnails.sql"),
    read("src/dashboard/lib/imageProcessing.ts"),
    read("src/dashboard/data/catalog.ts"),
    read("src/integrations/supabase/types.ts"),
  ]);

  assert.match(migration, /add column if not exists thumbnail_url text/);
  assert.match(types, /thumbnail_url: string \| null/);

  assert.match(processing, /STOREFRONT_PRODUCT_THUMBNAIL_EDGE = 480/);
  assert.match(processing, /convertProductThumbnailToWebp/);
  assert.match(processing, /"strong"/);

  assert.match(catalog, /convertProductThumbnailToWebp\(source\)/);
  assert.match(catalog, /\/thumbnails\/\$\{unique\}\.webp/);
  assert.match(catalog, /thumbnail_url: uploaded\.thumbnailUrl/);
  assert.match(catalog, /thumbnailUrl: thumbnailData\.publicUrl/);
});

test("storefront cards prefer thumbnails while original product media stays available", async () => {
  const [storeTypes, nativeStore, rust, productCard, compactCard, deal, recent, search] =
    await Promise.all([
      read("src/lib/storeTypes.ts"),
      read("src/lib/nativeStore.ts"),
      read("backend/src/routes/catalog.rs"),
      read("src/components/ProductCard.tsx"),
      read("src/components/CompactProductCard.tsx"),
      read("src/components/DealSpotlight.tsx"),
      read("src/components/HomeSections.tsx"),
      read("src/components/SearchOverlay.tsx"),
    ]);

  assert.match(storeTypes, /thumbnailUrl\?: string/);
  assert.match(nativeStore, /STOREFRONT_IMAGE_SELECT = "product_id,url,thumbnail_url,alt_text,is_primary,sort_order"/);
  assert.match(nativeStore, /thumbnailUrl: image\.thumbnail_url/);
  assert.match(rust, /store_product_images\(url,thumbnail_url,alt_text,is_primary,sort_order\)/);
  assert.match(rust, /thumbnail_url: Option<String>/);

  for (const source of [productCard, compactCard, deal]) {
    assert.match(source, /image\?\.thumbnailUrl \?\? image\?\.url/);
  }
  assert.match(recent, /thumbnailUrl \?\? product\.node\.images\.edges\[0\]\.node\.url/);
  assert.match(search, /image\.thumbnailUrl \?\? image\.url/);
});

test("media cleanup treats thumbnails as referenced assets", async () => {
  const optimizer = await read("src/dashboard/data/globalImageOptimizer.ts");

  assert.match(optimizer, /select\("url,thumbnail_url"\)/);
  assert.match(optimizer, /addReferencedUrl\(referenced, row\.thumbnail_url\)/);
  assert.match(optimizer, /update\(\{ url: uploaded\.url, thumbnail_url: null \}\)/);
});
