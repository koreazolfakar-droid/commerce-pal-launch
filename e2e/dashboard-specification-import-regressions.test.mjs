import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadModule(file) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  const emitted = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(emitted.diagnostics?.length ?? 0, 0);
  return import("data:text/javascript;base64," + Buffer.from(emitted.outputText).toString("base64"));
}

const [imports, presets] = await Promise.all([
  loadModule("../src/lib/specificationImport.ts"),
  loadModule("../src/lib/specificationPresets.ts"),
]);

const phone = presets.specificationPresetById("smartphones").template;
const audio = presets.specificationPresetById("headphones").template;

test("3-column copied specifications round-trip with duplicate localized field labels", () => {
  const template = { sections: [
    { title: "One", fields: [{ key: "primary_battery", label: "Battery", labelAr: "البطارية" }] },
    { title: "Two", fields: [{ key: "case_battery", label: "Battery", labelAr: "البطارية" }] },
  ] };
  const expected = { primary_battery: "450 mAh", case_battery: "750 mAh" };
  for (const ar of [true, false]) {
    const text = imports.exportSpecifications(template, expected, ar);
    assert.match(text, /primary_battery\t/);
    assert.match(text, /case_battery\t/);
    assert.match(text, /البطارية|Battery/);
    const parsed = imports.parseSpecificationImport(text, template);
    assert.equal(parsed.skipped.length, 0);
    assert.deepEqual(Object.fromEntries(parsed.matches.map((entry) => [entry.key, entry.value])), expected);
  }
  // Ambiguous human labels remain deliberately unresolvable.
  assert.deepEqual(imports.parseSpecificationImport("Battery: 450 mAh", template).matches, []);
  assert.equal(imports.parseSpecificationImport("Battery: 450 mAh", template).skipped[0].reason, "ambiguous");
});

test("datasheet aliases match only fields actually present in the selected category", () => {
  const raw = ["Battery: 5000 mAh", "SoC: Snapdragon 8", "Screen diagonal: 6.8", "Operating system: Android"].join("\n");
  const result = imports.parseSpecificationImport(raw, phone);
  assert.deepEqual(result.matches.map((entry) => entry.key), ["battery_capacity", "chipset", "display_size", "operating_system"]);
  const earbuds = imports.parseSpecificationImport("Bluetooth: 5.3\nANC: Yes\nIP rating: IPX5", audio);
  assert.deepEqual(earbuds.matches.map((entry) => entry.key), ["bluetooth_version", "noise_cancellation", "water_resistance"]);
  assert.equal(imports.parseSpecificationImport("Bluetooth: 5.3", phone).matches.length, 0);
  assert.equal(imports.parseSpecificationImport("Unrelated feature: fake", phone).matches.length, 0);
});

test("explicit machine keys win over conflicting natural labels", () => {
  const custom = { sections: [{ title: "Mixed", fields: [
    { key: "battery", label: "Display" },
    { key: "display", label: "Battery" },
  ] }] };
  const imported = imports.parseSpecificationImport("battery\tBattery\t5000 mAh\ndisplay\tDisplay\tOLED", custom);
  assert.deepEqual(imported.matches.map((entry) => entry.key), ["battery", "display"]);
});

test("ambiguous aliases are blocked instead of assigning to the first field", () => {
  const custom = { sections: [{ title: "Hardware", fields: [
    { key: "chipset", label: "SoC" },
    { key: "processor", label: "Desktop CPU" },
  ] }] };
  const result = imports.parseSpecificationImport("CPU: Snapdragon", custom);
  assert.equal(result.matches.length, 0);
  assert.equal(result.skipped[0].reason, "ambiguous");
});

test("oversized import never treats a clipped final value as a complete spec", () => {
  const raw = "RAM: 12 GB\nScreen size: 6.7" + " ".repeat(24_500);
  const parsed = imports.parseSpecificationImport(raw, phone);
  assert.equal(parsed.truncated, true);
  assert.deepEqual(parsed.matches.map((entry) => entry.key), ["ram"]);
  assert.equal(imports.parseSpecificationImport("RAM: 8 GB", phone).matches.length, 1);
});

test("simple two-column TSV and markdown tables remain backwards-compatible", () => {
  assert.deepEqual(imports.parseSpecificationImport("RAM\t12 GB\n| Screen size | 6.7 |", phone).matches.map((row) => row.key), ["ram", "display_size"]);
  assert.deepEqual(imports.parseSpecificationImport("| key | label | value |\n| ram | RAM | 12 GB |", phone).matches.map((row) => row.key), ["ram"]);
});

test("product editor caches unsaved category values and AI review flags and clears on reload", async () => {
  const product = await readFile(new URL("../src/dashboard/pages/ProductFormPage.tsx", import.meta.url), "utf8");
  assert.match(product, /specificationDraftsRef = useRef/);
  assert.match(product, /specificationDraftsRef\.current\.clear\(\)/);
  assert.match(product, /specificationDraftsRef\.current\.set\(form\.categoryId/);
  assert.match(product, /savedDraft\?\.values \?\? specifications/);
  assert.match(product, /savedDraft\?\.aiKeys \?\? aiSpecificationKeys/);
  assert.match(product, /savedCategoryDraft\?\.values/);
  assert.match(product, /savedCategoryDraft\?\.aiKeys/);
  assert.match(product, /normalizeProductSpecifications/);
});
