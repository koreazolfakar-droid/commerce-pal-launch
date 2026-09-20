import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("storefront product images use responsive Supabase variants without replacing originals", async () => {
  const [image, productImage, gallery] = await Promise.all([
    source("src/lib/image.ts"),
    source("src/components/ProductImage.tsx"),
    source("src/components/product/ProductGallery.tsx"),
  ]);

  assert.match(image, /RESPONSIVE_PRODUCT_WIDTHS = \[160, 240, 320, 480, 640, 828, 960, 1280, 1600, 1920\]/);
  assert.match(image, /\/functions\/v1\/responsive-image/);
  assert.match(image, /return url \|\| undefined/);
  assert.match(image, /path\.startsWith\("products\/"\)/);

  assert.match(productImage, /responsiveFailedUrl/);
  assert.match(productImage, /srcSet=\{responsiveSrcSet\}/);
  assert.match(productImage, /setResponsiveFailedUrl\(url\)/);
  assert.match(productImage, /setFailedUrl\(url\)/);

  assert.match(gallery, /responsiveFailures/);
  assert.match(gallery, /sizes="80px"/);
  assert.match(gallery, /cdnSrcSet\(image\.url, 1400\)/);
  assert.match(gallery, /markResponsiveFailure\(image\.url\)/);
});

test("dashboard product uploads preserve exact masters and clean derived variants", async () => {
  const catalog = await source("src/dashboard/data/catalog.ts");

  assert.match(catalog, /MAX_PRODUCT_MASTER_BYTES = 20 \* 1024 \* 1024/);
  assert.match(catalog, /master\.original/);
  assert.match(catalog, /display\.webp/);
  assert.match(catalog, /cacheControl: "31536000"/);
  assert.match(catalog, /productResponsiveVariantPath/);
  assert.match(catalog, /_responsive\/v1/);
  assert.match(catalog, /removeOwnedProductImageFile/);
});

test("free responsive-image edge pipeline is bounded, cached and high quality", async () => {
  const edge = await source("supabase/functions/responsive-image/index.ts");

  assert.match(edge, /MagickFormat\.WebP/);
  assert.match(edge, /WEBP_QUALITY = 92/);
  assert.match(edge, /ALLOWED_WIDTHS = new Set\(\[160, 240, 320, 480, 640, 828, 960, 1280, 1600, 1920\]\)/);
  assert.match(edge, /image_not_registered/);
  assert.match(edge, /public, max-age=31536000, immutable/);
  assert.match(edge, /preservedMasterPath/);
  assert.match(edge, /master\.original/);
});

test("cms-media accepts preserved product masters up to dashboard source limit", async () => {
  const migration = await source(
    "supabase/migrations/20260920080600_raise_cms_media_limit_for_lossless_masters.sql",
  );

  assert.match(migration, /20 \* 1024 \* 1024/);
  assert.match(migration, /where id = 'cms-media'/);
});
