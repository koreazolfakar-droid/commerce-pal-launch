import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const throttle = await readFile(
  new URL("../supabase/functions/dashboard-auth-throttle/index.ts", import.meta.url),
  "utf8",
);
const password = await readFile(
  new URL("../supabase/functions/dashboard-update-password/index.ts", import.meta.url),
  "utf8",
);

for (const [name, source] of [
  ["dashboard-auth-throttle", throttle],
  ["dashboard-update-password", password],
]) {
  test(`${name} restricts browser CORS to trusted origins`, () => {
    assert.doesNotMatch(source, /"Access-Control-Allow-Origin": "\*"/);
    assert.match(source, /https:\/\/spacecallapp\.store/);
    assert.match(source, /https:\/\/www\.spacecallapp\.store/);
    assert.match(source, /\.lovable\.app/);
    assert.match(source, /\.lovableproject\.com/);
    assert.match(source, /originAllowed\(origin\)/);
    assert.match(source, /headers: cors\(req\)/);
  });

  test(`${name} keeps request body parsing intact`, () => {
    assert.match(source, /await req\.json\(\)/);
    assert.doesNotMatch(source, /req\.json\(req/);
  });
}
