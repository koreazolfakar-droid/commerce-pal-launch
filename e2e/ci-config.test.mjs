import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("repository exposes one comprehensive validation command", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.match(pkg.scripts.typecheck, /routes:generate/);
  assert.match(pkg.scripts.typecheck, /tsc --noEmit/);
  assert.match(pkg.scripts.check, /typecheck/);
  assert.match(pkg.scripts.check, /lint/);
  assert.match(pkg.scripts.check, /test:unit/);
  assert.match(pkg.scripts.check, /test:ssr/);
  assert.match(pkg.scripts.check, /build/);
});

test("lint checks do not mutate source files in CI", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.scripts.lint, "eslint .");
  assert.doesNotMatch(pkg.scripts.lint, /--fix/);
  assert.match(pkg.scripts["lint:fix"], /eslint \. --fix/);
});

test("storefront CI protects both pull requests and main pushes", async () => {
  const workflow = await read(".github/workflows/storefront-ci.yml");
  assert.match(workflow, /push:\s*[\s\S]*branches:\s*[\s\S]*- main/);
  assert.match(workflow, /pull_request:\s*[\s\S]*branches:\s*[\s\S]*- main/);
  assert.match(workflow, /bun install --frozen-lockfile/);
  assert.match(workflow, /bun run typecheck/);
  assert.match(workflow, /bun run lint/);
  assert.match(workflow, /bun run test:unit/);
  assert.match(workflow, /bun run test:ssr/);
  assert.match(workflow, /bun run build/);
});

test("Playwright E2E is a required CI gate on pull requests and main", async () => {
  const [workflow, config] = await Promise.all([
    read(".github/workflows/storefront-e2e-ci.yml"),
    read("playwright.config.ts"),
  ]);

  assert.match(workflow, /push:\s*[\s\S]*branches:\s*[\s\S]*- main/);
  assert.match(workflow, /pull_request:\s*[\s\S]*branches:\s*[\s\S]*- main/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  assert.match(workflow, /bun run test:e2e/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
  assert.match(config, /command:\s*"bun run dev:e2e/);
  assert.doesNotMatch(config, /pnpm run dev:e2e/);
});

test("specialized responsive CI cannot silently ignore regressions", async () => {
  const [hero, bottomNav] = await Promise.all([
    read(".github/workflows/hero-responsive-ci.yml"),
    read(".github/workflows/bottom-nav-responsive-ci.yml"),
  ]);

  assert.match(hero, /push:\s*[\s\S]*- main/);
  assert.match(hero, /bun run dev:e2e/);
  assert.doesNotMatch(hero, /npm install --global pnpm/);
  assert.doesNotMatch(hero, /continue-on-error:\s*true/);
  assert.doesNotMatch(bottomNav, /continue-on-error:\s*true/);
});
