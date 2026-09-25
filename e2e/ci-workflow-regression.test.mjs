import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("automatic CI uses one PR gate without duplicate responsive runners", async () => {
  const [storefront, hero, bottomNav] = await Promise.all([
    read(".github/workflows/storefront-ci.yml"),
    read(".github/workflows/hero-responsive-ci.yml"),
    read(".github/workflows/bottom-nav-responsive-ci.yml"),
  ]);

  assert.match(storefront, /pull_request:[\s\S]*?branches:[\s\S]*?- main/);
  assert.match(storefront, /workflow_dispatch:/);
  assert.doesNotMatch(storefront, /\n  push:\n/);

  assert.match(storefront, /bun run test:unit/);
  assert.doesNotMatch(storefront, /node --test e2e\/dashboard-\*\.test\.mjs/);

  assert.match(storefront, /ui-polish-responsive-check\.mjs/);
  assert.match(storefront, /hero-responsive-check\.mjs/);
  assert.match(storefront, /bottom-nav-responsive-check\.mjs/);

  for (const workflow of [hero, bottomNav]) {
    assert.match(workflow, /^name:[\s\S]*?\non:\n  workflow_dispatch:/);
    assert.doesNotMatch(workflow, /\n  pull_request:\n/);
    assert.doesNotMatch(workflow, /\n  push:\n/);
  }
});
