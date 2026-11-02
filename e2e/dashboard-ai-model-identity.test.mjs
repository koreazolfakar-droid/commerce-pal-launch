import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const path = new URL("../supabase/functions/dashboard-ai-assist/modelIdentity.ts", import.meta.url);
const raw = await readFile(path, "utf8");
const { outputText } = ts.transpileModule(raw, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const { modelIdentifiers, modelMismatch } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);

test("requested Samsung A57 cannot be silently replaced by A55", () => {
  assert.deepEqual(modelIdentifiers("Samsung A57"), ["a57"]);
  assert.equal(modelMismatch("Samsung A57", "Samsung Galaxy A55 5G"), true);
  assert.equal(modelMismatch("Samsung A57", "Samsung Galaxy A57 5G"), false);
});
test("identity checks support joined/spaced model names, and variants", () => {
  assert.equal(modelMismatch("HONOR Play20C", "HONOR Play 20C"), false);
  assert.equal(modelMismatch("HONOR Play20C", "HONOR Play 20"), true);
  assert.equal(modelMismatch("Google Pixel 9 Pro", "Google Pixel 8 Pro"), true);
  assert.equal(modelMismatch("Samsung A57", "Samsung A57"), false);
  assert.equal(modelMismatch("Galaxy", "Galaxy A55"), false);
});
test("edge handler rejects wrong-model results and ungrounded claims", async () => {
  const edge = await readFile(new URL("../supabase/functions/dashboard-ai-assist/index.ts", import.meta.url), "utf8");
  assert.match(edge, /modelMismatch\(query, normalized\.entityMatch\.canonicalName\)/);
  assert.match(edge, /normalized\.suggestions = \[\]/);
  assert.match(edge, /normalized\.suggestions = normalized\.suggestions\.filter/);
  assert.match(edge, /This does not mean the requested model is nonexistent/);
  assert.match(edge, /verified: false/);
  assert.match(edge, /modelIdentifiers\(query\)/);
});
