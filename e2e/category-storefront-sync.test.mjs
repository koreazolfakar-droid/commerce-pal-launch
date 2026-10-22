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
  assert.match(page, /cdnImage\(category\.image_url \|\| undefined, 240\)/);
  assert.doesNotMatch(page, /findCategoryArtworkCollection/);
  assert.match(page, /managedCategories !== null/);
});

test("managed homepage categories remain visible before products are assigned", async () => {
  const homeCategories = await read("src/components/HomeCategorySection.tsx");

  assert.doesNotMatch(homeCategories, /if \(!facet\?\.count\) return \[\]/);
  assert.match(homeCategories, /glyphSlug: facet\?\.slug \?\? category\.slug/);
  assert.match(homeCategories, /count: facet\?\.count \?\? 0/);
});

test("homepage categories never flash legacy artwork before dashboard-managed imagery resolves", async () => {
  const homeCategories = await read("src/components/HomeCategorySection.tsx");

  assert.match(homeCategories, /isPending: managedCategoriesPending/);
  assert.match(homeCategories, /isError: managedCategoriesFailed/);
  assert.match(
    homeCategories,
    /const categories = managedCategoriesFailed \? fallbackItems : managedItems/,
  );
  assert.match(homeCategories, /managedCategoriesPending[\s\S]*?Array\.from\(\{ length: 5 \}\)/);
  assert.match(homeCategories, /managed: true/);
  assert.match(homeCategories, /managed: false/);
  assert.match(
    homeCategories,
    /const artwork = category\.managed\s*\? undefined\s*:\s*findCategoryArtworkCollection/,
  );
  assert.doesNotMatch(
    homeCategories,
    /managedCategories !== undefined \? managedItems : fallbackItems/,
  );
});

test("other managed visual sections resolve authoritative data before rendering fallbacks", async () => {
  const [categoriesPage, categoryRoute, brandsRoute, homeRoute] = await Promise.all([
    read("src/routes/categories.tsx"),
    read("src/routes/category.$slug.tsx"),
    read("src/routes/brands.tsx"),
    read("src/routes/index.tsx"),
  ]);

  assert.match(categoriesPage, /Promise\.all\([\s\S]*?fetchManagedStoreCategories\(\)/);
  assert.match(categoryRoute, /Promise\.all\([\s\S]*?fetchManagedCategory\(params\.slug\)/);
  assert.match(brandsRoute, /Promise\.all\([\s\S]*?fetchCmsSnapshot\(\)/);
  assert.match(homeRoute, /useQuery\(cmsQueryOptions\(\)\)/);
  assert.match(homeRoute, /<HomeHero cmsHeroSlides=\{cms\.heroSlides\}/);

  assert.doesNotMatch(categoriesPage, /findCategoryArtworkCollection/);
});

test("empty managed category routes render instead of returning 404", async () => {
  const categoryRoute = await read("src/routes/category.$slug.tsx");

  assert.doesNotMatch(categoryRoute, /if \(!products\.length\) throw notFound\(\)/);
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
  assert.match(dashboard, /<CategoryGlyph\s+slug=\{category\.slug\}/);
  assert.match(dashboard, /Add Category/);

  assert.match(list, /category\.image \?/);
  assert.match(list, /<CategoryGlyph\s+slug=\{category\.slug\}/);
  assert.match(preview, /<CategoryGlyph\s+slug=\{category\.slug\}/);

  assert.match(form, /Storefront category image/);
  assert.match(form, /Storefront default/);
  assert.match(form, /Use custom image/);
  assert.match(form, /Restore default/);
  assert.match(form, /slug=\{draft\.slug \|\| draft\.name \|\| "category"\}/);

  assert.match(glyph, /category-3d-sprite\.webp/);
});
