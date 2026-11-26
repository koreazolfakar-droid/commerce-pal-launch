import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(
  readFileSync(new URL("../bun.lock", import.meta.url), "utf8").replace(/,\s*([}\]])/g, "$1"),
);

const packages = lock.packages;
const vite = packages.vite;
const rolldown = packages["vite/rolldown"];

test("Vite dev-server RCE advisory GHSA-p4f5-76q4-ffq7 stays patched", () => {
  assert.equal(manifest.devDependencies.vite, "^8.2.6");
  assert.equal(lock.workspaces[""].devDependencies.vite, manifest.devDependencies.vite);
  assert.equal(vite[0], "vite@8.2.6");
  assert.equal(vite[2].dependencies.rolldown, "~1.2.18");
  assert.match(vite[3], /^sha512-[A-Za-z0-9+/]{86}==$/);
});

test("Vite resolves patched Rolldown and its matching OXC types", () => {
  assert.equal(rolldown[0], "rolldown@1.2.18");
  assert.equal(rolldown[2].dependencies["@oxc-project/types"], "=0.156.0");
  assert.equal(packages["vite/rolldown/@oxc-project/types"][0], "@oxc-project/types@0.156.0");
  assert.match(rolldown[3], /^sha512-[A-Za-z0-9+/]{86}==$/);
});

test("all native Rolldown bindings resolve to 1.2.18 with integrity", () => {
  const bindings = Object.entries(rolldown[2].optionalDependencies).filter(([name]) =>
    name.startsWith("@rolldown/binding-"),
  );
  assert.equal(bindings.length, 15);
  for (const [name, version] of bindings) {
    assert.equal(version, "1.2.18", name);
    // The Android arm-eabi package is shared at the lockfile root.
    const key = name === "@rolldown/binding-android-arm-eabi" ? name : `vite/rolldown/${name}`;
    const entry = packages[key];
    assert.ok(entry, `Missing ${key}`);
    assert.equal(entry[0], `${name}@1.2.18`, key);
    assert.match(entry[3], /^sha512-[A-Za-z0-9+/]{86}==$/, key);
  }
});
