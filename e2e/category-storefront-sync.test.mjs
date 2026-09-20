import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public categories page uses dashboard-managed store_categories as source of truth", async () => {
  const page = await read("src/routes/categories.tsx");

  assert.match(page, /from\("store_categories"\)/);
  assert.match(page, /\.eq\("is_active", true\)/);
  assert.match(page, /\.order\("sort_order", \{ ascending: true \}\)/);
  assert.match(page, /select\("name,name_ar,slug,image_url,sort_order"\)/);
  assert.match(page, /category\.image_url \|\| artwork\?\.image\?\.url/);
  assert.match(page, /managedCategories !== null/);
});

test("managed homepage categories remain visible before products are assigned", async () => {
  const homeCategories = await read("src/components/HomeCategorySection.tsx");

  assert.doesNotMatch(homeCategories, /if \(!facet\?\.count\) return \[\]/);
  assert.match(homeCategories, /glyphSlug: facet\?\.slug \?\? category\.slug/);
  assert.match(homeCategories, /count: facet\?\.count \?\? 0/);
});

test("empty managed category routes render instead of returning 404", async () => {
  const categoryRoute = await read("src/routes/category.$slug.tsx");

  assert.doesNotMatch(
    categoryRoute,
    /if \(!products\.length\) throw notFound\(\)/,
  );
  assert.match(categoryRoute, /if \(managedCategory\) \{/);
});

test("dashboard exposes the same category artwork with editable custom overrides", async () => {
  const [dashboard, list, preview, form, glyph] = await Promise.all([
    read("src/dashboard/pages/CategoriesPage.tsx"),
    read("src/dashboard/components/categories/CategoryList.tsx"),
    read("src/dashboard/components/categories/CategoryPreview.tsx"),
    read("src/dashboard/components/categories/CategoryForm.tsx"),
    read("src/components/CategoryGlyph.tsx"),
  ]);

  assert.match(dashboard, /id="storefront-category-grid"/);
  assert.match(dashboard, /Storefront Category Grid/);
  assert.match(dashboard, /onClick=\{\(\) => openEdit\(category\)\}/);
  assert.match(dashboard, /category\.image/);
  assert.match(dashboard, /<CategoryGlyph slug=\{category\.slug\}/);
  assert.match(dashboard, /Add Category/);

  assert.match(list, /category\.image \?/);
  assert.match(list, /<CategoryGlyph slug=\{category\.slug\}/);
  assert.match(preview, /<CategoryGlyph slug=\{category\.slug\}/);

  assert.match(form, /Storefront category image/);
  assert.match(form, /Storefront default/);
  assert.match(form, /Use custom image/);
  assert.match(form, /Restore default/);
  assert.match(form, /slug=\{draft\.slug \|\| draft\.name \|\| "category"\}/);

  assert.match(glyph, /category-3d-sprite\.webp/);
});
