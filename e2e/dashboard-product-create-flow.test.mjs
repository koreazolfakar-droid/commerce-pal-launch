import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [form, preview, translations, catalog, rpc] = await Promise.all([
  readFile(new URL("../src/dashboard/pages/ProductFormPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/products/ProductCreatePreview.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/uiTranslations.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261005000000_product_editor_stock_concurrency.sql", import.meta.url), "utf8"),
]);

test("product status options have stable values independent of translation", () => {
  for (const status of ["Active", "Draft", "Archived"]) {
    assert.match(form, new RegExp('<option value="' + status + '">\\{t\\("' + status + '"\\)\\}</option>'));
  }
  assert.match(catalog, /return status\.toLowerCase\(\)/);
  assert.match(rpc, /p_status not in \('active', 'draft', 'archived'\)/);
});

test("searchable catalog selectors retain selected brand category and collections", () => {
  for (const text of ["brandSearch", "categorySearch", "collectionSearch"]) {
    assert.match(form, new RegExp(text));
  }
  assert.match(form, /brand\.id === form\.brandId/);
  assert.match(form, /category\.id === form\.categoryId/);
  assert.match(form, /collectionIds\.includes\(collection\.id\)/);
  assert.match(form, /visibleBrands\.map/);
  assert.match(form, /visibleCategories\.map/);
  assert.match(form, /visibleCollections\.map/);
});

test("new product images are queued locally, written to a draft then published", () => {
  assert.match(form, /pendingImages/);
  assert.match(form, /URL\.createObjectURL/);
  assert.match(form, /URL\.revokeObjectURL/);
  assert.match(form, /pendingImageInputRef/);
  assert.match(form, /status === "Active" && pendingImages\.length === 0/);
  assert.match(form, /status: createWithImages \? \("Draft" as const\) : status/);
  const save = form.indexOf("const savedProduct = await saveDashboardProduct(productInput);");
  const upload = form.indexOf("const uploaded = await uploadDashboardProductImage(");
  const publish = form.indexOf('status: "Active",\n            imageUrl: firstImageUrl');
  assert.ok(save > 0 && upload > save && publish > upload, "draft save precedes uploads, then activation");
  assert.match(form, /if \(createdDraftId\) \{/);
  assert.match(form, /navigate\(\`\/dashboard\/products\/\$\{createdDraftId\}\`\)/);
  assert.match(preview, /blob:https\?/);
  assert.match(translations, /"Images upload after save"/);
});

test("persisted primary media synchronizes both editor draft and original baseline", () => {
  assert.match(form, /onPrimaryChange=\{\(url\) => \{/);
  assert.match(form, /setForm\(\(current\) =>[\s\S]*?imageUrl: url/);
  assert.match(form, /setExisting\(\(current\) =>[\s\S]*?image: url/);
});

test("new-product save and publish actions remain visible on mobile and desktop", () => {
  const actionStart = form.indexOf('const renderCreateActions = (placement: "header" | "footer") =>');
  assert.ok(actionStart > 0, "shared create action buttons must be rendered in the page flow");
  const actionEnd = form.indexOf("\\n  if (loading)", actionStart);
  const actions = form.slice(actionStart, actionEnd);
  assert.match(actions, /role="group"/);
  assert.match(actions, /onClick=\\{\\(\\) => submitProduct\\("Draft"\\)\\}/);
  assert.match(actions, /onClick=\\{\\(\\) => submitProduct\\("Active"\\)\\}/);
  assert.match(actions, /inline-flex min-h-11/);
  assert.doesNotMatch(actions, /hidden|fixed|lg:hidden|lg:flex/);

  // The header is immediately actionable even before scrolling past AI and product fields.
  const header = form.indexOf('renderCreateActions("header")');
  const aiPanel = form.indexOf("<AiAssistPanel", header);
  assert.ok(header > actionEnd && aiPanel > header, "header buttons appear before AI controls");
  assert.match(form, /renderCreateActions\\("footer"\\)/);

  // The Dashboard already owns a fixed mobile bottom nav; no competing create-action overlay.
  assert.doesNotMatch(form, /fixed inset-x-0 bottom-0 z-40 flex gap-2/);
  assert.doesNotMatch(form, /hidden=\\{!id\\}/);
  assert.match(translations, /"Product save actions": "خيارات حفظ المنتج ونشره"/);
});
