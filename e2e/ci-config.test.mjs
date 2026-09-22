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

test("GitHub Storefront CI validates manual runs and pull requests", async () => {
  const workflow = await read(".github/workflows/storefront-ci.yml");
  assert.match(workflow, /^\s+workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s*push:/m);
  assert.match(workflow, /^\s+pull_request:/m);
  assert.match(workflow, /bun install --frozen-lockfile/);
  assert.match(workflow, /bun run typecheck/);
  assert.match(workflow, /bun run lint/);
  assert.match(workflow, /bun run test:unit/);
  assert.match(workflow, /bun run test:ssr/);
  assert.match(workflow, /bun run build/);
});

test("CircleCI runs separate source and dependency security gates on every pipeline", async () => {
  const circle = await read(".circleci/config.yml");

  assert.match(circle, /security-source:/);
  assert.match(circle, /security-dependencies:/);
  assert.match(circle, /node scripts\/security-gate\.mjs/);
  assert.match(circle, /bun audit --audit-level=high/);
  assert.match(circle, /- security-source/);
  assert.match(circle, /- security-dependencies/);

  assert.match(circle, /\/\^important\\\/\.\*\//);
  assert.match(circle, /\/\^ui\\\/\.\*\//);
  assert.match(circle, /bun install --frozen-lockfile/);
  assert.match(circle, /bun run typecheck/);
  assert.match(circle, /bun run lint/);
  assert.match(circle, /bun run test:unit/);
  assert.match(circle, /bun run build/);
  assert.match(circle, /bun run test:ssr/);
  assert.match(circle, /ui-browser:/);
  assert.match(circle, /playwright install --with-deps << parameters\.engine >>/);
  assert.match(circle, /node e2e\/ui-polish-responsive-check\.mjs/);
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
