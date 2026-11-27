import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const source = await read("../src/dashboard/lib/productPublishReadiness.ts");
const transpiled = ts.transpileModule(source, {
  fileName: "productPublishReadiness.ts",
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { buildProductPublishReadiness } = await import(
  "data:text/javascript;base64," + Buffer.from(transpiled.outputText).toString("base64")
);

function draft(overrides = {}) {
  return {
    validationErrors: {}, invalidSpecifications: [],
    isNew: true, hasPublishImage: true, hasAnyImage: true,
    description: "Verified device description", brandId: "brand-id", categoryId: "category-id",
    sku: "S25-BLK", barcode: "REAL-GTIN", seoTitle: "S25 | Space Call",
    seoDescription: "Verified details", stock: "10",
    specificationFields: 3, filledSpecifications: 3,
    ...overrides,
  };
}

test("new product readiness faithfully blocks missing images without blocking draft saves", () => {
  const ready = buildProductPublishReadiness(draft());
  const missingImage = buildProductPublishReadiness(draft({
    hasPublishImage: false, hasAnyImage: false,
  }));
  assert.equal(ready.canPublish, true);
  assert.equal(ready.checksPassed, ready.checksTotal);
  assert.equal(missingImage.canPublish, false);
  assert.ok(missingImage.blockers.some((issue) =>
    issue.id === "missing-image" && issue.sectionId === "product-media"));
  assert.ok(!missingImage.recommendations.some((issue) => issue.id === "image"));
});

test("existing product image is only recommended because existing save never required it", () => {
  const review = buildProductPublishReadiness(draft({
    isNew: false, hasPublishImage: false, hasAnyImage: false,
  }));
  assert.equal(review.canPublish, true);
  assert.ok(review.recommendations.some((issue) => issue.id === "image"));
  assert.ok(!review.blockers.some((issue) => issue.id === "missing-image"));
});

test("core input validation errors are each navigable and must be resolved before publish", () => {
  const review = buildProductPublishReadiness(draft({
    validationErrors: {
      title: "Product title is required",
      price: "Price must be greater than zero",
      stock: "Stock must be non-negative",
      compareAt: "Compare-at price is invalid",
      titleAr: "Too long",
      tags: "Too many tags",
    },
  }));
  assert.equal(review.canPublish, false);
  for (const field of ["title", "price", "stock", "compareAt", "titleAr", "tags"]) {
    assert.ok(review.blockers.some((item) => item.fieldKey === field), field);
  }
  assert.ok(review.checksPassed < review.checksTotal);
});

test("malformed technical specs are reported individually with exact keys", () => {
  const review = buildProductPublishReadiness(draft({
    invalidSpecifications: [
      { key: "ram", label: "RAM", labelAr: "الذاكرة", message: "Requires numeric GB" },
      { key: "bluetooth_version", label: "Bluetooth version", message: "Requires number" },
    ],
  }));
  assert.equal(review.canPublish, false);
  assert.equal(review.blockers.length, 2);
  assert.equal(review.blockers[0].specKey, "ram");
  assert.equal(review.blockers[1].specKey, "bluetooth_version");
  assert.ok(review.blockers.every((issue) => issue.sectionId === "product-specifications"));
  assert.ok(review.checksPassed < review.checksTotal);
});

test("optional merchandising advice never becomes a hard publishing requirement", () => {
  const review = buildProductPublishReadiness(draft({
    description: "", brandId: "", categoryId: "", sku: "", barcode: "",
    seoTitle: "", seoDescription: "", stock: "0",
    filledSpecifications: 0,
  }));
  assert.equal(review.canPublish, true);
  assert.equal(review.blockers.length, 0);
  for (const id of [
    "description", "category", "brand", "sku", "barcode",
    "specifications", "seo", "zero-stock",
  ]) {
    assert.ok(review.recommendations.some((issue) => issue.id === id), id);
  }
});

test("review is pure and never modifies product inputs or fake saved values", () => {
  const original = draft({ barcode: "", invalidSpecifications: [{key:"ram",label:"RAM",message:"Invalid"}] });
  const before = JSON.stringify(original);
  buildProductPublishReadiness(original);
  assert.equal(JSON.stringify(original), before);
  assert.doesNotMatch(source, /saveDashboardProduct|setDashboardProductsStatus|supabase|fetch\(/);
});

test("publish buttons route to a separate explicit review and confirmation", async () => {
  const [form, review, editor, map, browserTest] = await Promise.all([
    read("../src/dashboard/pages/ProductFormPage.tsx"),
    read("../src/dashboard/components/products/ProductPublishReview.tsx"),
    read("../src/dashboard/components/products/ProductSpecificationEditor.tsx"),
    read("../src/dashboard/components/products/ProductFormMap.tsx"),
    read("../e2e/dashboard-product-editor-browser.mjs"),
  ]);
  assert.match(form, /onClick=\{\(\) => submitProduct\("Active"\)\}/);
  assert.match(form, /isPublishRequest && \(!reviewConfirmed \|\| !publishReadiness\.canPublish\)/);
  assert.match(form, /onConfirm=\{\(\) => submitProduct\("Active", true\)\}/);
  assert.match(form, /const saveLockRef = useRef\(false\)/);
  assert.match(form, /setPublishReviewExpanded\(true\)/);
  assert.match(form, /<ProductPublishReview/);
  assert.match(form, /onClick=\{\(\) => submitProduct\("Draft"\)\}/);
  assert.match(review, /disabled=\{busy \|\| !result\.canPublish\}/);
  assert.match(review, /aria-expanded=\{expanded\}/);
  assert.match(review, /aria-controls="product-publish-review-content"/);
  assert.match(review, /aria-live="polite"/);
  assert.match(editor, /reviewFocusRequest/);
  assert.match(editor, /setOpenSections\(\(current\) => new Set\(\[\.\.\.current, sectionKey\]\)\)/);
  assert.match(map, /NAVIGATION_ONLY/);
  assert.match(browserTest, /getByRole\("button",\{name:"Confirm publish",exact:true\}\)\.click\(\)/);
});
