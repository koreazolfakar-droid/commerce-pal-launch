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
const supabaseConfig = await readFile(
  new URL("../supabase/config.toml", import.meta.url),
  "utf8",
);

test("dashboard Supabase client opts in to passkey support", () => {
  assert.match(client, /experimental:\s*\{\s*passkey:\s*true/);
});

test("installed supabase-js version supports passkeys", () => {
  const version = String(pkg.dependencies?.["@supabase/supabase-js"] ?? "");
  assert.match(version, /2\.116\.0/);
});


test("WebAuthn relying party is pinned to the production Space Call domain", () => {
  assert.match(supabaseConfig, /\[auth\.passkey\][\s\S]*enabled\s*=\s*true/);
  assert.match(supabaseConfig, /rp_display_name\s*=\s*"Space Call Dashboard"/);
  assert.match(supabaseConfig, /rp_id\s*=\s*"spacecallapp\.store"/);
  assert.match(
    supabaseConfig,
    /rp_origins\s*=\s*\["https:\/\/spacecallapp\.store",\s*"https:\/\/www\.spacecallapp\.store"\]/,
  );
  assert.doesNotMatch(supabaseConfig, /rp_id\s*=\s*"https?:\/\//);
});
