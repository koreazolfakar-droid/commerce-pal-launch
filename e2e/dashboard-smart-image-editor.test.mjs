import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  editor,
  brands,
  categories,
  settings,
  products,
  variants,
  hero,
  media,
  picker,
  storefrontProductImage,
  storefrontProductCard,
  storefrontProductGallery,
] = await Promise.all([
  read("src/dashboard/components/SmartImageEditor.tsx"),
  read("src/dashboard/components/brands/BrandForm.tsx"),
  read("src/dashboard/components/categories/CategoryForm.tsx"),
  read("src/dashboard/pages/SettingsPage.tsx"),
  read("src/dashboard/components/products/ProductMediaManager.tsx"),
  read("src/dashboard/components/products/ProductVariantManager.tsx"),
  read("src/dashboard/pages/HeroBannersPage.tsx"),
  read("src/dashboard/pages/MediaLibraryPage.tsx"),
  read("src/dashboard/components/DashboardMediaPicker.tsx"),
  read("src/components/ProductImage.tsx"),
  read("src/components/ProductListCard.tsx"),
  read("src/components/product/ProductGallery.tsx"),
]);

test("smart image editor detects visible content and exposes precise positioning controls", () => {
  assert.match(editor, /detectContentBounds/);
  assert.match(editor, /smartTransform/);
  assert.match(editor, /Auto Center/);
  assert.match(editor, /label="Zoom"/);
  assert.match(editor, /label="Horizontal"/);
  assert.match(editor, /label="Vertical"/);
  assert.match(editor, /label="Padding"/);
  assert.match(editor, /Fit mode/);
  assert.match(editor, /editFile/);
  assert.match(editor, /editUrl/);
  assert.match(editor, /image\/webp/);
});

test("editor has storefront-aware presets for logos, cards and responsive hero media", () => {
  assert.match(editor, /logo: \[1200, 1200\]/);
  assert.match(editor, /square: \[1400, 1400\]/);
  assert.match(editor, /"hero-desktop": \[1920, 1080\]/);
  assert.match(editor, /"hero-mobile": \[1080, 1920\]/);
  assert.match(editor, /preset === "logo"/);
});

test("brand, category and store identity uploads use the shared smart editor", () => {
  assert.match(brands, /useSmartImageEditor/);
  assert.match(brands, /Adjust brand logo/);
  assert.match(brands, /Adjust brand cover/);
  assert.match(categories, /useSmartImageEditor/);
  assert.match(categories, /Adjust category image/);
  assert.match(settings, /useSmartImageEditor/);
  assert.match(settings, /Adjust store logo/);
});

test("product and variant images can adjust both new and already-uploaded media", () => {
  assert.match(products, /useSmartImageEditor/);
  assert.match(products, /Adjust existing product image/);
  assert.match(products, /editUrl\(image\.url/);
  assert.match(variants, /useSmartImageEditor/);
  assert.match(variants, /Adjust existing variant image/);
  assert.match(variants, /editUrl\(draft\.imageUrl/);
});

test("product editor mirrors the live storefront media geometry without double padding", () => {
  assert.match(storefrontProductImage, /object-contain/);
  assert.match(storefrontProductCard, /imageClassName="!p-\[6%\]/);
  assert.match(storefrontProductGallery, /aspect-\[1\/0\.92\]/);
  assert.match(storefrontProductGallery, /p-2\.5/);
  assert.match(storefrontProductGallery, /lg:p-8/);

  assert.match(editor, /previewContext\?: "product"/);
  assert.match(editor, /id: "card"[\s\S]*padding: "6%"/);
  assert.match(editor, /id: "mobile"[\s\S]*aspectRatio: "1 \/ 0\.92"[\s\S]*padding: "10px"/);
  assert.match(editor, /id: "desktop"[\s\S]*padding: "32px"/);
  assert.match(editor, /request\.options\.previewContext === "product" \? 0/);
  assert.match(editor, /Website preview/);
  assert.match(editor, /Exact CSS/);
  assert.match(editor, /Product files are saved with 0% default baked-in padding/);

  assert.match(products, /previewContext: "product"/);
  assert.match(variants, /previewContext: "product"/);
});

test("hero images have separate desktop and mobile smart crops and can be re-edited", () => {
  assert.match(hero, /useSmartImageEditor/);
  assert.match(hero, /preset: isDesktop \? "hero-desktop" : "hero-mobile"/);
  assert.match(hero, /Adjust existing desktop hero/);
  assert.match(hero, /Adjust existing mobile hero/);
  assert.match(hero, /setPendingHeroImages/);
});

test("shared media surfaces support smart adjustment without breaking existing links", () => {
  assert.match(media, /useSmartImageEditor/);
  assert.match(media, /replaceDashboardMediaAssetWithWebp/);
  assert.match(media, /outputFormat: "webp"/);
  assert.match(media, /without changing its media URL/);
  assert.match(picker, /useSmartImageEditor/);
  assert.match(picker, /Adjust image/);
  assert.match(picker, /Adjusted copy saved to the media library/);
});
