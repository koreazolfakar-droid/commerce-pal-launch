import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function moduleFunctions(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}
const { planAiBatches, mergeAiResponses, formCompletion, hasFieldChanged } = await moduleFunctions(
  "../src/dashboard/ai/formFill.ts",
);
const { suppliedEvidenceQuote } = await moduleFunctions(
  "../supabase/functions/dashboard-ai-assist/formEvidence.ts",
);
const edgeSource = await readFile(
  new URL("../supabase/functions/dashboard-ai-assist/index.ts", import.meta.url),
  "utf8",
);
const edge =
  edgeSource.replace(/^import .*;\n/gm, "") +
  "\nexport { cleanFields, buildGeminiRequest, normalizeAiResult, verifySuggestions, suggestionFieldsForAction };";
const output = ts.transpileModule(edge, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const sandbox = { exports: {}, Deno: { serve() {} }, URL, suppliedEvidenceQuote, console };
vm.runInNewContext(output, sandbox);
const engine = sandbox.exports;
const field = (key) => ({ key, label: key, maxLength: 500, review: key.startsWith("spec__") });
const request = (overrides) => ({
  entity: "product",
  action: "research_fill",
  query: "Phone 25",
  fillMode: "empty",
  currentData: {},
  fields: [],
  context: {},
  ...overrides,
});
const response = (overrides) => ({
  entity: "product",
  action: "research_fill",
  model: "fixture",
  grounded: true,
  entityMatch: { status: "exact", canonicalName: "Phone 25", reason: "exact" },
  suggestions: [],
  warnings: [],
  sources: [],
  ...overrides,
});
const suggestion = (key, decision = "allow") => ({
  field: key,
  value: "Value",
  decision,
  risk: "low",
  confidence: 0.9,
  verified: false,
  reason: "",
  checks: [],
  sourceUrls: [],
});

test("large category templates retain every requested specification and scope each request", () => {
  const fields = Array.from({ length: 91 }, (_, i) => field(`spec__field_${i}`));
  const batches = planAiBatches(request({ fields }));
  assert.equal(batches.length, 3);
  assert.equal(batches.flatMap((batch) => batch.fields).length, 91);
  for (const batch of batches) {
    assert.ok(batch.fields.length <= 40);
    assert.deepEqual(
      batch.context.specKeys,
      batch.fields.map((item) => item.key.slice(6)),
    );
    assert.equal(
      engine.cleanFields(batch.fields, "product", batch.context).length,
      batch.fields.length,
    );
  }
});
test("fill-empty mode preserves populated values; explicit improve mode retains them", () => {
  const initial = request({
    fields: [field("title"), field("description")],
    currentData: { title: "Existing name", description: "  " },
  });
  assert.deepEqual(
    planAiBatches(initial)[0].fields.map((item) => item.key),
    ["description"],
  );
  assert.equal(planAiBatches({ ...initial, fillMode: "all" })[0].fields.length, 2);
  assert.equal(planAiBatches({ ...initial, action: "validate" })[0].fields.length, 2);
});
test("request batches also respect UTF-8 payload size", () => {
  const fields = Array.from({ length: 15 }, (_, i) => field(`spec__field_${i}`));
  const batches = planAiBatches(
    request({
      fillMode: "all",
      fields,
      sourceText: "مرجع".repeat(2000),
      currentData: Object.fromEntries(fields.map((item) => [item.key, "م".repeat(5000)])),
    }),
  );
  assert.ok(batches.length > 1);
  assert.equal(batches.flatMap((batch) => batch.fields).length, 15);
  for (const batch of batches)
    assert.ok(new TextEncoder().encode(JSON.stringify(batch)).byteLength <= 60 * 1024);
});
test("unavailable and blocked fields never count as completed", () => {
  const state = formCompletion(
    [field("title"), field("description"), field("spec__battery")],
    { title: "Phone" },
    [suggestion("description"), suggestion("spec__battery", "block")],
    new Set(["description", "spec__battery"]),
  );
  assert.equal(state.completed, 2);
  assert.deepEqual(
    state.missing.map((item) => item.key),
    ["spec__battery"],
  );
  assert.equal(hasFieldChanged("title", { title: "Phone" }, { title: "My edit" }), true);
});
test("supplied evidence must quote actual text and contain the whole value", () => {
  assert.equal(suppliedEvidenceQuote("Phone 25 RAM: 8 GB", "RAM: 8 GB", "8 GB"), "RAM: 8 GB");
  assert.equal(suppliedEvidenceQuote("Phone 25 RAM: 128 GB", "RAM: 128 GB", "8 GB"), "");
  assert.equal(suppliedEvidenceQuote("Phone 25 RAM: 8 GB", "RAM: 16 GB", "16 GB"), "");
});
test("unverified specifications require exact entity and a real supplied quotation", async () => {
  const args = {
    admin: {},
    entity: "product",
    fields: [field("spec__ram")],
    currentData: {},
    context: { specKeys: ["ram"] },
    entityMatch: { status: "exact", canonicalName: "Phone 25", reason: "exact" },
    suggestions: [
      {
        field: "spec__ram",
        value: "8 GB",
        modelConfidence: 0.95,
        verified: false,
        reason: "supplied",
        sourceUrls: [],
        inputQuote: "RAM: 8 GB",
      },
    ],
    grounded: false,
    sources: [],
    sourceText: "Phone 25 RAM: 8 GB",
  };
  const [supported] = await engine.verifySuggestions(args);
  assert.equal(supported.decision, "review");
  assert.equal(supported.verified, false);
  assert.equal(supported.inputQuote, "RAM: 8 GB");
  const [unsupported] = await engine.verifySuggestions({ ...args, sourceText: "" });
  assert.equal(unsupported.decision, "block");
  const [wrongModel] = await engine.verifySuggestions({
    ...args,
    entityMatch: { ...args.entityMatch, status: "partial" },
  });
  assert.equal(wrongModel.decision, "block");
});
test("content entities cannot request operational fields or arbitrary specification keys", () => {
  const keys = engine
    .cleanFields(
      [field("title"), field("price"), field("stock"), field("permissions"), field("imageUrl")],
      "collection",
      {},
    )
    .map((item) => item.key);
  assert.equal(keys.join(","), "title");
  assert.equal(
    engine.cleanFields([field("spec__secret")], "product", { specKeys: ["ram"] }).length,
    0,
  );
  assert.equal(
    engine.suggestionFieldsForAction([field("titleAr"), field("descriptionAr")], "seo", "seo_page")
      .length,
    2,
  );
});
test("batch aggregation retains every field and conservative grounding metadata", () => {
  const combined = mergeAiResponses([
    response({ suggestions: [suggestion("title")] }),
    response({
      grounded: false,
      entityMatch: { status: "partial", canonicalName: "Phone", reason: "variant missing" },
      suggestions: [suggestion("description")],
      missingFields: [{ field: "barcode", reason: "unknown" }],
    }),
  ]);
  assert.equal(combined.suggestions.length, 2);
  assert.equal(combined.grounded, false);
  assert.equal(combined.entityMatch.status, "partial");
  assert.equal(combined.missingFields[0].field, "barcode");
});
test("collection handles reject duplicates and exclude the collection being edited", async () => {
  const lookups = [];
  let duplicate = true;
  const admin = {
    from(table) {
      const query = {
        select() {
          return query;
        },
        eq(key, value) {
          lookups.push([table, key, value]);
          return query;
        },
        limit() {
          return query;
        },
        neq(key, value) {
          lookups.push(["exclude", key, value]);
          return query;
        },
        then(resolve) {
          return Promise.resolve({ data: duplicate ? [{ id: "other" }] : [], error: null }).then(
            resolve,
          );
        },
      };
      return query;
    },
  };
  const args = {
    admin,
    entity: "collection",
    fields: [{ ...field("handle"), review: true }],
    currentData: {},
    context: { entityId: "own-id" },
    entityMatch: { status: "exact", canonicalName: "Summer", reason: "given" },
    suggestions: [
      { ...suggestion("handle"), value: "summer", modelConfidence: 0.9, inputQuote: "" },
    ],
    grounded: false,
    sources: [],
    sourceText: "",
  };
  const [blocked] = await engine.verifySuggestions(args);
  assert.equal(blocked.decision, "block");
  assert.ok(lookups.some((item) => item.join(":") === "exclude:id:own-id"));
  duplicate = false;
  const [available] = await engine.verifySuggestions(args);
  assert.equal(available.decision, "review");
  assert.ok(available.checks.includes("Collection handle is available"));
});
