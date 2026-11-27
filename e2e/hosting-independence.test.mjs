import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL(
    "../src/integrations/supabase/previewAuthStorage.ts",
    import.meta.url,
  ),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { brokeredPreviewStorage } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

test("embedded pages never delegate a Supabase session to the former editor", () => {
  const originalWindow = globalThis.window;
  const originalLocation = globalThis.location;
  const storage = () => {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
  };
  const tab = storage();
  const local = storage();
  const key = "sb-rtwyankpxtffqqrasyzw-auth-token";
  tab.setItem(key, "existing-tab-session");
  try {
    globalThis.window = {
      parent: {
        postMessage() {
          assert.fail("Auth tokens must never be sent to an embedder");
        },
      },
      sessionStorage: tab,
      localStorage: local,
    };
    globalThis.location = {
      hostname:
        "id-preview--00000000-0000-4000-8000-000000000001.lovableproject.com",
      ancestorOrigins: ["https://lovable.dev"],
    };
    const auth = brokeredPreviewStorage();
    assert.equal(auth, tab);
    assert.equal(auth.getItem(key), "existing-tab-session");
    auth.removeItem(key);
    assert.equal(tab.getItem(key), null);
    assert.equal(local.getItem(key), null);
  } finally {
    globalThis.window = originalWindow;
    globalThis.location = originalLocation;
  }
});
