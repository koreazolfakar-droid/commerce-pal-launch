import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/ai.functions.ts", import.meta.url), "utf8");

test("AI server module remains syntactically valid TypeScript", () => {
  const result = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });

  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, []);
});

test("Gemini 2.x does not combine Google Search with structured-output config", () => {
  assert.match(source, /function supportsStructuredOutputWithTools\(model: string\)/);
  assert.match(source, /return \/\^gemini-3/);
  assert.match(source, /const generationConfig = supportsStructuredOutputWithTools\(model\)/);
  assert.match(source, /responseMimeType: "application\/json"/);
  assert.match(source, /tools: \[\{ google_search: \{\} \}\]/);
});

test("grounding sources are read from the Gemini candidate", () => {
  assert.match(source, /groundingMetadata\?: GroundingMetadata/);
  assert.match(source, /const candidate = payload\.candidates\?\.\[0\]/);
  assert.match(source, /candidate\?\.groundingMetadata \?\? payload\.groundingMetadata/);
});

test("non-schema Gemini responses tolerate JSON code fences", () => {
  assert.match(source, /function extractGeminiJson\(text: string\)/);
  assert.match(source, /JSON\.parse\(extractGeminiJson\(text\)\)/);
});
