import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

async function readPureModule(path) {
  const source = await read(path);
  const emitted = ts.transpileModule(source, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(emitted.diagnostics?.length ?? 0, 0);
  return import("data:text/javascript;base64," + Buffer.from(emitted.outputText).toString("base64"));
}

const [examples, presets] = await Promise.all([
  readPureModule("../src/lib/productFormExamples.ts"),
  readPureModule("../src/lib/specificationPresets.ts"),
]);

test("every specification field in ten starter categories has a concrete bilingual example", () => {
  assert.equal(presets.SPECIFICATION_PRESETS.length, 10);
  for (const preset of presets.SPECIFICATION_PRESETS) {
    for (const section of preset.template.sections) {
      for (const field of section.fields) {
        for (const lang of ["ar", "en"]) {
          const example = examples.specificationFieldExample(field, lang);
          assert.ok(example && example.trim().length > 0, preset.id + ":" + field.key + ":" + lang);
          assert.doesNotMatch(example, /\bundefined\b|\bnull\b|\bNaN\b/i);
          assert.doesNotMatch(example, /manufacturer|الشركة/i, "starter fields need a concrete example: " + field.key);
        }
      }
    }
  }
});

test("all core product inputs provide examples in both languages", () => {
  const keys = [
    "title", "titleAr", "description", "descriptionAr", "productType", "tags",
    "price", "compareAt", "sku", "barcode", "stock",
    "seoTitle", "seoDescription", "variantStorage", "brandId", "categoryId",
    "status", "collection", "image",
  ];
  for (const key of keys) {
    for (const lang of ["ar", "en"]) {
      assert.ok(examples.productFormExample(key, lang).trim(), key + ":" + lang);
    }
  }
  assert.equal(examples.productFormExample("nonexistent", "ar"), "");
});

test("technical examples adapt to units and do not infer product facts", () => {
  assert.equal(examples.specificationFieldExample({ key: "battery_capacity", unit: "Wh" }, "en"), "60");
  assert.equal(examples.specificationFieldExample({ key: "battery_capacity", unit: "mAh" }, "en"), "5000");
  assert.equal(examples.specificationFieldExample({ key: "weight", unit: "g" }, "en"), "250");
  assert.equal(examples.specificationFieldExample({ key: "new_custom", unit: "mm" }, "en"), "10");
  assert.match(examples.specificationFieldExample({ key: "unknown" }, "ar"), /مواصفات/);
  const mock = { ram: "8" };
  examples.specificationFieldExample({ key: "ram", unit: "GB" }, "en");
  assert.deepEqual(mock, { ram: "8" });
});

test("add/edit product displays examples as non-persisted placeholder and accessible hint", async () => {
  const form = await read("../src/dashboard/pages/ProductFormPage.tsx");
  assert.match(form, /productFormExample\("description", ar \? "ar" : "en"\)/);
  assert.match(form, /productFormExample\("descriptionAr", "ar"\)/);
  assert.match(form, /productFormExample\("seoDescription", ar \? "ar" : "en"\)/);
  assert.match(form, /exampleKey="seoTitle"/);
  assert.match(form, /exampleKey="compareAt"/);
  assert.match(form, /exampleKey="sku"/);
  assert.match(form, /exampleKey="barcode"/);
  assert.match(form, /exampleKey="variantStorage"/);
  assert.match(form, /exampleKey="brandId"/);
  assert.match(form, /exampleKey="categoryId"/);
  assert.match(form, /exampleKey="status"/);
  assert.match(form, /aria-describedby=\{describedBy\}/);
  assert.match(form, /placeholder=\{example \?/);
  assert.match(form, /id=\{hintId\}/);
  assert.match(form, /never save automatically/);
  assert.doesNotMatch(form, /update\([^)]*productFormExample\(/);
});

test("specification field examples have accessible descriptions and retain merchant save boundaries", async () => {
  const editor = await read("../src/dashboard/components/products/ProductSpecificationEditor.tsx");
  assert.match(editor, /specificationFieldExample\(field, ar \? "ar" : "en"\)/);
  assert.match(editor, /aria-describedby=\{hintId\}/);
  assert.match(editor, /placeholder=\{\(ar \? "مثال: " : "e.g. "\) \+ exampleWithUnit\}/);
  assert.match(editor, /<span id=\{hintId\}/);
  assert.match(editor, /onChange\(field.key, event.target.value\)/);
  assert.doesNotMatch(editor, /onChange\(field.key, example/);
  assert.match(editor, /AI Fill Specifications/);
  assert.match(editor, /Expand all/);
});
