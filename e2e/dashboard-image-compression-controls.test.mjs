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
  assert.match(processing, /ImageBackgroundRemovalOptions/);
  assert.match(processing, /removeEdgeConnectedWhiteBackground/);
  assert.match(processing, /getImageData\(0, 0, width, height\)/);
  assert.match(processing, /putImageData\(imageData, 0, 0\)/);
  assert.match(processing, /bg:none/);

  assert.match(preview, /Compression/);
  assert.match(preview, /Preview is generated locally before upload/);
  assert.match(preview, /formatImageBytes\(item\.source\.bytes\)/);
  assert.match(preview, /formatImageBytes\(item\.output\.bytes\)/);
  assert.match(preview, /setImageCompressionPreset\(value\)/);
  assert.match(preview, /Transparent background preview/);
  assert.match(preview, /backgroundRemoval/);
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
  assert.match(brandForm, /Remove white background/);
  assert.match(brandForm, /logoBackgroundTolerance/);
  assert.match(brandForm, /Logo background removal tolerance/);
  assert.match(brandForm, /backgroundRemoval=/);
  assert.match(
    brandsPage,
    /uploadDashboardBrandImage\([\s\S]*imageChange\.logoFile,[\s\S]*"logo",[\s\S]*imageChange\.logoBackgroundRemoval/,
  );
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


test("global legacy optimizer covers all old dashboard image sources", async () => {
  const [page, globalUi, globalData, media] = await Promise.all([
    read("src/dashboard/pages/MediaLibraryPage.tsx"),
    read("src/dashboard/components/GlobalLegacyImageOptimizer.tsx"),
    read("src/dashboard/data/globalImageOptimizer.ts"),
    read("src/dashboard/data/media.ts"),
  ]);

  assert.match(page, /GlobalLegacyImageOptimizer/);
  assert.match(page, /enabled=\{canDelete\}/);
  assert.match(globalUi, /Global old-image WebP optimizer/);
  assert.match(globalUi, /Products, brands, categories, hero and media library/);
  assert.match(globalUi, /Analyze selected/);
  assert.match(globalUi, /Convert all ready/);
  assert.match(globalUi, /Current resolution/);
  assert.match(globalUi, /New resolution/);
  assert.match(globalUi, /Estimated saving/);
  assert.match(globalUi, /convertProductImageToWebp/);
  assert.match(globalUi, /replaceGlobalLegacyImageWithWebp/);

  for (const table of [
    "cms_media_assets",
    "store_product_images",
    "store_products",
    "cms_brands",
    "store_categories",
    "cms_hero_slides",
  ]) {
    assert.match(globalData, new RegExp(table));
  }
  assert.match(globalData, /logo_url/);
  assert.match(globalData, /cover_image_url/);
  assert.match(globalData, /mobile_image_url/);
  assert.match(globalData, /optimized\/\$\{assetRow\.source\}/);
  assert.match(globalData, /Only dashboard admins can optimize existing media/);
  assert.match(globalData, /replaceDashboardMediaAssetWithWebp/);
  assert.match(globalData, /invalidateNativeStoreCache/);

  assert.match(media, /replaceDashboardMediaAssetWithWebp/);
  assert.match(media, /role !== "admin"/);
  assert.match(media, /rollback failed/);
});


test("global legacy optimizer scans products brands categories hero and media safely", async () => {
  const [page, ui, data] = await Promise.all([
    read("src/dashboard/pages/MediaLibraryPage.tsx"),
    read("src/dashboard/components/GlobalLegacyImageOptimizer.tsx"),
    read("src/dashboard/data/globalImageOptimizer.ts"),
  ]);

  assert.match(page, /GlobalLegacyImageOptimizer/);
  assert.match(page, /enabled=\{canDelete\}/);

  assert.match(ui, /Global old-image WebP optimizer/);
  assert.match(ui, /Products/);
  assert.match(ui, /Brands/);
  assert.match(ui, /Categories/);
  assert.match(ui, /Hero/);
  assert.match(ui, /Media library/);
  assert.match(ui, /Analyze selected/);
  assert.match(ui, /Convert all ready/);
  assert.match(ui, /Current resolution/);
  assert.match(ui, /New resolution/);
  assert.match(ui, /Size change|Change/);
  assert.match(ui, /convertProductImageToWebp/);
  assert.match(ui, /replaceGlobalLegacyImageWithWebp/);

  assert.match(data, /cms_media_assets/);
  assert.match(data, /store_product_images/);
  assert.match(data, /cms_brands/);
  assert.match(data, /store_categories/);
  assert.match(data, /cms_hero_slides/);
  assert.match(data, /Only dashboard admins can optimize existing media/);
  assert.match(data, /optimized\/\$\{assetRow\.source\}/);
  assert.match(data, /image\/webp/);
  assert.match(data, /remove\(\[uploaded\.objectPath\]\)/);
  assert.match(data, /invalidateNativeStoreCache/);
});
