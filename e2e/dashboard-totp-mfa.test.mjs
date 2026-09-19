import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const login = await readFile(
  new URL("../src/dashboard/pages/LoginPage.tsx", import.meta.url),
  "utf8",
);
const mfa = await readFile(
  new URL("../src/dashboard/components/auth/DashboardMfaStep.tsx", import.meta.url),
  "utf8",
);
const catalog = await readFile(
  new URL("../src/dashboard/data/catalog.ts", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL("../supabase/migrations/20260919054000_dashboard_totp_mfa_enforcement.sql", import.meta.url),
  "utf8",
);

test("dashboard gate requires a ready AAL2 MFA session", () => {
  assert.match(app, /getDashboardMfaStatus\(\)/);
  assert.match(app, /status\?\.ready/);
  assert.match(app, /\/dashboard\/login\?mode=mfa/);
  assert.doesNotMatch(app, /getDashboardRole\(\)[\s\S]{0,300}setState\("ready"\)/);
});

test("password login transitions into mandatory MFA", () => {
  assert.match(login, /type LoginView = "signin" \| "forgot" \| "recovery" \| "mfa"/);
  assert.match(login, /signInDashboard\(email, password, captchaToken \?\? undefined\)/);
  assert.match(login, /getDashboardMfaStatus\(\)/);
  assert.match(login, /setView\("mfa"\)/);
  assert.match(login, /DashboardMfaStep/);
  assert.match(login, /mode=mfa/);
});

test("TOTP enrollment exposes QR and secret only in transient component state", () => {
  assert.match(mfa, /beginDashboardTotpEnrollment/);
  assert.match(mfa, /Space Call authenticator QR code/);
  assert.match(mfa, /enrollment\.secret/);
  assert.match(mfa, /otpauth:\/\//);
  assert.match(mfa, /autoComplete="one-time-code"/);
  assert.doesNotMatch(mfa, /localStorage|sessionStorage/);
  assert.doesNotMatch(catalog, /localStorage[\s\S]{0,100}(secret|factorId|qrCode)/i);
});

test("TOTP verification upgrades to AAL2 and activates DB enforcement", () => {
  assert.match(catalog, /auth\.mfa\.challengeAndVerify/);
  assert.match(catalog, /currentLevel !== "aal2"/);
  assert.match(catalog, /rpc\("activate_dashboard_mfa"\)/);
  assert.match(catalog, /status\?\.ready/);
});

test("database authorization requires aal2 after staff MFA activation", () => {
  assert.match(migration, /mfa_required boolean not null default false/);
  assert.match(migration, /auth\.jwt\(\) ->> 'aal'/);
  assert.match(migration, /= 'aal2'/);
  assert.match(migration, /mfa_required = false[\s\S]+has_dashboard_aal2/);
  assert.match(migration, /aal2 authentication required/);
  assert.match(migration, /update public\.user_roles[\s\S]+mfa_required = true/);
  assert.match(migration, /grant execute on function public\.activate_dashboard_mfa\(\) to authenticated/);
});

test("MFA cancellation signs out the partial Supabase session", () => {
  assert.match(mfa, /signOutDashboard\(\)/);
  assert.match(mfa, /Sign out/);
});
