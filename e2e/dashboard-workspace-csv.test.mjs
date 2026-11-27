import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../src/dashboard/lib/exportCsv.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { serializeCsv } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("CSV retains Arabic, multiline descriptions, commas and quoted names", () => {
  assert.equal(
    serializeCsv([
      ["اسم المنتج", "Description"],
      ['Phone, "Pro"', "line 1\nline 2"],
    ]),
    '\uFEFF"اسم المنتج","Description"\r\n"Phone, ""Pro""","line 1\nline 2"',
  );
});
test("CSV exports numeric values as numbers while neutralizing user-authored formulas", () => {
  assert.equal(
    serializeCsv([["=1+1", "  +SUM(A1)", "@command", "-formula", -5, 12.5]]),
    '\uFEFF"\'=1+1","\'  +SUM(A1)","\'@command","\'-formula","-5","12.5"',
  );
});
