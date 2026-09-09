import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/openaiResponse.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { responseOutputText } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("extracts REST text after tool calls and across multiple text blocks", () => {
  assert.equal(
    responseOutputText({
      output: [
        { type: "web_search_call", status: "completed" },
        {
          type: "message",
          content: [
            { type: "output_text", text: '{"summary":' },
            { type: "output_text", text: '"Available"}' },
          ],
        },
      ],
    }),
    '{"summary":"Available"}',
  );
});
test("ignores refusal, tool and malformed responses, accepts SDK text", () => {
  for (const input of [
    null,
    {},
    { output: [null, { type: "message", content: [{ type: "refusal", refusal: "No" }] }] },
  ]) {
    assert.equal(responseOutputText(input), "");
  }
  assert.equal(responseOutputText({ output_text: " Ready " }), "Ready");
});
