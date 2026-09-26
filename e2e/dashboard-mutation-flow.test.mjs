import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function functionSlice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `Missing start marker: ${startMarker}`);
  assert.ok(end > start, `Missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test("brand mutations patch local dashboard state instead of reloading the full catalog", async () => {
  const page = await read("src/dashboard/pages/BrandsPage.tsx");

  assert.doesNotMatch(page, /refreshDashboardProducts/);
  assert.match(page, /patchProductBrandAssignments/);
  assert.match(page, /reassignProductsFromBrand/);

  const deleteFlow = functionSlice(
    page,
    "const confirmDelete = async () =>",
    "const assignProducts = async",
  );
  assert.doesNotMatch(deleteFlow, /loadBrandsWorkspace\(\)/);
  assert.match(deleteFlow, /setBrands\(remainingBrands\)/);
  assert.match(deleteFlow, /reassignProductsFromBrand/);

  const assignFlow = functionSlice(
    page,
    "const assignProducts = async",
    "const removeProductFromBrand = async",
  );
  assert.doesNotMatch(assignFlow, /listDashboardProducts|loadBrandsWorkspace/);
  assert.match(assignFlow, /patchProductBrandAssignments/);
});

test("category mutations patch local dashboard state and guard duplicate deletes", async () => {
  const page = await read("src/dashboard/pages/CategoriesPage.tsx");

  assert.doesNotMatch(page, /refreshDashboardCategoryProducts/);
  assert.match(page, /patchProductCategoryAssignments/);
  assert.match(page, /reassignProductsFromCategory/);
  assert.match(page, /const \[deleting, setDeleting\] = useState\(false\)/);

  const deleteFlow = functionSlice(
    page,
    "const confirmDelete = async () =>",
    "const assignProducts = async",
  );
  assert.doesNotMatch(deleteFlow, /loadCategoriesWorkspace\(\)/);
  assert.match(deleteFlow, /if \(!deleteTarget \|\| deleting\) return/);
  assert.match(deleteFlow, /setDeleting\(true\)/);
  assert.match(deleteFlow, /setDeleting\(false\)/);
  assert.match(deleteFlow, /setCategories\(remainingCategories\)/);
  assert.match(deleteFlow, /reassignProductsFromCategory/);

  const assignFlow = functionSlice(
    page,
    "const assignProducts = async",
    "const removeProductFromCategory = async",
  );
  assert.doesNotMatch(assignFlow, /listDashboardProducts|loadCategoriesWorkspace/);
  assert.match(assignFlow, /patchProductCategoryAssignments/);

  assert.match(page, /disabled=\{deleting\}/);
  assert.match(page, /deleting \? "Deleting\.\.\." : "Delete Category"/);
});


test("product save avoids redundant catalog reads and editor refreshes", async () => {
  const [catalog, form] = await Promise.all([
    read("src/dashboard/data/catalog.ts"),
    read("src/dashboard/pages/ProductFormPage.tsx"),
  ]);

  const saveFlow = functionSlice(
    catalog,
    "export async function saveDashboardProduct",
    "export type DashboardProductImage",
  );

  assert.doesNotMatch(saveFlow, /listDashboardBrands\(\)|listDashboardCategories\(\)/);
  assert.equal(
    (saveFlow.match(/\.from\("store_product_variants"\)/g) ?? []).length,
    1,
    "product save should read variants only once",
  );
  assert.match(saveFlow, /Promise\.all\(\[/);
  assert.match(saveFlow, /categoryRequest/);
  assert.match(saveFlow, /imageRequest/);
  assert.match(saveFlow, /const variantRows = preexistingVariants/);

  const editorSave = functionSlice(
    form,
    "const handleSave = async () =>",
    "const duplicate = async",
  );

  assert.match(editorSave, /collectionsChanged/);
  assert.match(editorSave, /if \(collectionsChanged\)/);
  assert.match(editorSave, /shouldRefreshVariantManager/);
  assert.match(editorSave, /if \(shouldRefreshVariantManager\)/);
  assert.doesNotMatch(
    editorSave,
    /setDashboardProductCollections\(savedProduct\.id, collectionIds\)/,
  );
});
