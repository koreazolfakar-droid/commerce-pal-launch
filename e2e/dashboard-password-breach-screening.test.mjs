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
const server = await readFile(
  new URL("../src/server.ts", import.meta.url),
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

test("dashboard password changes require AAL2 and the protected Edge Function", () => {
  assert.match(catalog, /mfaStatus\?\.ready/);
  assert.match(catalog, /currentLevel !== "aal2"/);
  assert.match(catalog, /assertDashboardPasswordNotPwned\(password\)/);
  assert.match(catalog, /functions\.invoke\("dashboard-update-password"/);
  assert.doesNotMatch(catalog, /auth\.updateUser\(\{ password \}\)/);

  const aal2 = catalog.indexOf('mfaStatus.currentLevel !== "aal2"');
  const clientScreening = catalog.indexOf("await assertDashboardPasswordNotPwned(password)");
  const edgeCall = catalog.indexOf('supabase.functions.invoke("dashboard-update-password"');

  assert.ok(aal2 >= 0, "AAL2 gate must exist");
  assert.ok(clientScreening > aal2, "client HIBP check must happen after AAL2 verification");
  assert.ok(edgeCall > clientScreening, "server password service must run after client screening");
});

test("password Edge Function authenticates, authorizes, and rechecks HIBP server-side", () => {
  assert.match(passwordEdge, /admin\.auth\.getUser\(token\)/);
  assert.match(passwordEdge, /claims\.aal !== "aal2"/);
  assert.match(passwordEdge, /from\("user_roles"\)/);
  assert.match(passwordEdge, /roleRow\.role !== "admin"/);
  assert.match(passwordEdge, /roleRow\.role !== "editor"/);
  assert.match(passwordEdge, /mfa_required !== true/);
  assert.match(passwordEdge, /mfa_enrolled_at/);

  assert.match(passwordEdge, /crypto\.subtle\.digest\("SHA-1"/);
  assert.match(passwordEdge, /digest\.slice\(0, 5\)/);
  assert.match(passwordEdge, /digest\.slice\(5\)/);
  assert.match(passwordEdge, /"Add-Padding": "true"/);
  assert.match(passwordEdge, /breach_screening_unavailable/);
  assert.match(passwordEdge, /compromised_password/);

  assert.match(passwordEdge, /auth\.admin\.updateUserById\(user\.id/);
  assert.doesNotMatch(passwordEdge, /console\.(log|debug|info)\([^\n]*password/i);

  const verifiedUser = passwordEdge.indexOf("await admin.auth.getUser(token)");
  const aal2 = passwordEdge.indexOf('claims.aal !== "aal2"');
  const hibp = passwordEdge.indexOf("await isPasswordCompromised(password)");
  const mutation = passwordEdge.indexOf("await admin.auth.admin.updateUserById(user.id");

  assert.ok(verifiedUser >= 0, "JWT must be verified against Supabase Auth");
  assert.ok(aal2 > verifiedUser, "AAL2 must be checked after token verification");
  assert.ok(hibp > aal2, "server HIBP screening must happen after authorization");
  assert.ok(mutation > hibp, "password mutation must happen only after server HIBP screening");
});

test("recovery flow requires MFA before exposing the password update path", () => {
  assert.match(login, /if \(recoveryMode\)[\s\S]+setView\("recovery"\)/);
  assert.match(login, /setView\("mfa"\)/);
  assert.match(login, /if \(recoveryMode\)[\s\S]+\/dashboard\/login\?mode=recovery/);
  assert.match(login, /screened against HIBP twice/);
});

test("HIBP outages fail closed in both browser and server layers", () => {
  assert.match(
    helper,
    /Security check is temporarily unavailable\. Your password was not changed\./,
  );
  assert.match(passwordEdge, /return json\(\{ error: "breach_screening_unavailable" \}, 503\)/);
});

test("browser CSP still allows only the HIBP range endpoint used for UX screening", () => {
  assert.match(
    server,
    /connect-src[^\n]+https:\/\/api\.pwnedpasswords\.com/,
  );
});
