import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [catalog, client, login, mfa, edge, migration] = await Promise.all([
  readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/integrations/supabase/client.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/LoginPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/auth/DashboardMfaStep.tsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/dashboard-passkey-stepup/index.ts", import.meta.url), "utf8"),
  readFile(
    new URL(
      "../supabase/migrations/20260920042013_dashboard_password_then_totp_or_passkey.sql",
      import.meta.url,
    ),
    "utf8",
  ),
]);

test("login requires password before presenting either second factor", () => {
  assert.match(login, /await signInDashboard\(email, password, captchaToken \?\? undefined\)/);
  assert.match(login, /setView\("mfa"\)/);
  assert.doesNotMatch(login, /submitPasskey/);
  assert.doesNotMatch(login, /signInDashboardWithPasskey/);

  assert.match(mfa, /choiceTitle: "Choose your second step"/);
  assert.match(mfa, /authenticatorOption: "Authenticator code"/);
  assert.match(mfa, /passkeyOption: "Fingerprint \/ Passkey"/);
  assert.match(mfa, /verifyDashboardPasskeySecondFactor\(\)/);
});

test("passkey proof uses an isolated non-persistent auth client", () => {
  assert.match(client, /export function createEphemeralPasskeyClient/);
  assert.match(client, /persistSession: false/);
  assert.match(client, /autoRefreshToken: false/);
  assert.match(client, /detectSessionInUrl: false/);

  assert.match(catalog, /createEphemeralPasskeyClient\(\)/);
  assert.match(catalog, /verifier\.auth\.signInWithPasskey\(\)/);
  assert.match(catalog, /passkeyAccessToken/);
  assert.match(catalog, /verifier\.auth\.signOut\(\{ scope: "local" \}\)/);
});

test("server only begins passkey step-up after a recent password authentication", () => {
  assert.match(edge, /PASSWORD_STAGE_WINDOW_MS = 5 \* 60 \* 1000/);
  assert.match(edge, /hasRecentPasswordAmr\(claims, now\)/);
  assert.match(edge, /item\.method !== "password"/);
  assert.match(edge, /roleRow\?\.role !== "admin"/);
  assert.match(edge, /baselineLastUsedAt = latestPasskeyUse\(passkeys\)/);
  assert.match(edge, /dashboard_passkey_stepup_tickets/);
});

test("server completion binds fresh passkey proof to the original password session", () => {
  assert.match(edge, /ticket\.password_session_id !== sessionId/);
  assert.match(edge, /passkeyUser\.id !== mainUser\.id/);
  assert.match(edge, /latestUsedMs <= Math\.max\(baselineMs \|\| 0, ticketCreatedMs - 1500\)/);
  assert.match(edge, /\.is\("consumed_at", null\)/);
  assert.match(edge, /dashboard_passkey_session_assurance/);
  assert.match(edge, /session_id: sessionId/);
  assert.match(edge, /hasFreshPasskeyAmr/);
  assert.match(edge, /method === "passkey"/);
  assert.match(edge, /passkeyClaims\.sub !== mainUser\.id/);
  assert.match(edge, /fresh_passkey_token_required/);
  assert.match(edge, /PASSKEY_ASSURANCE_MS = 8 \* 60 \* 60 \* 1000/);
});

test("database authorization accepts native AAL2 or server-verified passkey assurance", () => {
  assert.match(migration, /create table if not exists public\.dashboard_passkey_session_assurance/);
  assert.match(migration, /enable row level security/);
  assert.match(
    migration,
    /revoke all on table public\.dashboard_passkey_session_assurance from public, anon, authenticated/,
  );
  assert.match(migration, /create or replace function private\.has_dashboard_passkey_stepup\(\)/);
  assert.match(
    migration,
    /private\.has_dashboard_aal2\(\)[\s\S]*or[\s\S]*private\.has_dashboard_passkey_stepup\(\)/,
  );
  assert.match(migration, /dashboard_passkey_stepup_ready/);
  assert.match(catalog, /passkeyStepUpReady/);
});
