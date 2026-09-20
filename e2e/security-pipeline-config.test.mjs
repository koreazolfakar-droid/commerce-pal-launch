import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflowPath = new URL("../.github/workflows/security-gate.yml", import.meta.url);

test("Security Gate runs automatically before main changes are accepted", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /pull_request:\n\s+branches:\n\s+- main/);
  assert.match(workflow, /push:\n\s+branches:\n\s+- main/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions:\n\s+contents: read/);
});

test("Security Gate covers code, secrets, dependencies and existing regression checks", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /semgrep==1\.177\.0/);
  assert.match(workflow, /gitleaks\/gitleaks-action@v3/);
  assert.match(workflow, /aquasecurity\/trivy-action@0\.36\.0/);
  assert.match(workflow, /severity: HIGH,CRITICAL/);
  assert.match(workflow, /exit-code: "1"/);
  assert.match(workflow, /node --test e2e\/dashboard-\*\.test\.mjs/);
  assert.match(workflow, /bun run test:unit/);
  assert.match(workflow, /bun run build/);
  assert.match(workflow, /bun run test:ssr/);
});

test("Security Gate has a single required aggregator job", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /security-gate:\n\s+name: Security Gate/);
  assert.match(workflow, /needs:\n\s+- quality\n\s+- secrets\n\s+- sast\n\s+- supply-chain/);
  assert.match(workflow, /Security Gate blocked this change/);
});
