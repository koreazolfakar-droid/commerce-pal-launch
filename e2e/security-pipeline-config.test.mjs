import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflowPath = new URL("../.github/workflows/security-gate.yml", import.meta.url);

test("Deep GitHub security scan stays manual while CircleCI is the automatic gate", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\npull_request:/);
  assert.doesNotMatch(workflow, /\npush:/);
  assert.match(workflow, /permissions:\n\s+contents: read/);
});

test("Deep Security Scan covers code, secrets, dependencies and regression checks", async () => {
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

test("Deep Security Scan has one aggregator job", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /deep-security-scan:\n\s+name: Deep Security Scan/);
  assert.match(workflow, /needs:\n\s+- quality\n\s+- secrets\n\s+- sast\n\s+- supply-chain/);
  assert.match(workflow, /Deep Security Scan blocked this run/);
});
