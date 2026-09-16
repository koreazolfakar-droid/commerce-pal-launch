import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/integrations/supabase/client.ts", import.meta.url),
  "utf8",
);

test("browser dashboard always has public Supabase configuration", () => {
  assert.match(source, /DEFAULT_SUPABASE_URL/);
  assert.match(source, /DEFAULT_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(source, /sb_publishable_/);
  assert.doesNotMatch(source, /service_role/i);
  assert.doesNotMatch(source, /sb_secret_/);
});
