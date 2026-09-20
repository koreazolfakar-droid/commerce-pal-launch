import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const helper = await readFile(
  new URL("../src/dashboard/security/pwnedPassword.ts", import.meta.url),
  "utf8",
);
const catalog = await readFile(
  new URL("../src/dashboard/data/catalog.ts", import.meta.url),
  "utf8",
);
const login = await readFile(
  new URL("../src/dashboard/pages/LoginPage.tsx", import.meta.url),
  "utf8",
);
const csp = await readFile(
  new URL("../src/lib/contentSecurityPolicy.ts", import.meta.url),
  "utf8",
);
const passwordEdge = await readFile(
  new URL("../supabase/functions/dashboard-update-password/index.ts", import.meta.url),
  "utf8",
);

test("browser HIBP screening keeps the privacy-preserving range API", () => {
  assert.match(helper, /crypto\.subtle\.digest\("SHA-1"/);
  assert.match(helper, /digest\.slice\(0, 5\)/);
  assert.match(helper, /digest\.slice\(5\)/);
  assert.match(helper, /https:\/\/api\.pwnedpasswords\.com\/range\//);
  assert.match(helper, /"Add-Padding": "true"/);
  assert.match(helper, /credentials: "omit"/);
  assert.match(helper, /referrerPolicy: "no-referrer"/);
  assert.match(helper, /cache: "no-store"/);
});

test("dashboard password changes require a ready second factor and the protected Edge Function", () => {
  assert.match(catalog, /mfaStatus\?\.ready/);
  assert.match(catalog, /Fresh second-factor verification is required before changing the password/);
  assert.match(catalog, /assertDashboardPasswordNotPwned\(password\)/);
  assert.match(catalog, /functions\.invoke\("dashboard-update-password"/);
  assert.doesNotMatch(catalog, /auth\.updateUser\(\{ password \}\)/);

  const readyGate = catalog.indexOf("if (!mfaStatus?.ready)");
  const clientScreening = catalog.indexOf("await assertDashboardPasswordNotPwned(password)");
  const edgeCall = catalog.indexOf('supabase.functions.invoke("dashboard-update-password"');

  assert.ok(readyGate >= 0, "second-factor readiness gate must exist");
  assert.ok(clientScreening > readyGate, "client HIBP check must happen after second-factor readiness");
  assert.ok(edgeCall > clientScreening, "server password service must run after client screening");
});

test("password Edge Function authenticates, authorizes, and rechecks HIBP server-side", () => {
  assert.match(passwordEdge, /admin\.auth\.getUser\(token\)/);
  assert.match(passwordEdge, /SENSITIVE_REAUTH_WINDOW_MS = 5 \* 60 \* 1000/);
  assert.match(passwordEdge, /hasFreshTotpAmr\(claims, now\)/);
  assert.match(passwordEdge, /claims\.aal === "aal2"/);
  assert.match(passwordEdge, /dashboard_passkey_session_assurance/);
  assert.match(passwordEdge, /\.gte\("verified_at", cutoff\)/);
  assert.match(passwordEdge, /fresh_second_factor_required/);
  assert.match(passwordEdge, /from\("user_roles"\)/);
  assert.match(passwordEdge, /row\.role === "admin"/);
  assert.match(passwordEdge, /row\.role === "editor"/);
  assert.match(passwordEdge, /row\.mfa_required === true/);
  assert.match(passwordEdge, /Boolean\(row\.mfa_enrolled_at\)/);
  assert.match(passwordEdge, /request_too_large/);
  assert.match(passwordEdge, /const MIN_PASSWORD_LENGTH = 14/);
  assert.match(passwordEdge, /allowedOrigins/);
  assert.doesNotMatch(passwordEdge, /Access-Control-Allow-Origin": "\*"/);
  assert.match(passwordEdge, /getPasswordPolicyViolation/);
  assert.match(passwordEdge, /compact\.includes\("spacecall"\)/);
  assert.match(passwordEdge, /emailLocalPart\.length >= 4/);
  assert.match(passwordEdge, /password_policy_rejected/);
  assert.match(passwordEdge, /password_change_rejected/);

  assert.match(passwordEdge, /crypto\.subtle\.digest\("SHA-1"/);
  assert.match(passwordEdge, /digest\.slice\(0, 5\)/);
  assert.match(passwordEdge, /digest\.slice\(5\)/);
  assert.match(passwordEdge, /"Add-Padding": "true"/);
  assert.match(passwordEdge, /SpaceCall-Dashboard-Password-Security\/1\.0/);
  assert.match(passwordEdge, /breach_screening_unavailable/);
  assert.match(passwordEdge, /compromised_password/);

  assert.match(passwordEdge, /auth\.admin\.updateUserById\(user\.id/);
  assert.match(passwordEdge, /from\("dashboard_security_events"\)\.insert/);
  assert.match(passwordEdge, /event_type: eventType/);
  assert.match(passwordEdge, /audit\("password_changed"/);
  assert.match(passwordEdge, /hibp_server_checked: true/);
  assert.doesNotMatch(passwordEdge, /console\.(log|debug|info)\([^\n]*password/i);

  const verifiedUser = passwordEdge.indexOf("await admin.auth.getUser(token)");
  const secondFactorGate = passwordEdge.indexOf('error: "fresh_second_factor_required"');
  const localPolicy = passwordEdge.indexOf('getPasswordPolicyViolation(password, user.email ?? "")');
  const hibp = passwordEdge.indexOf("await isPasswordCompromised(password)");
  const mutation = passwordEdge.indexOf("await admin.auth.admin.updateUserById(user.id");

  assert.ok(verifiedUser >= 0, "JWT must be verified against Supabase Auth");
  assert.ok(secondFactorGate > verifiedUser, "fresh second-factor gate must follow token verification");
  assert.ok(localPolicy > secondFactorGate, "local password policy must run after fresh second-factor verification");
  assert.ok(hibp > localPolicy, "server HIBP screening must happen after the local policy");
  assert.ok(mutation > hibp, "password mutation must happen only after all server screening");
});

test("recovery flow requires MFA before exposing the password update path", () => {
  assert.match(login, /recoveryMode \|\| mfaMode \? "mfa" : "signin"/);
  assert.match(login, /if \(recoveryMode\)[\s\S]+setView\("recovery"\)/);
  assert.match(login, /setView\("mfa"\)/);
  assert.match(login, /if \(recoveryMode\)[\s\S]+\/dashboard\/login\?mode=recovery/);
  assert.doesNotMatch(login, /screened against HIBP twice/i);
  assert.match(login, /forceFresh=\{recoveryMode\}/);
});

test("HIBP outages fail closed in both browser and server layers", () => {
  assert.match(
    helper,
    /Security check is temporarily unavailable\. Your password was not changed\./,
  );
  assert.match(passwordEdge, /return json\(req, \{ error: "breach_screening_unavailable" \}, 503\)/);
});

test("browser CSP still allows only the HIBP range endpoint used for UX screening", () => {
  assert.match(
    csp,
    /connect-src[^\n]+https:\/\/api\.pwnedpasswords\.com/,
  );
});


test("dashboard recovery UI and data layer enforce the 14-character admin minimum", () => {
  assert.match(catalog, /password\.length < 14/);
  assert.match(catalog, /Use at least 14 characters/);
  assert.match(login, /newPassword\.length < 14/);
  assert.match(login, /Use at least 14 characters/);
  assert.match(login, /استخدم 14 حرفًا على الأقل/);
});
