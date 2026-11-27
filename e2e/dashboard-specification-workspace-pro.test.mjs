import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadPureModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const result = ts.transpileModule(source, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(result.diagnostics?.length ?? 0, 0);
  return import("data:text/javascript;base64," + Buffer.from(result.outputText).toString("base64"));
}

const [presets, imported, merged, model] = await Promise.all([
  loadPureModule("../src/lib/specificationPresets.ts"),
  loadPureModule("../src/lib/specificationImport.ts"),
  loadPureModule("../src/lib/specificationTemplateMerge.ts"),
  loadPureModule("../src/lib/productSpecifications.ts"),
]);

const phone = presets.specificationPresetById("smartphones").template;
const sound = presets.specificationPresetById("headphones").template;

test("paste import only maps exact current category fields and handles Arabic, Markdown, TSV", () => {
  const parsed = imported.parseSpecificationImport([
    "Screen size: 6.7",
    "RAM\t12 GB",
    "| Panel technology | AMOLED |",
    "سعة البطارية: 5000 mAh",
    "Random marketing claim: Best in the world",
  ].join("\n"), phone);
  assert.deepEqual(parsed.matches.map((row) => row.key), [
    "display_size", "ram", "display_type", "battery_capacity",
  ]);
  assert.equal(parsed.skipped.length, 1);
  assert.equal(parsed.skipped[0].reason, "unmatched");
  assert.equal(parsed.matches[0].value, "6.7");
  assert.equal(parsed.truncated, false);
  assert.deepEqual(imported.parseSpecificationImport("Bluetooth version: 5.3", phone).matches, []);
  assert.deepEqual(imported.parseSpecificationImport("Bluetooth version: 5.3", sound).matches.map((m) => m.key), ["bluetooth_version"]);
});

test("duplicate, ambiguity, placeholders and oversized values are rejected without guessing", () => {
  const parsed = imported.parseSpecificationImport([
    "RAM: 8 GB",
    "RAM: 12 GB",
    "Storage: n/a",
    "Screen size: " + "x".repeat(501),
    "Unknown field: some text",
  ].join("\n"), phone);
  assert.deepEqual(parsed.matches.map((m) => [m.key, m.value]), [["ram", "8 GB"]]);
  assert.deepEqual(parsed.skipped.map((row) => row.reason), ["duplicate", "empty", "too_long", "unmatched"]);

  const ambiguous = {
    sections: [{ title: "X", fields: [
      { key: "a", label: "Battery" },
      { key: "b", label: "Battery" },
    ] }],
  };
  const found = imported.parseSpecificationImport("Battery: 4000 mAh", ambiguous);
  assert.equal(found.matches.length, 0);
  assert.equal(found.skipped[0].reason, "ambiguous");
});

test("existing values cannot be overwritten without explicit opt-in", () => {
  const original = { ram: "16 GB", chipset: "Verified chipset" };
  const draft = imported.parseSpecificationImport("RAM: 12 GB\nScreen size: 6.7", phone);
  const protectedPatch = imported.specificationImportPatch(draft, original, false);
  assert.deepEqual(protectedPatch, { display_size: "6.7" });
  assert.deepEqual(original, { ram: "16 GB", chipset: "Verified chipset" });
  assert.deepEqual(imported.specificationImportPatch(draft, original, true), { ram: "12 GB", display_size: "6.7" });
});

test("pasted content is bounded by line and character count", () => {
  const lines = Array(161).fill("RAM: 8 GB").join("\n");
  const parsed = imported.parseSpecificationImport(lines, phone);
  assert.equal(parsed.truncated, true);
  assert.equal(parsed.matches.length, 1);
  assert.equal(parsed.skipped.length, 159);
  assert.equal(imported.parseSpecificationImport("x".repeat(25_000), phone).truncated, true);
});

test("completed field export round-trips through the import parser", () => {
  const expected = { display_size: "6.7", ram: "12 GB", battery_capacity: "5000 mAh" };
  for (const ar of [false, true]) {
    const exported = imported.exportSpecifications(phone, expected, ar);
    const parsed = imported.parseSpecificationImport(exported, phone);
    assert.deepEqual(Object.fromEntries(parsed.matches.map((row) => [row.key, row.value])), expected);
  }
});

test("adding missing template fields preserves existing keys and respects schema limits", () => {
  const original = {
    sections: [{ title: "Display", titleAr: "الشاشة", fields: [
      { key: "display_size", label: "Custom sized", unit: "inches" },
    ] }],
  };
  const extra = merged.mergeSpecificationTemplates(original, phone);
  assert.equal(extra.alreadyPresent, 1);
  assert.equal(extra.added, model.specificationKeys(phone).length - 1);
  assert.equal(extra.template.sections[0].fields[0].label, "Custom sized");
  assert.equal(original.sections[0].fields.length, 1);
  assert.deepEqual(merged.mergeSpecificationTemplates(extra.template, phone).added, 0);
  assert.deepEqual(model.normalizeSpecificationTemplate(extra.template), extra.template);

  const full = { sections: Array.from({ length: 16 }, (_, n) => ({
    title: "Section " + n,
    fields: [{ key: "some_" + n, label: "Some field " + n }],
  })) };
  const limited = merged.mergeSpecificationTemplates(full, phone);
  assert.equal(limited.added, 0);
  assert.equal(limited.skippedForLimit, model.specificationKeys(phone).length);
  assert.deepEqual(limited.template, full);
});

test("product and category workspaces are wired with review and no direct persistence", async () => {
  const [productEditor, productImport, categoryEditor, productPage] = await Promise.all([
    readFile(new URL("../src/dashboard/components/products/ProductSpecificationEditor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/components/products/ProductSpecificationImportPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/components/categories/CategorySpecificationTemplateEditor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/pages/ProductFormPage.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(productEditor, /ProductSpecificationImportPanel/);
  assert.match(productEditor, /visibleSpecificationSections\(/);
  assert.match(productEditor, /aria-invalid/);
  assert.match(productImport, /specificationImportPatch/);
  assert.match(productImport, /validateSpecificationValue/);
  assert.match(productImport, /allow replacing filled values/i);
  assert.doesNotMatch(productImport, /supabase|\.rpc\(/);
  assert.match(categoryEditor, /mergeSpecificationTemplates/);
  assert.match(categoryEditor, /Add missing fields/);
  assert.match(categoryEditor, /window\.confirm/);
  assert.match(productPage, /key=\{form\.categoryId \|\| "uncategorized"\}/);
});
