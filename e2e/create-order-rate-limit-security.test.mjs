import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../supabase/functions/create-order/index.ts", import.meta.url),
  "utf8",
);

test("create-order rate limiter cannot be bypassed by rotating User-Agent", () => {
  assert.match(source, /const fingerprint = await sha256\(forwarded\.slice\(0, 128\)\)/);
  assert.doesNotMatch(source, /sha256\([^\n]*user-agent/i);
  assert.doesNotMatch(source, /\$\{forwarded\}\|\$\{agent\}/);
});

test("create-order rate limiter prefers edge-provided client IP headers", () => {
  assert.match(source, /cf-connecting-ip/);
  assert.match(source, /x-real-ip/);
  assert.match(source, /x-forwarded-for/);
  assert.match(source, /_key: `create-order:\$\{fingerprint\}`/);
});
