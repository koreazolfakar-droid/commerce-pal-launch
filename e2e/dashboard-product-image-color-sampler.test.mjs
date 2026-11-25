import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [palette, picker, sampler, form, variants, storefront] = await Promise.all([
  read("../src/lib/productColorPalette.ts"),
  read("../src/dashboard/components/products/ProductColorPicker.tsx"),
  read("../src/dashboard/components/products/ProductImageColorSampler.tsx"),
  read("../src/dashboard/pages/ProductFormPage.tsx"),
  read("../src/dashboard/components/products/ProductVariantManager.tsx"),
  read("../src/components/product/VariantPicker.tsx"),
]);
const { outputText } = ts.transpileModule(palette, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { explicitProductColorHex } = await import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));

test("explicit swatches parse strict hex and optional official names", () => {
  assert.equal(explicitProductColorHex("#3a6B8f"), "#3A6B8F");
  assert.equal(explicitProductColorHex("Midnight Blue (#19243a)"), "#19243A");
  assert.equal(explicitProductColorHex("أزرق (#123456)"), "#123456");
  for (const invalid of ["#abc", "#12345678", "red", "url(#123456)", "red; #123456", "name (#GGGGGG)", "#123456; background:red"]) {
    assert.equal(explicitProductColorHex(invalid), null, invalid);
  }
});

test("sample reads a single original-image pixel and maps touch coordinates", () => {
  assert.match(sampler, /getBoundingClientRect\(\)/);
  assert.match(sampler, /Math\.floor\(x \* image\.naturalWidth\)/);
  assert.match(sampler, /Math\.floor\(y \* image\.naturalHeight\)/);
  assert.match(sampler, /drawImage\(image, px, py, 1, 1, 0, 0, 1, 1\)/);
  assert.match(sampler, /getImageData\(0, 0, 1, 1\)/);
  assert.match(sampler, /if \(a === 0\)/);
  assert.match(sampler, /onPointerDown=/);
  assert.match(sampler, /onPointerMove=/);
  assert.match(sampler, /onPointerCancel=/);
  assert.match(sampler, /onKeyDown=\{keyboardSample\}/);
});

test("sampler uses local file fallback, cleans object URLs, and requires confirmation", () => {
  assert.match(sampler, /crossOrigin="anonymous"/);
  assert.match(sampler, /URL\.createObjectURL\(file\)/);
  assert.match(sampler, /URL\.revokeObjectURL\(url\)/);
  assert.match(sampler, /next\.size > MAX_FILE_BYTES/);
  assert.match(sampler, /disabled=\{!hex\} onClick=\{\(\) => onApply/);
  assert.match(picker, /onApply=\{\(color\) => \{ onChange\(color\); setSampling\(false\); \}\}/);
  assert.match(picker, /onCancel=\{\(\) => setSampling\(false\)\}/);
});

test("create and edit variant pickers use actual product images and storefront renders exact HEX", () => {
  assert.match(form, /imageSources=\{\[\.\.\.pendingImages\.map/);
  assert.match(variants, /imageSources=\{\[draft\.imageUrl\]\}/);
  assert.match(variants, /imageFile=\{pendingImageFile\}/);
  assert.match(picker, /explicitProductColorHex\(value\) \?\? selected\?\.hex/);
  assert.match(storefront, /const sampled = explicitProductColorHex\(value\);\s*if \(sampled\) return sampled;/);
});
