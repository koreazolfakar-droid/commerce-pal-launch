import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [form, preview, translations, catalog, rpc] = await Promise.all([
  readFile(new URL("../src/dashboard/pages/ProductFormPage.tsx", import.meta.url), "utf8"),
  readFile(
    new URL("../src/dashboard/components/products/ProductCreatePreview.tsx", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../src/dashboard/uiTranslations.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
  readFile(
    new URL(
      "../supabase/migrations/20261005000000_product_editor_stock_concurrency.sql",
      import.meta.url,
    ),
    "utf8",
  ),
]);

test("product status options have stable values independent of translation", () => {
  for (const status of ["Active", "Draft", "Archived"]) {
    assert.match(
      form,
      new RegExp('<option value="' + status + '">\\{t\\("' + status + '"\\)\\}</option>'),
    );
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
  assert.match(form, /status: createAsDraft \? \("Draft" as const\) : status/);
  const save = form.indexOf("const savedProduct = await saveDashboardProduct(productInput);");
  const upload = form.indexOf("const uploaded = await uploadDashboardProductImage(");
  const variantUpdate = form.indexOf("await updateDashboardProductVariant(defaultVariant.id");
  const publish = form.indexOf('status: "Active",\n          imageUrl: firstImageUrl');
  assert.ok(
    save > 0 && upload > save && variantUpdate > upload && publish > variantUpdate,
    "draft save precedes uploads and option updates, then activation",
  );
  assert.match(form, /if \(createdDraftId\) \{/);
  // A failed upload must not redirect away and lose staged File objects.
  // Retry uses the already-persisted draft ID and skips uploaded images.
  assert.match(form, /partialDraftIdRef\.current = savedProduct\.id/);
  assert.match(form, /id: id \?\? partialDraftIdRef\.current \?\? undefined/);
  assert.match(form, /uploadedPreviewsRef\.current\.has\(pending\.preview\)/);
  const catchStart = form.indexOf("} catch (cause) {", form.indexOf("const handleSave"));
  const catchEnd = form.indexOf("} finally {", catchStart);
  const catchDraft = form.slice(catchStart, catchEnd);
  assert.ok(catchStart > 0 && catchEnd > catchStart);
  assert.ok(!catchDraft.includes("navigate("), "partial-save failure stays on the editor");
  assert.match(preview, /blob:https\?/);
  assert.match(translations, /"Images upload after save"/);
});

test("create form saves selected color and storage on the actual default variant", async () => {
  const [picker, variant] = await Promise.all([
    readFile(
      new URL("../src/dashboard/components/products/ProductColorPicker.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/dashboard/components/products/ProductVariantManager.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(form, /<ProductColorPicker[\s\S]*?value=\{newVariantColor\}/);
  assert.match(form, /options: \{[\s\S]*?color: newVariantColor\.trim\(\)/);
  assert.match(form, /createAsDraft && status === "Active"/);
  assert.match(variant, /<ProductColorPicker[\s\S]*?value=\{draft\.color\}/);
  assert.match(picker, /aria-pressed=\{active\}/);
  assert.match(picker, /Custom color name/);
});

test("persisted primary media synchronizes both editor draft and original baseline", () => {
  assert.match(form, /onPrimaryChange=\{\(url\) => \{/);
  assert.match(form, /setForm\(\(current\) =>[\s\S]*?imageUrl: url/);
  assert.match(form, /setExisting\(\(current\) =>[\s\S]*?image: url/);
});

test("new-product save and publish actions remain visible on mobile and desktop", () => {
  const actionStart = form.indexOf(
    'const renderCreateActions = (placement: "header" | "footer") =>',
  );
  assert.ok(actionStart > 0, "shared create action buttons must be rendered in the page flow");
  const actionEnd = form.indexOf("  if (loading) {", actionStart);
  assert.ok(actionEnd > actionStart, "action buttons must be defined before early render states");
  const actions = form.slice(actionStart, actionEnd);
  assert.ok(actions.includes('role="group"'));
  assert.ok(actions.includes('onClick={() => submitProduct("Draft")}'));
  assert.ok(actions.includes('onClick={() => submitProduct("Active")}'));
  assert.ok(actions.includes("inline-flex min-h-11"));
  assert.ok(!actions.includes("fixed inset-"));
  assert.ok(!actions.includes("lg:hidden"));

  // Creation actions come before the AI controls; they are also available after the fields.
  const header = form.indexOf('renderCreateActions("header")');
  const aiPanel = form.indexOf("<AiAssistPanel", header);
  assert.ok(header > actionEnd && aiPanel > header, "header buttons appear before AI controls");
  assert.ok(form.includes('renderCreateActions("footer")'));

  // Dashboard already owns the mobile bottom nav, so avoid a competing fixed action overlay.
  assert.ok(!form.includes("fixed inset-x-0 bottom-0 z-40 flex gap-2"));
  assert.ok(!form.includes("hidden={!id}"));
  assert.ok(translations.includes('"Product save actions": "خيارات حفظ المنتج ونشره"'));
});
