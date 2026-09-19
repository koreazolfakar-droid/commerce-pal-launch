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

test("passkey sign-in stays behind dashboard role authorization", () => {
  assert.match(catalog, /export async function signInDashboardWithPasskey/);
  assert.match(catalog, /auth\.signInWithPasskey\(\)/);
  assert.match(catalog, /const role = await getDashboardRole\(\)/);
  assert.match(
    catalog,
    /if \(!role\) \{[\s\S]*auth\.signOut\(\{ scope: "local" \}\)[\s\S]*DASHBOARD_SIGNIN_DENIED_MESSAGE/,
  );
});

test("passkey enrollment requires an already verified dashboard MFA session", () => {
  assert.match(catalog, /export async function registerDashboardPasskey/);
  assert.match(catalog, /const mfaStatus = await getDashboardMfaStatus\(\)/);
  assert.match(catalog, /if \(!mfaStatus\?\.ready\)/);
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

test("dashboard login exposes passkey sign-in only on supported secure clients", () => {
  assert.match(login, /Fingerprint/);
  assert.match(login, /isDashboardPasskeySupported/);
  assert.match(login, /signInDashboardWithPasskey\(\)/);
  assert.match(login, /passkeySupported \?/);
  assert.match(login, /الدخول بالبصمة \/ Passkey/);
  assert.match(login, /Sign in with fingerprint \/ passkey/);
});

test("passkey login still transitions through the existing MFA gate", () => {
  assert.match(
    login,
    /const submitPasskey = async \(\) => \{[\s\S]+signInDashboardWithPasskey\(\)[\s\S]+getDashboardMfaStatus\(\)[\s\S]+setView\("mfa"\)/,
  );
  assert.match(login, /window\.history\.replaceState\(\{\}, "", "\/dashboard\/login\?mode=mfa"\)/);
});

test("security center supports complete passkey lifecycle management", () => {
  assert.match(catalog, /export async function listDashboardPasskeys/);
  assert.match(catalog, /auth\.passkey\.list\(\)/);
  assert.match(catalog, /export async function renameDashboardPasskey/);
  assert.match(catalog, /auth\.passkey\.update\(\{/);
  assert.match(catalog, /export async function deleteDashboardPasskey/);
  assert.match(catalog, /auth\.passkey\.delete\(\{ passkeyId \}\)/);
  assert.match(catalog, /Complete MFA verification before managing passkeys/);
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
