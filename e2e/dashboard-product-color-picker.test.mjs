import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [source, picker, storefront] = await Promise.all([
  read("../src/lib/productColorPalette.ts"),
  read("../src/dashboard/components/products/ProductColorPicker.tsx"),
  read("../src/components/product/VariantPicker.tsx"),
]);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { PRODUCT_COLOR_PRESETS, findProductColor, searchProductColors } =
  await import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));

test("all presets have unique names, translated labels and valid hex swatches", () => {
  assert.equal(PRODUCT_COLOR_PRESETS.length, 38);
  assert.equal(new Set(PRODUCT_COLOR_PRESETS.map(c => c.name)).size, 38);
  for (const color of PRODUCT_COLOR_PRESETS) {
    assert.match(color.hex, /^#[0-9a-f]{6}$/i);
    assert.ok(color.ar);
    assert.equal(findProductColor(color.name), color);
    assert.equal(findProductColor(color.ar), color);
  }
});

test("search is bilingual and supports case, spaces and Arabic alef variants", () => {
  assert.equal(findProductColor("  MIDNIGHT   BLUE ").name, "Midnight Blue");
  assert.equal(findProductColor("ازرق").name, "Blue");
  assert.equal(findProductColor("Grey").name, "Gray");
  assert.ok(searchProductColors("تيتانيوم").some(c => c.name === "Natural Titanium"));
  assert.ok(searchProductColors("blue").some(c => c.name === "Ice Blue"));
  assert.equal(searchProductColors("unknown proprietary name").length, 0);
});

test("compound shades remain distinct; unknown custom names are not guessed by the editor", () => {
  assert.notEqual(findProductColor("Midnight Blue").hex, findProductColor("Blue").hex);
  assert.notEqual(findProductColor("Black Titanium").hex, findProductColor("Titanium").hex);
  assert.equal(findProductColor("Manufacturer exclusive shade"), undefined);
  assert.equal(findProductColor(""), undefined);
});

test("editor preserves custom text, exposes clear and search controls, and avoids huge default grids", () => {
  assert.match(picker, /const COMMON_COUNT = 12/);
  assert.match(picker, /value=\{value\} onChange=\{\(event\) => onChange\(event\.target\.value\)\}/);
  assert.match(picker, /aria-pressed=\{active\}/);
  assert.match(picker, /aria-expanded=\{expanded\}/);
  assert.match(picker, /onClick=\{\(\) => onChange\(""\)\}/);
  assert.match(picker, /searchProductColors\(query\)/);
});

test("storefront uses the same exact swatch mapping before legacy heuristic fallback", () => {
  assert.match(storefront, /const preset = findProductColor\(value\);\s*if \(preset\) return preset\.hex;/);
  assert.match(storefront, /COLOR_WORDS\[normalized\]/);
});
