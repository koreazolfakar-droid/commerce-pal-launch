import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("repository exposes one comprehensive validation command", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.scripts.typecheck, "tsc --noEmit");
  assert.match(pkg.scripts.check, /typecheck/);
  assert.match(pkg.scripts.check, /lint/);
  assert.match(pkg.scripts.check, /test:unit/);
  assert.match(pkg.scripts.check, /test:ssr/);
  assert.match(pkg.scripts.check, /build/);
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
