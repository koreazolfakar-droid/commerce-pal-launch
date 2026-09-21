import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../supabase/functions/create-order/index.ts", import.meta.url),
  "utf8",
);

test("create-order rate limiter cannot be bypassed by rotating User-Agent", () => {
  assert.match(source, /sha256\(forwarded\.slice\(0, 128\)\)/);
  assert.doesNotMatch(source, /sha256\([^\n]*user-agent/i);
  assert.doesNotMatch(source, /\$\{forwarded\}\|\$\{agent\}/);
});

test("create-order uses independent IP and hashed-phone abuse buckets", () => {
  assert.match(source, /cf-connecting-ip/);
  assert.match(source, /x-real-ip/);
  assert.match(source, /x-forwarded-for/);
  assert.match(source, /RATE_LIMIT_PER_IP = 30/);
  assert.match(source, /RATE_LIMIT_PER_PHONE = 5/);
  assert.match(source, /create-order:ip:\$\{ipFingerprint\}/);
  assert.match(source, /create-order:phone:\$\{phoneFingerprint\}/);
  assert.match(source, /sha256\(customerPhone\)/);
  assert.doesNotMatch(source, /_key:\s*customerPhone/);
});

test("create-order applies the IP bucket before reading malformed bodies", () => {
  const ipLimitIndex = source.indexOf("const ipRateLimit = await enforceRateLimit");
  const bodyReadIndex = source.indexOf("const text = await req.text()");
  assert.ok(ipLimitIndex > 0, "IP rate limit should exist");
  assert.ok(bodyReadIndex > ipLimitIndex, "body parsing must happen after the IP limiter");
});
