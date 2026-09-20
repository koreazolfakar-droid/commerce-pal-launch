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

test("dashboard exposes a storefront-like editable category grid", async () => {
  const dashboard = await read("src/dashboard/pages/CategoriesPage.tsx");
  const list = await read("src/dashboard/components/categories/CategoryList.tsx");

  assert.match(dashboard, /id="storefront-category-grid"/);
  assert.match(dashboard, /Storefront Category Grid/);
  assert.match(dashboard, /onClick=\{\(\) => openEdit\(category\)\}/);
  assert.match(dashboard, /category\.image/);
  assert.match(dashboard, /Add Category/);
  assert.match(list, /category\.image \?/);
});
