import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared image pipeline supports selectable cached WebP compression previews", async () => {
  const [processing, preview] = await Promise.all([
    read("src/dashboard/lib/imageProcessing.ts"),
    read("src/dashboard/components/ImageOptimizationPreview.tsx"),
  ]);

  for (const preset of ["light", "balanced", "strong", "maximum"]) {
    assert.match(processing, new RegExp(`value: "${preset}"`));
  }
  assert.match(processing, /getImageCompressionPreset/);
  assert.match(processing, /setImageCompressionPreset/);
  assert.match(processing, /imageCompressionQuality/);
  assert.match(processing, /conversionCache/);
  assert.match(processing, /canvas\.toBlob\(resolve, "image\/webp", imageCompressionQuality\(compression\)\)/);

  assert.match(preview, /Compression/);
  assert.match(preview, /Preview is generated locally before upload/);
  assert.match(preview, /formatImageBytes\(item\.source\.bytes\)/);
  assert.match(preview, /formatImageBytes\(item\.output\.bytes\)/);
  assert.match(preview, /setImageCompressionPreset\(value\)/);
});

test("brand and category editors stage replacements and show compression before saving", async () => {
  const [brandForm, brandsPage, brandData, categoryForm] = await Promise.all([
    read("src/dashboard/components/brands/BrandForm.tsx"),
    read("src/dashboard/pages/BrandsPage.tsx"),
    read("src/dashboard/data/brands.ts"),
    read("src/dashboard/components/categories/CategoryForm.tsx"),
  ]);

  assert.match(brandForm, /pendingLogo/);
  assert.match(brandForm, /pendingCover/);
  assert.match(brandForm, /removeLogo/);
  assert.match(brandForm, /removeCover/);
  assert.match(brandForm, /Logo compression preview/);
  assert.match(brandForm, /Cover compression preview/);
  assert.match(brandsPage, /uploadDashboardBrandImage\(imageChange\.logoFile, "logo"\)/);
  assert.match(brandsPage, /uploadDashboardBrandImage\(imageChange\.coverFile, "cover"\)/);
  assert.match(brandData, /select\("logo_url,cover_image_url"\)/);
  assert.match(brandData, /removeDashboardBrandImage\(previousLogo\)/);
  assert.match(brandData, /removeDashboardBrandImage\(previousCover\)/);

  assert.match(categoryForm, /Category compression preview/);
  assert.match(categoryForm, /files=\{\[pendingImage\]\}/);
  assert.match(categoryForm, /resolution="1080"/);
});

test("all dashboard image upload surfaces preview compression before convertible uploads", async () => {
  const files = [
    "src/dashboard/components/products/ProductMediaManager.tsx",
    "src/dashboard/components/products/ProductVariantManager.tsx",
    "src/dashboard/pages/MediaLibraryPage.tsx",
    "src/dashboard/components/DashboardMediaPicker.tsx",
    "src/dashboard/pages/SettingsPage.tsx",
    "src/dashboard/pages/HeroBannersPage.tsx",
  ];

  for (const path of files) {
    const source = await read(path);
    assert.match(source, /ImageOptimizationPreview/, `${path} must use the shared compression preview`);
  }

  const products = await read(files[0]);
  assert.match(products, /Confirm & upload/);
  assert.match(products, /Confirm replacement/);

  const variants = await read(files[1]);
  assert.match(variants, /Variant image compression preview/);

  const media = await read(files[2]);
  assert.match(media, /Media compression preview/);

  const picker = await read(files[3]);
  assert.match(picker, /Upload compression preview/);

  const settings = await read(files[4]);
  assert.match(settings, /Store logo compression preview/);

  const hero = await read(files[5]);
  assert.match(hero, /Desktop hero compression preview/);
  assert.match(hero, /Mobile hero compression preview/);
});
