import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [nvidiaSource, advisorSource, envExample, serverSource, uiSource] = await Promise.all([
  read("src/lib/nvidia.ts"),
  read("src/lib/smartPhoneAdvisor.functions.ts"),
  read(".env.example"),
  read("src/server.ts"),
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

test("NVIDIA client and Smart Advisor remain syntactically valid TypeScript", () => {
  assertTypescriptParses(nvidiaSource, "nvidia.ts");
  assertTypescriptParses(advisorSource, "smartPhoneAdvisor.functions.ts");
  assertTypescriptParses(uiSource, "SmartPhoneAdvisor.tsx");
});

test("NVIDIA API key stays server-only and uses the NIM chat-completions endpoint", () => {
  assert.match(nvidiaSource, /https:\/\/integrate\.api\.nvidia\.com\/v1/);
  assert.match(nvidiaSource, /\/chat\/completions/);
  assert.match(nvidiaSource, /process\.env\["NVIDIA_API_KEY"\]/);
  assert.match(nvidiaSource, /Authorization: `Bearer \$\{apiKey\}`/);
  assert.match(envExample, /^NVIDIA_API_KEY=$/m);
  assert.doesNotMatch(envExample, /^VITE_NVIDIA_API_KEY=/m);
  assert.match(serverSource, /"NVIDIA_API_KEY"/);
  assert.match(serverSource, /"NVIDIA_MODEL"/);
});

test("global Smart Advisor uses NVIDIA and no longer calls Gemini directly", () => {
  assert.match(advisorSource, /callNvidiaChat/);
  assert.match(advisorSource, /provider: "nvidia"/);
  assert.doesNotMatch(advisorSource, /generativelanguage\.googleapis\.com/);
  assert.doesNotMatch(advisorSource, /GEMINI_API_KEY/);
  assert.match(advisorSource, /searchedWeb: false/);
});

test("NVIDIA advisor UI does not claim built-in live web research", () => {
  assert.match(uiSource, /NVIDIA AI \+ live store catalogue/);
  assert.match(uiSource, /Live web verification is not connected yet/);
  assert.doesNotMatch(uiSource, /Live web phone research/);
  assert.doesNotMatch(uiSource, /Researching the web and checking the store/);
});
