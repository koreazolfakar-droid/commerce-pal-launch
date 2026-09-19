import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const client = await readFile(
  new URL("../src/integrations/supabase/client.ts", import.meta.url),
  "utf8",
);
const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

test("dashboard Supabase client opts in to passkey support", () => {
  assert.match(client, /experimental:\s*\{\s*passkey:\s*true/);
});

test("installed supabase-js version supports passkeys", () => {
  const version = String(pkg.dependencies?.["@supabase/supabase-js"] ?? "");
  assert.match(version, /2\.116\.0/);
});
