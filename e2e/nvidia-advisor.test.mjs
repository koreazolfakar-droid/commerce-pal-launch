import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [advisorSource, uiSource] = await Promise.all([
  read("src/lib/smartPhoneAdvisor.functions.ts"),
  read("src/components/SmartPhoneAdvisor.tsx"),
]);

function assertTypescriptParses(source, fileName) {
  const result = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, []);
}

test("Space Call smart bot and UI parse as TypeScript", () => {
  assertTypescriptParses(advisorSource, "smartPhoneAdvisor.functions.ts");
  assertTypescriptParses(uiSource, "SmartPhoneAdvisor.tsx");
});

test("smart bot stays local, catalogue-grounded and conversation-aware", () => {
  assert.match(advisorSource, /provider: "local"/);
  assert.match(advisorSource, /spacecall-smart-bot-v2/);
  assert.match(advisorSource, /fetchCatalogProducts/);
  assert.match(advisorSource, /historyText/);
  assert.match(advisorSource, /extractSpecFacts/);
  assert.match(advisorSource, /searchedWeb: false/);
  assert.doesNotMatch(advisorSource, /callNvidiaChat/);
  assert.doesNotMatch(advisorSource, /generativelanguage\.googleapis\.com/);
  assert.doesNotMatch(advisorSource, /ai\.gateway\.lovable\.dev/);
});

test("shopping assistant keeps chat memory and guided recommendations", () => {
  assert.match(uiSource, /spacecall-ai-chat-v2/);
  assert.match(uiSource, /spacecall-ai-profile-v1/);
  assert.match(uiSource, /Find a phone for me/);
  assert.match(uiSource, /result\.followUps/);
  assert.match(uiSource, /shopping assistant/);
});
