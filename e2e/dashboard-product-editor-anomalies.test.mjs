import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const [variantSource, formSource, translations] = await Promise.all([
  readFile(new URL("../src/dashboard/components/products/ProductVariantManager.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/ProductFormPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/uiTranslations.ts", import.meta.url), "utf8"),
]);

const start = variantSource.indexOf("function buildInput(");
const end = variantSource.indexOf("function formatMoney(", start);
assert.ok(start > 0 && end > start, "variant input validation must be extractable for behavior tests");
const js = ts.transpileModule(variantSource.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const buildInput = new Function(js + "\nreturn buildInput;")();

function draft(patch = {}) {
  return {
    title: "",
    color: "Graphite",
    storage: "256GB",
    sku: "SC-001",
    barcode: "123456",
    price: "20",
    compareAt: "",
    stock: "5",
    trackInventory: true,
    allowBackorder: false,
    imageUrl: "",
    sortOrder: 10,
    isActive: true,
    baseOptions: { Color: "Old color", Storage: "128GB", warranty: "12 months" },
    ...patch,
  };
}

test("blank variant price cannot silently become zero", () => {
  assert.throws(() => buildInput(draft({ price: "" })), /valid variant price/);
  assert.throws(() => buildInput(draft({ price: " " })), /valid variant price/);
  assert.throws(() => buildInput(draft({ price: "-2" })), /valid variant price/);
  assert.equal(buildInput(draft({ price: "0" })).price, 0, "deliberately entered zero stays supported");
});

test("variant compare-at price cannot be below selling price", () => {
  assert.throws(() => buildInput(draft({ price: "25", compareAt: "20" })), /cannot be below/);
  assert.throws(() => buildInput(draft({ compareAt: "-1" })), /cannot be below/);
  assert.equal(buildInput(draft({ compareAt: "20" })).compareAt, 20);
  assert.equal(buildInput(draft({ compareAt: "25" })).compareAt, 25);
});

test("blank or fractional variant stock is rejected before the RPC", () => {
  for (const stock of ["", " ", "-1", "2.5", "Infinity"]) {
    assert.throws(() => buildInput(draft({ stock })), /non-negative whole number/);
  }
  assert.equal(buildInput(draft({ stock: "0" })).stock, 0);
});

test("variant option edits preserve unrelated options and canonicalize color/storage", () => {
  const input = buildInput(draft());
  assert.equal(input.title, "Graphite / 256GB");
  assert.deepEqual(input.options, {
    warranty: "12 months",
    color: "Graphite",
    storage: "256GB",
  });
  assert.equal(input.sku, "SC-001");
});

test("modal has unsaved-draft protection, accessible close and safe mutation serialization", () => {
  assert.match(variantSource, /useDashboardUnsavedChanges\(dirtyVariant\)/);
  assert.match(variantSource, /JSON\.stringify\(draft\) !== JSON\.stringify\(savedDraftRef\.current\)/);
  assert.match(variantSource, /const requestCloseVariant = \(\) => \{/);
  assert.match(variantSource, /setConfirmDiscard\(true\)/);
  assert.match(variantSource, /open=\{confirmDiscard\}/);
  assert.match(variantSource, /role="dialog"/);
  assert.match(variantSource, /aria-modal="true"/);
  assert.match(variantSource, /useDashboardModal\(requestCloseVariant, open\)/);
  assert.match(variantSource, /onClick=\{requestCloseVariant\}/);
  assert.match(variantSource, /mutationLockRef\.current = true/);
  assert.match(variantSource, /reorderLockRef\.current = true/);
  assert.match(variantSource, /imageLockRef\.current = true/);
  assert.match(variantSource, /savedDraftRef\.current = \{ \.\.\.savedDraftRef\.current, imageUrl: result\.url \}/);
  assert.match(variantSource, /Upload or cancel the selected variant image before saving/);
});

test("failed variant image upload preserves the staged file for retry", () => {
  const uploadStart = variantSource.indexOf("const upload = async");
  const clearStart = variantSource.indexOf("const clearImage = async", uploadStart);
  const section = variantSource.slice(uploadStart, clearStart);
  assert.match(section, /setPendingImageFile\(null\);\s*toast\.success/);
  const finallyStart = section.indexOf("} finally {");
  assert.ok(finallyStart !== -1);
  assert.doesNotMatch(section.slice(finallyStart), /setPendingImageFile\(null\)/);
});

test("product-level save blocks concurrent reference/media/variant mutations", () => {
  assert.match(formSource, /if \(mediaBusy \|\| variantsBusy \|\| creatingReference\) return;/);
  assert.match(formSource, /disabled=\{saving \|\| pendingAction !== null \|\| mediaBusy \|\| variantsBusy \|\| creatingReference\}/);
  assert.match(formSource, /setPublishError\(""\);/);
  assert.match(formSource, /if \(existingCollection\) \{\s*setSaved\(false\)/);
});
