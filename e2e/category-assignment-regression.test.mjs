import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Run the actual TypeScript membership helper without requiring Vite or Supabase.
const helperSource = await readFile(
  new URL("../src/lib/categoryAssignments.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(helperSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
});
const { productsInManagedCategory } = await import(
  "data:text/javascript;charset=utf-8," + encodeURIComponent(outputText)
);

const product = (id, categoryId, productType) => ({
  node: { id, handle: id, categoryId, productType },
});

test("all managed categories match by UUID even when product type is blank or unrelated", () => {
  const categories = [
    { id: "accessories-id", name: "Accessories" },
    { id: "gaming-id", name: "Gaming" },
    { id: "smartphones-id", name: "Smartphones" },
    { id: "brand-new-category-id", name: "Custom Components" },
    { id: "ar-category-id", name: "ألعاب" },
  ];
  const products = categories.map((category, index) =>
    product("product-" + index, category.id, index % 2 ? "Other Type" : ""),
  );

  for (let index = 0; index < categories.length; index++) {
    assert.deepEqual(
      productsInManagedCategory(products, categories[index]).map((item) => item.node.id),
      ["product-" + index],
    );
  }
});

test("renaming a managed category never breaks its existing product assignments", () => {
  const assigned = product("assigned", "category-uuid", "Old Name");
  const category = { id: "category-uuid", name: "New Name" };
  assert.deepEqual(productsInManagedCategory([assigned], category), [assigned]);
});

test("same-name categories do not leak each other's UUID-assigned products", () => {
  const left = product("left", "category-left", "Accessories");
  const right = product("right", "category-right", "Accessories");
  assert.deepEqual(
    productsInManagedCategory([left, right], { id: "category-left", name: "Accessories" }),
    [left],
  );
});

test("legacy products without an assigned category retain case-insensitive name fallback", () => {
  const legacy = product("legacy", null, " accessories ");
  const assignedElsewhere = product("elsewhere", "different-category", "Accessories");
  assert.deepEqual(
    productsInManagedCategory([legacy, assignedElsewhere], {
      id: "accessories-id",
      name: "ACCESSORIES",
    }),
    [legacy],
  );
});

test("storefront, navigation and taxonomy preserve managed UUID and slug end-to-end", async () => {
  const [route, types, native, taxonomy, categoriesIndex, homepage] = await Promise.all([
    readFile(new URL("../src/routes/category.$slug.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/storeTypes.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/nativeStore.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/taxonomy.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/categories.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/HomeCategorySection.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /select\("id,name,name_ar,slug,description,image_url,seo_title,seo_description"\)/);
  assert.match(route, /productsInManagedCategory\(catalog\.products, managedCategory\)/);
  assert.match(route, /id: loaderData\.managedCategoryId/);
  assert.match(types, /categoryId\?: string \| null/);
  assert.match(types, /categorySlug\?: string/);
  assert.match(native, /categoryId: row\.category_id/);
  assert.match(native, /categorySlug: category\?\.is_active \? category\.slug : undefined/);
  assert.match(native, /STOREFRONT_NAVIGATION_CATEGORY_SELECT/);
  assert.match(native, /managedCategories\.map\(\(category\) =>/);
  assert.ok(
    taxonomy.indexOf("const managedSlug = node.categorySlug?.trim()") <
      taxonomy.indexOf("for (const tag of node.tags ?? [])", taxonomy.indexOf("export function resolveCategories")),
    "managed categories must take precedence over tags and product type",
  );
  assert.match(categoriesIndex, /\.from\("store_categories"\)/);
  assert.match(categoriesIndex, /\.eq\("is_active", true\)/);
  assert.match(homepage, /\.eq\("is_featured", true\)/);
});
