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


test("product save is one atomic editor mutation and avoids redundant catalog reads", async () => {
  const [catalog, form] = await Promise.all([
    read("src/dashboard/data/catalog.ts"),
    read("src/dashboard/pages/ProductFormPage.tsx"),
  ]);

  const saveFlow = functionSlice(
    catalog,
    "export async function saveDashboardProduct",
    "export type DashboardProductImage",
  );

  assert.match(saveFlow, /looseSupabase\.rpc\(\s*"save_store_product_editor"/);
  assert.match(saveFlow, /p_collection_ids: \[\.\.\.new Set\(input\.collectionIds\)\]/);
  assert.doesNotMatch(saveFlow, /from\("store_products"\)\.(?:insert|update)/);
  assert.doesNotMatch(saveFlow, /create_store_product_variant|update_store_product_variant/);
  assert.doesNotMatch(saveFlow, /set_store_product_collections/);
  assert.match(saveFlow, /broadcastStorefrontRefresh\(\)/);

  const editorSave = functionSlice(
    form,
    "const handleSave = async () =>",
    "const duplicate = async",
  );

  assert.match(editorSave, /compareAt: form\.compareAt/);
  assert.match(editorSave, /collectionIds: nextCollectionIds/);
  assert.match(editorSave, /setPersistedCollectionIds\(nextCollectionIds\)/);
  assert.match(editorSave, /collectionsChanged/);
  assert.match(editorSave, /shouldRefreshVariantManager/);
  assert.match(editorSave, /if \(shouldRefreshVariantManager\)/);
  assert.doesNotMatch(editorSave, /setDashboardProductCollections/);
});

test("product destructive actions use dashboard confirmation and scoped pending state", async () => {
  const [form, dialog] = await Promise.all([
    read("src/dashboard/pages/ProductFormPage.tsx"),
    read("src/dashboard/components/DashboardConfirmDialog.tsx"),
  ]);

  assert.doesNotMatch(form, /window\.confirm/);
  assert.match(form, /pendingAction/);
  assert.match(form, /confirmAction/);
  assert.match(form, /setConfirmAction\("archive"\)/);
  assert.match(form, /setConfirmAction\("delete"\)/);
  assert.match(form, /pendingAction === "duplicate"/);
  assert.match(form, /pendingAction === "archive"/);
  assert.match(form, /pendingAction === "delete"/);
  assert.match(form, /<DashboardConfirmDialog/);

  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /aria-busy=\{pending\}/);
  assert.match(dialog, /useDashboardDialogFocus\(open, dialogRef/);
  const focus = await read("src/dashboard/hooks/useDashboardDialogFocus.ts");
  assert.match(focus, /event\.key === "Escape"/);
});


test("product media mutations return targeted results without success-path list reloads", async () => {
  const [catalog, media, variants] = await Promise.all([
    read("src/dashboard/data/catalog.ts"),
    read("src/dashboard/components/products/ProductMediaManager.tsx"),
    read("src/dashboard/components/products/ProductVariantManager.tsx"),
  ]);

  const mediaStart = catalog.indexOf("export async function uploadDashboardProductImage");
  assert.ok(mediaStart >= 0, "product media mutation block should exist");
  const mediaMutations = catalog.slice(mediaStart);

  assert.doesNotMatch(mediaMutations, /return listDashboardProductImages/);
  assert.match(mediaMutations, /image: mapProductImage/);
  assert.match(mediaMutations, /promotedImageId/);
  for (const rpc of ["set_store_product_primary_image", "delete_store_product_image", "reorder_store_product_images"]) {
    assert.ok(mediaMutations.includes(`"${rpc}"`), rpc);
  }

  assert.doesNotMatch(media, /sync\(await (?:delete|set|reorder)DashboardProductImage/);
  assert.match(media, /result\.image/);
  assert.match(media, /result\.promotedImageId/);
  assert.match(media, /sync\(normalized\)/);
  assert.doesNotMatch(media, /window\.confirm/);

  assert.doesNotMatch(variants, /window\.confirm/);
  assert.match(variants, /deletingVariantId/);
  assert.match(variants, /<DashboardConfirmDialog/);
});


test("collection mutations avoid heavy detail reloads and use scoped pending state", async () => {
  const [data, listPage, detailPage] = await Promise.all([
    read("src/dashboard/data/collections.ts"),
    read("src/dashboard/pages/CollectionsPage.tsx"),
    read("src/dashboard/pages/CollectionDetailPage.tsx"),
  ]);

  const createStart = data.indexOf("export async function createDashboardCollection");
  const deleteStart = data.indexOf("export async function deleteDashboardCollection", createStart);
  assert.ok(createStart >= 0 && deleteStart > createStart);
  const profileMutations = data.slice(createStart, deleteStart);
  assert.doesNotMatch(profileMutations, /getDashboardCollection\(/);
  assert.match(profileMutations, /return mapCollection\(created\)/);
  assert.match(profileMutations, /return mapCollection\(updated\)/);

  const membershipStart = data.indexOf("export async function saveDashboardCollectionProducts");
  const reorderStart = data.indexOf("export async function reorderDashboardCollections", membershipStart);
  assert.ok(membershipStart >= 0 && reorderStart > membershipStart);
  const membershipMutation = data.slice(membershipStart, reorderStart);
  assert.doesNotMatch(membershipMutation, /getDashboardCollection\(/);
  assert.match(membershipMutation, /Promise<void>/);

  assert.doesNotMatch(listPage, /window\.confirm/);
  assert.match(listPage, /<DashboardConfirmDialog/);

  assert.doesNotMatch(detailPage, /window\.confirm/);
  assert.match(detailPage, /savingProfile/);
  assert.match(detailPage, /savingProducts/);
  assert.match(detailPage, /nextAvailableProducts/);
  assert.match(detailPage, /productCount: normalized\.length/);
  assert.match(detailPage, /<DashboardConfirmDialog/);

  const saveProductsFlow = functionSlice(
    detailPage,
    "const saveProducts = async",
    "const addProduct =",
  );
  assert.doesNotMatch(saveProductsFlow, /void load\(\)/);
  assert.match(saveProductsFlow, /setCollection\(/);
});
