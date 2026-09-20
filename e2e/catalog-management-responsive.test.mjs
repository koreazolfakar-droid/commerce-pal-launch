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
  assert.match(brands, /min-h-\[72px\]/);
  assert.match(categories, /min-h-\[72px\]/);
  assert.match(brands, /size-11 sm:size-10/);
  assert.match(categories, /size-11 shrink-0/);
});

test("Brands and Categories use the same phone and desktop master-detail breakpoints", async () => {
  const [brands, categories] = await Promise.all([
    read("src/dashboard/pages/BrandsPage.tsx"),
    read("src/dashboard/pages/CategoriesPage.tsx"),
  ]);

  for (const source of [brands, categories]) {
    assert.match(source, /lg:grid-cols-\[320px_minmax\(0,1fr\)\]/);
    assert.match(source, /xl:grid-cols-\[340px_minmax\(0,1fr\)\]/);
    assert.match(source, /lg:sticky lg:top-\[6\.5rem\]/);
    assert.match(source, /window\.innerWidth < 1024/);
    assert.match(source, /text-\[24px\].*sm:text-\[30px\]/);
    assert.match(source, /grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto/);
    assert.match(source, /bottom-\[calc\(4\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
    assert.match(source, /xl:grid-cols-\[minmax\(0,1\.5fr\)_minmax\(90px,\.8fr\)_80px_80px_82px_36px\]/);
  }

  assert.match(brands, /id="brand-list"/);
  assert.match(brands, /id="brand-details"/);
  assert.match(brands, /Back to brands/);

  assert.match(categories, /id="category-list"/);
  assert.match(categories, /id="category-details"/);
  assert.match(categories, /Back to categories/);
  assert.match(categories, /selected\.image/);
  assert.match(categories, /CategoryGlyph slug=\{selected\.slug\}/);
});
