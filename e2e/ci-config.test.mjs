import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("repository exposes one comprehensive validation command", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.match(pkg.scripts.typecheck, /routes:generate/);
  assert.match(pkg.scripts.typecheck, /tsc --noEmit/);
  for (const step of ["typecheck", "lint", "test:unit", "build", "test:ssr"]) {
    assert.match(pkg.scripts.check, new RegExp(step));
  }
});

test("GitHub Storefront CI is manual-only", async () => {
  const workflow = await read(".github/workflows/storefront-ci.yml");
  assert.match(workflow, /workflow_dispatch/);
  assert.doesNotMatch(workflow, /\npush:|\npull_request:/);
  assert.match(workflow, /bun install --frozen-lockfile/);
  assert.match(workflow, /bun run typecheck/);
  assert.match(workflow, /bun run lint/);
  assert.match(workflow, /bun run test:unit/);
  assert.match(workflow, /bun run test:ssr/);
  assert.match(workflow, /bun run build/);
});

test("CircleCI scans every pipeline and keeps full storefront validation for important branches", async () => {
  const circle = await read(".circleci/config.yml");

  assert.match(circle, /security-semgrep:/);
  assert.match(circle, /security-gitleaks:/);
  assert.match(circle, /security-trivy:/);
  assert.match(circle, /semgrep==1\.177\.0/);
  assert.match(circle, /gitleaks_8\.30\.1_linux_x64/);
  assert.match(circle, /trivy_0\.74\.0_Linux-64bit/);
  assert.match(circle, /--severity HIGH,CRITICAL/);
  assert.match(circle, /- security-semgrep/);
  assert.match(circle, /- security-gitleaks/);
  assert.match(circle, /- security-trivy/);

  assert.match(circle, /\/\^important\\\/\.\*\//);
  assert.match(circle, /bun install --frozen-lockfile/);
  assert.match(circle, /bun run typecheck/);
  assert.match(circle, /bun run lint/);
  assert.match(circle, /bun run test:unit/);
  assert.match(circle, /bun run build/);
  assert.match(circle, /bun run test:ssr/);
});
