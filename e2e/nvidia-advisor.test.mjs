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

test("Supabase NVIDIA gateway client and Smart Advisor parse as TypeScript", () => {
  assertTypescriptParses(nvidiaSource, "nvidia.ts");
  assertTypescriptParses(advisorSource, "smartPhoneAdvisor.functions.ts");
  assertTypescriptParses(uiSource, "SmartPhoneAdvisor.tsx");
});

test("global advisor routes NVIDIA through protected Supabase Edge Function", () => {
  assert.match(nvidiaSource, /https:\/\/rtwyankpxtffqqrasyzw\.supabase\.co/);
  assert.match(nvidiaSource, /\/functions\/v1\//);
  assert.match(nvidiaSource, /SUPABASE_ANON_KEY/);
  assert.match(nvidiaSource, /Authorization: `Bearer \$\{anonKey\}`/);
  assert.match(nvidiaSource, /apikey: anonKey/);
  assert.doesNotMatch(nvidiaSource, /integrate\.api\.nvidia\.com/);
  assert.doesNotMatch(nvidiaSource, /NVIDIA_API_KEY/);

  assert.match(envExample, /^SUPABASE_URL=https:\/\/rtwyankpxtffqqrasyzw\.supabase\.co$/m);
  assert.match(envExample, /^SUPABASE_ANON_KEY=$/m);
  assert.match(envExample, /^SUPABASE_NVIDIA_FUNCTION=nvidia-chat$/m);
  assert.doesNotMatch(envExample, /^NVIDIA_API_KEY=/m);
  assert.doesNotMatch(envExample, /^VITE_NVIDIA_API_KEY=/m);

  assert.match(serverSource, /"SUPABASE_URL"/);
  assert.match(serverSource, /"SUPABASE_ANON_KEY"/);
  assert.match(serverSource, /"SUPABASE_NVIDIA_FUNCTION"/);
});

test("global Smart Advisor stays NVIDIA-first and does not call Gemini directly", () => {
  assert.match(advisorSource, /callNvidiaChat/);
  assert.match(advisorSource, /provider: "nvidia"/);
  assert.doesNotMatch(advisorSource, /generativelanguage\.googleapis\.com/);
  assert.doesNotMatch(advisorSource, /GEMINI_API_KEY/);
  assert.match(advisorSource, /searchedWeb: false/);
});

test("UI labels NVIDIA accurately without claiming built-in live web research", () => {
  assert.match(uiSource, /NVIDIA AI \+ live store catalogue/);
  assert.match(uiSource, /Live web verification is not connected/);
  assert.doesNotMatch(uiSource, /Live web phone research/);
  assert.doesNotMatch(uiSource, /Researching the web and checking the store/);
});
