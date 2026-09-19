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
const aal2Migration = await readFile(
  new URL("../supabase/migrations/20260919094500_enforce_dashboard_aal2.sql", import.meta.url),
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
  assert.match(login, /signInDashboard\(email, password, captchaToken/);
  assert.match(login, /getDashboardMfaStatus\(\)/);
  assert.match(login, /setView\("mfa"\)/);
  assert.match(login, /DashboardMfaStep/);
  assert.match(login, /mode=mfa/);
  assert.match(login, /theme=\{theme\}/);
});

test("TOTP enrollment keeps setup credentials transient and hidden by default", () => {
  assert.match(mfa, /beginDashboardTotpEnrollment/);
  assert.match(mfa, /Authenticator setup QR code/);
  assert.match(mfa, /secretRevealed \? enrollment\.secret/);
  assert.match(mfa, /setup key is hidden by default/);
  assert.match(mfa, /MFA_SECRET_REVEAL_MS = 15 \* 1000/);
  assert.match(mfa, /disabled=\{!secretRevealed\}/);
  assert.match(mfa, /setSecretRevealed\(false\)/);
  assert.match(mfa, /Never share the QR code or setup key/);
  assert.match(mfa, /otpauth:\/\//);
  assert.match(mfa, /autoComplete="one-time-code"/);
  assert.doesNotMatch(mfa, /localStorage|sessionStorage/);
  assert.doesNotMatch(catalog, /localStorage[\s\S]{0,100}(secret|factorId|qrCode)/i);
});

test("MFA UI is bilingual and does not expose internal assurance labels", () => {
  assert.match(mfa, /useLanguage\(\)/);
  assert.match(mfa, /تأكيد الهوية/);
  assert.match(mfa, /Extra verification/);
  assert.doesNotMatch(mfa, /TOTP · AAL2 required/);
  assert.doesNotMatch(mfa, /Verification window:/);
});

test("TOTP verification upgrades to AAL2 and activates DB enforcement", () => {
  assert.match(catalog, /auth\.mfa\.challengeAndVerify/);
  assert.match(catalog, /currentLevel !== "aal2"/);
  assert.match(catalog, /rpc\("activate_dashboard_mfa"\)/);
  assert.match(catalog, /status\?\.ready/);
  assert.match(catalog, /Verification code could not be confirmed\./);
  assert.match(catalog, /Too many verification attempts/);
  assert.doesNotMatch(catalog, /throwIfError\(error, "Authenticator code verification failed"\)/);
});

test("database authorization requires aal2 for every dashboard staff request", () => {
  assert.match(migration, /aal2 authentication required/);
  assert.match(migration, /update public\.user_roles[\s\S]+mfa_required = true/);
  assert.match(migration, /grant execute on function public\.activate_dashboard_mfa\(\) to authenticated/);

  assert.match(aal2Migration, /alter column mfa_required set default true/);
  assert.match(aal2Migration, /check \(mfa_required = true\)/);
  assert.match(aal2Migration, /private\.has_dashboard_aal2\(\)/);
  assert.match(aal2Migration, /role in \('admin', 'editor'\)/);
  assert.match(aal2Migration, /role = 'admin'/);
  assert.doesNotMatch(
    aal2Migration,
    /mfa_required = false[\s\S]+has_dashboard_aal2/,
  );
});

test("MFA cancellation signs out the partial Supabase session", () => {
  assert.match(mfa, /signOutDashboard\(\)/);
  assert.match(mfa, /Sign out/);
});

test("MFA challenge requires a fresh sign-in and expires after five minutes", () => {
  assert.match(mfa, /MFA_CHALLENGE_WINDOW_MS = 5 \* 60 \* 1000/);
  assert.match(catalog, /authenticatedAt: user\.last_sign_in_at \?\? null/);
  assert.match(mfa, /status\.authenticatedAt/);
  assert.match(mfa, /authenticatedAt \+ MFA_CHALLENGE_WINDOW_MS/);
  assert.match(mfa, /Date\.now\(\) >= deadline/);
  assert.match(mfa, /setChallengeExpired\(true\)/);
  assert.match(mfa, /disabled=\{challengeExpired\}/);
  assert.match(mfa, /disabled=\{loading \|\| challengeExpired\}/);
});

test("expired or cancelled MFA clears transient secrets and partial session", () => {
  assert.match(
    mfa,
    /setCode\(" "\)|setCode\(""\)/,
  );
  assert.match(
    mfa,
    /setEnrollment\(null\)[\s\S]+setSecretRevealed\(false\)[\s\S]+signOutDashboard/,
  );
  assert.match(mfa, /if \(!challengeExpired\) return/);
  assert.match(mfa, /signOutDashboard\(\)[\s\S]+onCancel\(\)/);
});
