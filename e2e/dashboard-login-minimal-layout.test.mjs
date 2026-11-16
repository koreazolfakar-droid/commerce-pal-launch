import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const login = await readFile(
  new URL("../src/dashboard/pages/LoginPage.tsx", import.meta.url),
  "utf8",
);

test("dashboard login is a centered, compact form without welcome or marketing copy", () => {
  assert.match(login, /max-w-\[460px\]/);
  assert.match(login, /<header className="mb-6 flex/);
  assert.match(login, /return copy\.signIn;/);
  assert.match(login, /view !== "signin"/);
  assert.doesNotMatch(login, /WorkspacePreview|login-showcase|Welcome back|مرحبًا بعودتك/);
  assert.doesNotMatch(login, /heroTitle|heroBody|authorizedOnly|signInDescription/);
});

test("both themes retain readable input fields and the blue Space Call accent", () => {
  assert.match(login, /data-login-theme="light"/);
  assert.match(login, /\.login-input:focus/);
  assert.match(login, /bg-\[#2563eb\]/);
  assert.match(login, /login-label mb-2 block text-sm font-medium/);
});

test("visual simplification preserves staff authentication and recovery routes", () => {
  assert.match(login, /await signInDashboard\(email, password, captchaToken \?\? undefined\)/);
  assert.match(login, /getDashboardMfaStatus\(\)/);
  assert.match(login, /<DashboardMfaStep/);
  assert.match(login, /<TurnstileChallenge/);
  assert.match(login, /requestDashboardPasswordReset/);
  assert.match(login, /updateDashboardPassword/);
  assert.match(login, /data-testid="login-privacy-shield"/);
  assert.doesNotMatch(login, /submitPasskey|signInDashboardWithPasskey/);
});
