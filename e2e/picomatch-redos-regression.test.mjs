import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const patched = require("../vendor/picomatch");

test("local security backport preserves ordinary shell-glob matching", () => {
  for (const [pattern, good, bad] of [
    ["src/**/*.ts", "src/components/Button.ts", "src/a.md"],
    ["*.{js,ts}", "index.ts", "styles.css"],
    ["+(alpha|beta).js", "alpha.js", "gamma.js"],
    ["*(alpha|beta).js", "alphabeta.js", "gamma.js"],
    ["foo/[ab]ar", "foo/bar", "foo/car"],
    ["**/test-?.mjs", "e2e/test-a.mjs", "e2e/test-long.mjs"],
  ]) {
    assert.equal(patched.isMatch(good, pattern), true, "should match " + pattern + " / " + good);
    assert.equal(patched.isMatch(bad, pattern), false, "should reject " + pattern + " / " + bad);
  }
});

test("CVE-2026-112366 repeated extglob exploits are rejected at parse time", () => {
  for (const pattern of [
    "+(*)", "+(*a)", "*(*)", "*(*a)", "+(a*)", "*(a*b)",
    "prefix-+(*a)-suffix", "+(hello|*world)", "+(a(*b)c)",
    "+(*(a))", "*(+(*a))", "+(a[bc]*d)",
  ]) {
    assert.throws(() => patched.makeRe(pattern), /Unsafe repeated extglob rejected/, pattern);
  }
});

test("escaped and class-contained stars are not rejected", () => {
  assert.doesNotThrow(() => patched.makeRe(String.raw`+(a\*b)`));
  assert.doesNotThrow(() => patched.makeRe("+([*]|a)"));
  assert.doesNotThrow(() => patched.makeRe("+(foo|bar)"));
});

test("security guard is not bypassed by setting recursion safeguard options", () => {
  assert.throws(() => patched.makeRe("+(*a)", { maxExtglobRecursion: false }), /Unsafe repeated extglob rejected/);
});

test("deep nested extglobs are rejected before they can stall the parser", { timeout: 1500 }, () => {
  const input = "+(".repeat(1000) + "a" + ")".repeat(1000);
  assert.throws(() => patched.parse(input), /Nested repeated extglob exceeds safe depth/);
});

test("the dependency lockfile resolves every picomatch copy to the hardened local fork", async () => {
  const lock = await readFile(new URL("../bun.lock", import.meta.url), "utf8");
  const references = [...lock.matchAll(/"[^"]*\\/picomatch": \\["picomatch@([^"]+)"/g)]
    .map((match) => match[1]);
  assert.ok(references.length >= 3, "Expected transitive picomatch resolutions");
  assert.ok(references.every((value) => value === "file:vendor/picomatch"),
    "A registry picomatch copy bypasses the hardened fork: " + references.join(", "));
});

test("security backport provenance is explicit and fork version differs from vulnerable registry", async () => {
  const metadata = JSON.parse(await readFile(new URL("../vendor/picomatch/package.json", import.meta.url), "utf8"));
  assert.equal(metadata.name, "picomatch");
  assert.equal(metadata.version, "4.0.8-spacecall.1");
  assert.match(metadata.description, /CVE-2026-112366/);
});
