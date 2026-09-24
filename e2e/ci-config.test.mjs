import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("repository exposes one comprehensive validation command", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.match(pkg.scripts.typecheck, /routes:generate/);
  assert.match(pkg.scripts.typecheck, /tsc --noEmit/);
  assert.match(pkg.scripts["security:scan"], /security-gate\.mjs/);
  assert.match(pkg.scripts["security:scan"], /bun audit --audit-level=high/);
  for (const step of ["typecheck", "lint", "test:unit", "build", "test:ssr"]) {
    assert.match(pkg.scripts.check, new RegExp(step));
  }
});

test("GitHub Storefront CI is the automatic validation gate", async () => {
  const workflow = await read(".github/workflows/storefront-ci.yml");
  assert.match(workflow, /^\s+workflow_dispatch:/m);
  assert.match(workflow, /^\s*push:/m);
  assert.match(workflow, /^\s+pull_request:/m);
  assert.match(workflow, /bun install --frozen-lockfile/);
  assert.match(workflow, /node scripts\/security-gate\.mjs/);
  assert.match(workflow, /node scripts\/android-security-gate\.mjs/);
  assert.match(workflow, /bun audit --audit-level=high/);
  assert.match(workflow, /bun run typecheck/);
  assert.match(workflow, /bun run lint/);
  assert.match(workflow, /node --test e2e\/dashboard-\*\.test\.mjs/);
  assert.match(workflow, /bun run test:unit/);
  assert.match(workflow, /bun run test:ssr/);
  assert.match(workflow, /bun run build/);
});

test("native security scanner protects secrets and dangerous production primitives", async () => {
  const scanner = await read("scripts/security-gate.mjs");
  for (const marker of [
    "PRIVATE KEY",
    "AKIA",
    "github_pat_",
    "sk_live_",
    "SUPABASE_SERVICE_ROLE_KEY",
    "eval()",
    "new Function()",
    "child_process",
  ]) {
    assert.ok(scanner.includes(marker), `missing security marker: ${marker}`);
  }
});
