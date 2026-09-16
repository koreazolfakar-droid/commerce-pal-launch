import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");

const supabaseHost = "rtwyankpxtffqqrasyzw.supabase.co";

test("dashboard CSP allows Supabase auth and CMS media", () => {
  assert.match(source, new RegExp(`connect-src[^\n]+https://${supabaseHost}`));
  assert.match(source, new RegExp(`connect-src[^\n]+wss://${supabaseHost}`));
  assert.match(source, new RegExp(`img-src[^\n]+https://${supabaseHost}`));
});
