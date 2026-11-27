import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflowPath = new URL("../.github/workflows/security-gate.yml", import.meta.url);

test("Deep GitHub security scan runs on every main pull request and push", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /\n  pull_request:\n    branches:\n      - main\n/);
  assert.match(workflow, /\n  push:\n    branches:\n      - main\n/);
  assert.doesNotMatch(workflow, /\n  pull_request_target:/);
  assert.doesNotMatch(workflow, /\n\s+paths(?:-ignore)?:/);
  assert.match(workflow, /cancel-in-progress: true/);
  assert.match(workflow, /permissions:\n\s+contents: read/);
});

test("Deep Security Scan covers code, secrets, dependencies and regression checks", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /semgrep==1\.177\.0/);
  assert.match(workflow, /--config p\/owasp-top-ten/);
  assert.match(workflow, /--config p\/typescript/);
  assert.doesNotMatch(workflow, /--config auto/);
  assert.match(workflow, /gitleaks\/gitleaks-action@v3/);
  assert.match(workflow, /aquasecurity\/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25/);
  assert.match(workflow, /severity: HIGH,CRITICAL/);
  assert.match(workflow, /exit-code: "1"/);
  assert.match(workflow, /node --test e2e\/dashboard-\*\.test\.mjs/);
  assert.match(workflow, /bun run test:unit/);
  assert.match(workflow, /bun run build/);
  assert.match(workflow, /bun run test:ssr/);
  assert.match(workflow, /node scripts\/security-gate\.mjs/);
  assert.match(workflow, /node scripts\/android-security-gate\.mjs/);
  assert.match(workflow, /bun audit --audit-level=high/);
  assert.match(workflow, /--config p\/javascript/);
  assert.match(workflow, /--config p\/nodejs/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});

test("Deep Security Scan has one aggregator job", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /deep-security-scan:\n\s+name: Deep Security Scan/);
  assert.match(workflow, /needs:\n\s+- quality\n\s+- application-security\n\s+- secrets\n\s+- sast\n\s+- supply-chain/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /APPLICATION_SECURITY: \$\{\{ needs\.application-security\.result \}\}/);
  for (const result of ["QUALITY", "APPLICATION_SECURITY", "SECRETS", "SAST", "SUPPLY_CHAIN"]) {
    assert.ok(workflow.includes(`"${result}" != "success"`), `${result} must fail closed`);
  }
  assert.match(workflow, /exit 1/);
  assert.match(workflow, /Deep Security Scan blocked this run/);
});
