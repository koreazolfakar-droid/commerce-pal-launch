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

for (const [name, source] of [
  ["dashboard-auth-throttle", throttle],
  ["dashboard-update-password", password],
  ["dashboard-passkey-stepup", passkey],
  ["dashboard-ai-assist", ai],
]) {
  test(`${name} restricts browser CORS to trusted Space Call origins`, () => {
    assert.doesNotMatch(source, /"Access-Control-Allow-Origin": "\*"/);
    assert.match(source, /https:\/\/spacecallapp\.store/);
    assert.match(source, /https:\/\/www\.spacecallapp\.store/);
    assert.match(source, /https:\/\/app\.spacecallapp\.store/);
    assert.match(source, /\.lovable\.app/);
    assert.match(source, /\.lovableproject\.com/);
    assert.match(source, /\.lovableproject-dev\.com/);
    assert.match(source, /\.gpt-eng\.com/);
    assert.match(source, /\.gptengineer\.run/);
    assert.match(source, /originAllowed\(origin\)/);
    assert.match(source, /headers: cors\(req\)/);
  });
}

for (const [name, source] of [
  ["dashboard-auth-throttle", throttle],
  ["dashboard-update-password", password],
]) {
  test(`${name} keeps request body parsing intact`, () => {
    assert.match(source, /await req\.json\(\)/);
    assert.doesNotMatch(source, /req\.json\(req/);
  });
}

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
