import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const categoryData = await readFile(
  new URL("../src/dashboard/data/categories.ts", import.meta.url),
  "utf8",
);
const categoryForm = await readFile(
  new URL("../src/dashboard/components/categories/CategoryForm.tsx", import.meta.url),
  "utf8",
);
const categoriesPage = await readFile(
  new URL("../src/dashboard/pages/CategoriesPage.tsx", import.meta.url),
  "utf8",
);

test("category images convert to WebP before Storage upload", () => {
  const conversion = categoryData.indexOf(
    "const conversion = await convertProductImageToWebp(source, resolution)",
  );
  const upload = categoryData.indexOf(
    ".from(CATEGORY_IMAGE_BUCKET)\n    .upload(objectPath, conversion.file",
  );

  assert.ok(conversion >= 0, "category WebP conversion invocation is missing");
  assert.ok(upload >= 0, "category Storage upload is missing");
  assert.ok(conversion < upload, "category image must be converted before Storage upload");
  assert.match(categoryData, /contentType: "image\/webp"/);
  assert.match(categoryData, /DEFAULT_CATEGORY_IMAGE_RESOLUTION: ProductImageResolution = "1080"/);
});

test("category image UI supports upload replace remove and local preview", () => {
  assert.match(categoryForm, /accept="image\/jpeg,image\/png,image\/webp,image\/avif"/);
  assert.match(categoryForm, /Replace image/);
  assert.match(categoryForm, /Upload image/);
  assert.match(categoryForm, /Remove/);
  assert.match(categoryForm, /URL\.createObjectURL\(pendingImage\)/);
  assert.match(categoryForm, /Ready for WebP conversion/);
  assert.match(categoryForm, /optimized before Storage upload/);
});

test("category save path persists converted image and reports before-after bytes", () => {
  assert.match(categoriesPage, /uploadDashboardCategoryImage/);
  assert.match(categoriesPage, /Image converted to WebP/);
  assert.match(categoriesPage, /uploaded\.conversion\.source\.bytes/);
  assert.match(categoriesPage, /uploaded\.conversion\.output\.bytes/);
});
