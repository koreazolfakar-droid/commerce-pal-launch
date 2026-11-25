import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [form, review, preview] = await Promise.all([
  read("../src/dashboard/pages/ProductFormPage.tsx"),
  read("../src/dashboard/components/products/ProductPublishReview.tsx"),
  read("../src/dashboard/components/products/ProductCreatePreview.tsx"),
]);

test("collapsed publish review offers a direct route to the first real blocker", () => {
  assert.match(review, /!expanded && result\.blockers\.length > 0/);
  assert.match(review, /onClick=\{\(\) => onJump\(result\.blockers\[0\]\)\}/);
  assert.match(review, /!expanded && result\.canPublish/);
  assert.match(review, /disabled=\{busy \|\| !result\.canPublish\}/);
});

test("field navigation opens nested translations and supports the Arabic description", () => {
  assert.match(form, /querySelector<HTMLInputElement \| HTMLTextAreaElement>/);
  assert.match(form, /ancestor instanceof HTMLDetailsElement\) ancestor\.open = true/);
  assert.match(form, /field && !field\.disabled \? field : target/);
  assert.match(form, /data-product-field="descriptionAr"/);
  assert.match(form, /id="product-descriptionAr-error"/);
});

test("pricing and inventory precede the preview and optional organization in the sidebar", () => {
  const aside = form.slice(form.indexOf('<aside className="dashboard-product-aside'));
  const ids = ['id="product-pricing"', 'id="product-inventory"', '<ProductCreatePreview', 'id="product-organization"', 'id="product-publishing"'];
  let previous = -1;
  for (const id of ids) {
    const position = aside.indexOf(id);
    assert.ok(position > previous, id);
    previous = position;
  }
});

test("section progress reflects actual field values and variant-managed inventory", () => {
  assert.match(form, /complete: variantLocked \|\| \(form\.stock\.trim\(\) !== "" && !validateProductDraft\(form\)\.errors\.stock\)/);
  assert.match(form, /complete: variantLocked \|\| \(!validateProductDraft\(form\)\.errors\.price && !validateProductDraft\(form\)\.errors\.compareAt\)/);
  assert.match(form, /specificationKeys\(specificationTemplate\)\.some\(\(key\) => Boolean\(specifications\[key\]\?\.trim\(\)\)\)/);
});

test("preview rejects invalid numerical values and uses dashboard theme tokens", () => {
  assert.match(preview, /Number\.isFinite\(compareValue\)/);
  assert.match(preview, /Number\.isInteger\(stockValue\)/);
  assert.match(preview, /!validStock \? "—"/);
  assert.match(preview, /border-border bg-card/);
  assert.match(preview, /dark:text-emerald-300/);
});
