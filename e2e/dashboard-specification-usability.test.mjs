import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function readPureModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const result = ts.transpileModule(source, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(result.diagnostics?.length ?? 0, 0);
  return import("data:text/javascript;base64," + Buffer.from(result.outputText).toString("base64"));
}

const [view, presets] = await Promise.all([
  readPureModule("../src/lib/specificationEntryView.ts"),
  readPureModule("../src/lib/specificationPresets.ts"),
]);
const phones = presets.specificationPresetById("smartphones").template;

test("missing-only view keeps an actively edited field visible until filter changes", () => {
  const draft = { display_size: "", ram: "12", storage: "" };
  const missingBefore = view.visibleSpecificationSections(phones, draft, "missing", "", new Set());
  assert.ok(missingBefore.flatMap((section) => section.fields).some((field) => field.key === "display_size"));

  const whileEditing = view.visibleSpecificationSections(
    phones, { ...draft, display_size: "6.7" }, "missing", "", new Set(["display_size"]),
  );
  assert.ok(whileEditing.flatMap((section) => section.fields).some((field) => field.key === "display_size"));
  assert.ok(!whileEditing.flatMap((section) => section.fields).some((field) => field.key === "ram"));

  const afterSelectingFilterAgain = view.visibleSpecificationSections(
    phones, { ...draft, display_size: "6.7" }, "missing", "", new Set(),
  );
  assert.ok(!afterSelectingFilterAgain.flatMap((section) => section.fields).some((field) => field.key === "display_size"));
});

test("filled-only view preserves a cleared active input while typing", () => {
  const values = { ram: "", display_size: "6.7" };
  const result = view.visibleSpecificationSections(
    phones, values, "filled", "", new Set(["ram"]),
  );
  const keys = result.flatMap((section) => section.fields.map((field) => field.key));
  assert.ok(keys.includes("ram"));
  assert.ok(keys.includes("display_size"));
  assert.equal(view.visibleSpecificationSections(phones, values, "filled", "", new Set())
    .flatMap((section) => section.fields).some((field) => field.key === "ram"), false);
});

test("search is bilingual, case-insensitive, and handles normalized Unicode", () => {
  assert.deepEqual(
    view.visibleSpecificationSections(phones, {}, "all", "حجم الشاشة", new Set())
      .flatMap((section) => section.fields.map((field) => field.key)),
    ["display_size"],
  );
  assert.deepEqual(
    view.visibleSpecificationSections(phones, {}, "all", "RAM", new Set())
      .flatMap((section) => section.fields.map((field) => field.key)),
    ["ram"],
  );
  assert.deepEqual(view.visibleSpecificationSections(phones, {}, "all", "no matching fields", new Set()), []);
});

test("next missing is deterministic, does not mutate data, and handles fully completed templates", () => {
  const keys = phones.sections.flatMap((section) => section.fields.map((field) => field.key));
  assert.equal(view.nextMissingSpecificationKey(phones, {}), keys[0]);
  assert.equal(view.nextMissingSpecificationKey(phones, { [keys[0]]: "6.7" }), keys[1]);
  const complete = Object.fromEntries(keys.map((key) => [key, "verified"]));
  assert.equal(view.nextMissingSpecificationKey(phones, complete), null);
  assert.equal(view.nextMissingSpecificationKey({ sections: [] }, {}), null);
});

test("editor shows tappable suggestions, explicit next missing and review-error actions", async () => {
  const editor = await readFile(new URL("../src/dashboard/components/products/ProductSpecificationEditor.tsx", import.meta.url), "utf8");
  assert.match(editor, /visibleSpecificationSections\(/);
  assert.match(editor, /editedVisibleKeys/);
  assert.match(editor, /nextMissingSpecificationKey\(/);
  assert.match(editor, /Next missing field/);
  assert.match(editor, /Review errors/);
  assert.match(editor, /focusField\(/);
  assert.match(editor, /activeFieldKey === field.key/);
  assert.match(editor, /suggestions\.slice\(0, 5\)/);
  assert.match(editor, /onClick=\{\(\) => \{/);
  assert.match(editor, /event\.currentTarget\.contains\(event\.relatedTarget\)/);
  assert.match(editor, /Show all fields/);
});

test("category editor defaults to simple view and allows accessible reordering", async () => {
  const editor = await readFile(new URL("../src/dashboard/components/categories/CategorySpecificationTemplateEditor.tsx", import.meta.url), "utf8");
  assert.match(editor, /showTechnical, setShowTechnical/);
  assert.match(editor, /Technical options/);
  assert.match(editor, /showTechnical \? \(/);
  assert.match(editor, /Move section up:/);
  assert.match(editor, /Move section down:/);
  assert.match(editor, /Move field up:/);
  assert.match(editor, /Move field down:/);
  assert.match(editor, /commit\(\{ sections \}\)/);
  assert.match(editor, /dark:border-slate-600/);
});
