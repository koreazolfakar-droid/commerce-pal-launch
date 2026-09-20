import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const securityPage = await readFile(
  new URL("../src/dashboard/pages/SecurityPage.tsx", import.meta.url),
  "utf8",
);

test("passkey add/remove require a fresh authenticator step-up", () => {
  assert.match(securityPage, /getDashboardMfaStatus/);
  assert.match(securityPage, /verifyDashboardTotp/);
  assert.match(
    securityPage,
    /await verifyDashboardTotp\(status\.verifiedFactorId, normalizedCode\);[\s\S]*registerDashboardPasskey\(\)/,
  );
  assert.match(
    securityPage,
    /await verifyDashboardTotp\(status\.verifiedFactorId, normalizedCode\);[\s\S]*deleteDashboardPasskey\(target\.id\)/,
  );
  assert.match(securityPage, /operation only and is not reused/);
  assert.match(securityPage, /autoComplete="one-time-code"/);
});

test("passkey buttons open step-up instead of mutating credentials directly", () => {
  assert.match(securityPage, /openPasskeyStepUp\(\{ type: "register" \}\)/);
  assert.match(securityPage, /openPasskeyStepUp\(\{ type: "delete", passkey \}\)/);

  const removeHandler = securityPage.match(
    /const removePasskey = \(passkey: DashboardPasskey\) => \{[\s\S]*?\n  \};/,
  )?.[0] ?? "";
  assert.ok(removeHandler);
  assert.doesNotMatch(removeHandler, /deleteDashboardPasskey/);
});
