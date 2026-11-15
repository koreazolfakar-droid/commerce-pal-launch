import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Both modules import types only, so the emitted JS is safe to evaluate directly.
async function loadPureModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: relativePath,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(diagnostics?.length ?? 0, 0);
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

const presets = await loadPureModule("../src/lib/specificationPresets.ts");
const model = await loadPureModule("../src/lib/productSpecifications.ts");
const [categoryEditor, categoryForm, productEditor] = await Promise.all([
  readFile(new URL("../src/dashboard/components/categories/CategorySpecificationTemplateEditor.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/categories/CategoryForm.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/products/ProductSpecificationEditor.tsx", import.meta.url), "utf8"),
]);

test("electronics templates are valid, localised, bounded and duplicate-key free", () => {
  assert.equal(presets.SPECIFICATION_PRESETS.length, 10);
  for (const preset of presets.SPECIFICATION_PRESETS) {
    assert.equal(preset.template.sections.length > 0, true, preset.id);
    assert.equal(preset.template.sections.length <= 16, true, preset.id);
    const normalized = model.normalizeSpecificationTemplate(preset.template);
    assert.deepEqual(normalized, preset.template, `normalizer should preserve ${preset.id}`);
    const keys = model.specificationKeys(normalized);
    assert.equal(keys.length, new Set(keys).size, `duplicate keys in ${preset.id}`);
    assert.equal(keys.length >= 7, true, `too few fields in ${preset.id}`);
    assert.equal(keys.every((key) => key.length <= 48), true);
    assert.equal(normalized.sections.every((section) =>
      section.titleAr && section.fields.every((field) => field.labelAr)
    ), true);
    assert.equal(Object.values(preset.template).some((value) => typeof value === "string" && value.includes("Samsung")), false);
  }
});

test("category matching is conservative and never guesses models from brand names", () => {
  assert.equal(presets.recommendSpecificationPreset("Smartphones")?.id, "smartphones");
  assert.equal(presets.recommendSpecificationPreset("Mobile Phones")?.id, "smartphones");
  assert.equal(presets.recommendSpecificationPreset("Headphones & Earbuds")?.id, "headphones");
  assert.equal(presets.recommendSpecificationPreset("Audio & Speakers")?.id, "speakers");
  assert.equal(presets.recommendSpecificationPreset("Gaming Consoles")?.id, "consoles");
  assert.equal(presets.recommendSpecificationPreset("Wall Charger")?.id, "chargers");
  assert.equal(presets.recommendSpecificationPreset("سماعات")?.id, "headphones");
  assert.equal(presets.recommendSpecificationPreset("Phone accessories"), null);
  assert.equal(presets.recommendSpecificationPreset("Samsung Galaxy S25 Ultra"), null);
  assert.equal(presets.recommendSpecificationPreset(""), null);
});

test("preset copies are independent and existing product values stay untouched", () => {
  const preset = presets.specificationPresetById("laptops");
  assert.ok(preset);
  const first = presets.copySpecificationPreset(preset);
  const second = presets.copySpecificationPreset(preset);
  first.sections[0].fields[0].label = "Local customization";
  assert.notEqual(first.sections[0].fields[0].label, second.sections[0].fields[0].label);
  assert.notEqual(first.sections[0].fields[0].label, preset.template.sections[0].fields[0].label);
  assert.deepEqual(model.normalizeProductSpecifications({ processor: "Core Ultra 7" }, second), { processor: "Core Ultra 7" });
  assert.deepEqual(model.normalizeProductSpecifications({ fake: "100", processor: "Core Ultra 7" }, second), { processor: "Core Ultra 7" });
});

test("suggestions are optional selections and integrate with category/product editors", () => {
  assert.deepEqual(presets.specificationFieldSuggestions("nonexistent"), []);
  assert.ok(presets.specificationFieldSuggestions("noise_cancellation").includes("ANC"));
  assert.match(categoryEditor, /copySpecificationPreset\(preset\)/);
  assert.match(categoryEditor, /window\.confirm/);
  assert.match(categoryForm, /categorySlug=\{draft\.slug\}/);
  assert.match(productEditor, /specificationFieldSuggestions\(field\.key\)/);
  assert.match(productEditor, /role="progressbar"/);
  assert.match(productEditor, /AI Fill Specifications/);
  assert.match(productEditor, /Find a specification/);
});
