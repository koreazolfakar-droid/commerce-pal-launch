import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/integrations/supabase/client.ts", import.meta.url),
  "utf8",
);

test("browser dashboard always has public Supabase configuration", () => {
  assert.match(source, /const DEFAULT_SUPABASE_URL = "https:\/\/[^"]+\.supabase\.co";/);
  assert.match(source, /const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_[^"]+";/);
  assert.doesNotMatch(source, /DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_secret_/);
  assert.doesNotMatch(source, /DEFAULT_SUPABASE_PUBLISHABLE_KEY = ".*service_role/i);
});
