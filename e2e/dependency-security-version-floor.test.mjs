import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [manifest, lock] = await Promise.all([
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../bun.lock", import.meta.url), "utf8"),
]);

function lockedVersion(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = lock.match(
    new RegExp(`^\\s*"${escaped}":\\s*\\["${escaped}@(\\d+\\.\\d+\\.\\d+)"`, "m"),
  );
  assert.ok(match, `${name} must have an explicit locked version`);
  return match[1].split(".").map(Number);
}

function isAtLeast(current, required) {
  for (let i = 0; i < 3; i++) {
    if (current[i] !== required[i]) return current[i] > required[i];
  }
  return true;
}

test("audit-vulnerable Seroval cannot regress below patched 1.6.8", () => {
  assert.ok(isAtLeast(lockedVersion("seroval"), [1, 6, 8]));
});

test("Zod root dependency and lock are on patched >=4.6.6", () => {
  assert.match(manifest.dependencies.zod, /^\^?4\./);
  assert.ok(isAtLeast(lockedVersion("zod"), [4, 6, 6]));
});
