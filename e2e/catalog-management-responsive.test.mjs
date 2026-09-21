import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("brand and category rows share the same responsive action surface", async () => {
  const [actions, brands, categories] = await Promise.all([
    read("src/dashboard/components/CatalogRowActions.tsx"),
    read("src/dashboard/components/brands/BrandList.tsx"),
    read("src/dashboard/components/categories/CategoryList.tsx"),
  ]);

  assert.match(actions, /bottom-\[calc\(4\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(actions, /z-\[60\]/);
  assert.match(actions, /lg:absolute/);
  assert.match(actions, /lg:top-11/);
  assert.match(actions, /aria-haspopup="menu"/);

  assert.match(brands, /CatalogRowActions/);
  assert.match(categories, /CatalogRowActions/);
  assert.match(brands, /grid-cols-2/);
  assert.match(brands, /sm:grid-cols-3/);
  assert.match(brands, /lg:grid-cols-4/);
  assert.match(brands, /min-h-\[112px\]/);
  assert.match(brands, /Assign Products/);
  assert.match(categories, /min-h-\[72px\]/);
  assert.match(categories, /size-11 shrink-0/);
});

test("Brands use a full-width card grid while Categories keep master-detail navigation", async () => {
  const [brands, categories] = await Promise.all([
    read("src/dashboard/pages/BrandsPage.tsx"),
    read("src/dashboard/pages/CategoriesPage.tsx"),
  ]);

  assert.doesNotMatch(brands, /lg:grid-cols-\[320px_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(brands, /lg:sticky lg:top-\[6\.5rem\]/);
  assert.match(brands, /id="brand-list"/);
  assert.match(brands, /id="brand-details"/);
  assert.match(brands, /Back to brands/);
  assert.match(brands, /Assign Products/);
  assert.match(brands, /Delete Brand/);
  assert.match(brands, /requestDelete\(selected\)/);
  assert.match(brands, /aria-busy=\{deleting\}/);

  assert.match(categories, /lg:grid-cols-\[320px_minmax\(0,1fr\)\]/);
  assert.match(categories, /xl:grid-cols-\[340px_minmax\(0,1fr\)\]/);
  assert.match(categories, /lg:sticky lg:top-\[6\.5rem\]/);
  assert.match(categories, /window\.innerWidth < 1024/);
  assert.match(categories, /id="category-list"/);
  assert.match(categories, /id="category-details"/);
  assert.match(categories, /Back to categories/);
  assert.match(categories, /selected\.image/);
  assert.match(categories, /CategoryGlyph slug=\{selected\.slug\}/);
});


test("catalog editors and brand marks stay visually consistent across viewports", async () => {
  const [brandMark, brandForm, categoryForm] = await Promise.all([
    read("src/dashboard/components/brands/BrandMark.tsx"),
    read("src/dashboard/components/brands/BrandForm.tsx"),
    read("src/dashboard/components/categories/CategoryForm.tsx"),
  ]);

  assert.match(brandMark, /imageShape/);
  assert.match(brandMark, /ratio >= 1\.8/);
  assert.match(brandMark, /max-h-\[52%\] max-w-\[90%\]/);
  assert.match(brandMark, /setImageFailed\(false\)/);

  for (const form of [brandForm, categoryForm]) {
    assert.match(form, /sticky bottom-0 grid grid-cols-2 gap-2/);
    assert.match(form, /sm:flex sm:justify-end/);
    assert.match(form, /w-full.*sm:w-auto/);
  }

  assert.match(categoryForm, /CategoryGlyph slug=\{draft\.slug \|\| draft\.name \|\| "category"\}/);
});
