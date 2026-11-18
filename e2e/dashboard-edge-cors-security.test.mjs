import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

const [throttle, password, passkey, ai, config] = await Promise.all([
  read("supabase/functions/dashboard-auth-throttle/index.ts"),
  read("supabase/functions/dashboard-update-password/index.ts"),
  read("supabase/functions/dashboard-passkey-stepup/index.ts"),
  read("supabase/functions/dashboard-ai-assist/index.ts"),
  read("supabase/config.toml"),
]);

test("dashboard auth throttle parses bounded streamed JSON bodies", () => {
  assert.match(throttle, /JSON\.parse\(await readBoundedText\(req, 1024\)\)/);
  assert.match(throttle, /RequestBodyTooLargeError/);
  assert.doesNotMatch(throttle, /await req\.json\(\)/);
});

test("dashboard password update keeps JSON request parsing intact", () => {
  assert.match(password, /await req\.json\(\)/);
  assert.doesNotMatch(password, /req\.json\(req/);
});

test("edge JWT modes are explicit so deploy defaults cannot break browser flows", () => {
  assert.match(config, /\[functions\.public-cms\][\s\S]*?verify_jwt\s*=\s*false/);
  assert.match(config, /\[functions\.create-order\][\s\S]*?verify_jwt\s*=\s*true/);
  assert.match(config, /\[functions\.customer-orders\][\s\S]*?verify_jwt\s*=\s*true/);
  assert.match(config, /\[functions\.dashboard-auth-throttle\][\s\S]*?verify_jwt\s*=\s*false/);
  assert.match(config, /\[functions\.dashboard-passkey-stepup\][\s\S]*?verify_jwt\s*=\s*true/);
  assert.match(config, /\[functions\.dashboard-update-password\][\s\S]*?verify_jwt\s*=\s*true/);
  assert.match(config, /\[functions\.dashboard-ai-assist\][\s\S]*?verify_jwt\s*=\s*true/);
  assert.match(config, /\[functions\.ci-debug-log\][\s\S]*?verify_jwt\s*=\s*true/);
  assert.match(config, /\[functions\.space-call-cms-admin\][\s\S]*?verify_jwt\s*=\s*true/);
});
