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
