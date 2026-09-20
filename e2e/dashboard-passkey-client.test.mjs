import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const client = await readFile(
  new URL("../src/integrations/supabase/client.ts", import.meta.url),
  "utf8",
);
const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const supabaseConfig = await readFile(
  new URL("../supabase/config.toml", import.meta.url),
  "utf8",
);

test("dashboard Supabase client opts in to passkey support", () => {
  assert.match(client, /experimental:\s*\{\s*passkey:\s*true/);
});

test("installed supabase-js version supports passkeys", () => {
  const version = String(pkg.dependencies?.["@supabase/supabase-js"] ?? "");
  assert.match(version, /2\.116\.0/);
});


test("WebAuthn relying party is pinned to the production Space Call domain", () => {
  assert.match(supabaseConfig, /\[auth\.passkey\][\s\S]*enabled\s*=\s*true/);
  assert.match(supabaseConfig, /rp_display_name\s*=\s*"Space Call Dashboard"/);
  assert.match(supabaseConfig, /rp_id\s*=\s*"spacecallapp\.store"/);
  assert.match(
    supabaseConfig,
    /rp_origins\s*=\s*\["https:\/\/spacecallapp\.store",\s*"https:\/\/www\.spacecallapp\.store"\]/,
  );
  assert.doesNotMatch(supabaseConfig, /rp_id\s*=\s*"https?:\/\//);
});


const catalog = await readFile(
  new URL("../src/dashboard/data/catalog.ts", import.meta.url),
  "utf8",
);

test("dashboard passkey is only used as a second factor after password", () => {
  assert.doesNotMatch(catalog, /export async function signInDashboardWithPasskey/);
  assert.match(catalog, /export async function verifyDashboardPasskeySecondFactor/);
  assert.match(catalog, /createEphemeralPasskeyClient\(\)/);
  assert.match(catalog, /"dashboard-passkey-stepup"/);
  assert.match(catalog, /body: \{ action: "begin" \}/);
  assert.match(catalog, /action: "complete"/);
  assert.match(catalog, /verifier\.auth\.signInWithPasskey\(\)/);
  assert.match(catalog, /verifier\.auth\.signOut\(\{ scope: "local" \}\)/);
});

test("passkey enrollment stays behind native AAL2 authenticator verification", () => {
  assert.match(catalog, /export async function registerDashboardPasskey/);
  assert.match(catalog, /const mfaStatus = await getDashboardMfaStatus\(\)/);
  assert.match(catalog, /mfaStatus\.currentLevel !== "aal2"/);
  assert.match(catalog, /!mfaStatus\.verifiedFactorId/);
  assert.match(catalog, /Fresh authenticator verification is required before adding a passkey/);
  assert.match(catalog, /auth\.registerPasskey\(\)/);
});

test("passkey flows require WebAuthn in a secure browser context and sanitize failures", () => {
  assert.match(catalog, /window\.isSecureContext === true/);
  assert.match(catalog, /"PublicKeyCredential" in window/);
  assert.match(catalog, /webauthn_challenge_expired/);
  assert.match(catalog, /webauthn_verification_failed/);
  assert.match(catalog, /Passkey request was cancelled or timed out\./);
  assert.doesNotMatch(catalog, /service_role|SUPABASE_SERVICE_ROLE|sb_secret_/);
});

const securityPage = await readFile(
  new URL("../src/dashboard/pages/SecurityPage.tsx", import.meta.url),
  "utf8",
);
const mfaStep = await readFile(
  new URL("../src/dashboard/components/auth/DashboardMfaStep.tsx", import.meta.url),
  "utf8",
);

test("Security Center exposes guarded passkey enrollment", () => {
  assert.match(securityPage, /registerDashboardPasskey/);
  assert.match(securityPage, /isDashboardPasskeySupported/);
  assert.match(securityPage, /Passkeys & biometrics/);
  assert.match(securityPage, /disabled=\{passkeyAction !== null \|\| Boolean\(passkeyError\) \|\| !passkeySupported\}/);
  assert.match(securityPage, /Your biometric data never leaves your device\./);
  assert.match(securityPage, /listDashboardPasskeys/);
  assert.match(securityPage, /renameDashboardPasskey/);
  assert.match(securityPage, /deleteDashboardPasskey/);
});


const login = await readFile(
  new URL("../src/dashboard/pages/LoginPage.tsx", import.meta.url),
  "utf8",
);
const passkeyMigration = await readFile(
  new URL("../supabase/migrations/20260919234000_dashboard_passkey_security_events.sql", import.meta.url),
  "utf8",
);

test("Supabase config targets the live Space Call project before config push", () => {
  assert.match(supabaseConfig, /project_id\s*=\s*"rtwyankpxtffqqrasyzw"/);
  assert.doesNotMatch(supabaseConfig, /bzkbjkduealajwrkefif/);
});

test("password is always completed before the second-factor choice", () => {
  assert.match(login, /await signInDashboard\(email, password, captchaToken \?\? undefined\)/);
  assert.match(login, /setView\("mfa"\)/);
  assert.doesNotMatch(login, /submitPasskey/);
  assert.doesNotMatch(login, /signInDashboardWithPasskey/);

  assert.match(mfaStep, /type MfaMode = "loading" \| "choice" \| "enroll" \| "challenge"/);
  assert.match(mfaStep, /Authenticator code/);
  assert.match(mfaStep, /Fingerprint \/ Passkey/);
  assert.match(mfaStep, /verifyDashboardPasskeySecondFactor\(\)/);
  assert.match(mfaStep, /setMode\(passkeySupported \? "choice" : "challenge"\)/);
});

test("security center supports complete passkey lifecycle management", () => {
  assert.match(catalog, /export async function listDashboardPasskeys/);
  assert.match(catalog, /auth\.passkey\.list\(\)/);
  assert.match(catalog, /export async function renameDashboardPasskey/);
  assert.match(catalog, /auth\.passkey\.update\(\{/);
  assert.match(catalog, /export async function deleteDashboardPasskey/);
  assert.match(catalog, /auth\.passkey\.delete\(\{ passkeyId \}\)/);
  assert.match(catalog, /Fresh authenticator verification is required before changing passkeys/);
  assert.match(securityPage, /maxLength=\{120\}/);
});

test("passkey lifecycle events are constrained and audited at AAL2", () => {
  assert.match(passkeyMigration, /passkey_registered/);
  assert.match(passkeyMigration, /passkey_renamed/);
  assert.match(passkeyMigration, /passkey_deleted/);
  assert.match(passkeyMigration, /private\.is_dashboard_staff\(\)/);
  assert.match(passkeyMigration, /security definer/);
  assert.match(passkeyMigration, /revoke all on function private\.log_dashboard_security_event_internal/);

  assert.match(catalog, /logDashboardSecurityEvent\("passkey_registered"/);
  assert.match(catalog, /logDashboardSecurityEvent\("passkey_renamed"/);
  assert.match(catalog, /logDashboardSecurityEvent\("passkey_deleted"/);
});
