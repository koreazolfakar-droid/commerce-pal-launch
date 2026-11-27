import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [login, mfa, catalog] = await Promise.all([
  readFile(new URL("../src/dashboard/pages/LoginPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/auth/DashboardMfaStep.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
]);

test("password authentication still enforces the fail-closed pre-auth throttle", () => {
  assert.match(catalog, /const throttle = await dashboardLoginThrottle\(email, "attempt"\)/);
  assert.match(catalog, /if \(!throttle.allowed\)/);
  assert.match(catalog, /supabase\.auth\.signInWithPassword/);
  assert.match(catalog, /const mfaStatus = await getDashboardMfaStatus\(\)/);
  assert.match(catalog, /clearDashboardAuthCaches\(\);\s*\/\/ One validated authorization/);
  assert.match(catalog, /return mfaStatus;/);
  assert.match(catalog, /await supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.doesNotMatch(catalog, /export async function signInDashboardWithPasskey/);
});

test("successful throttle cleanup no longer blocks the MFA handoff", () => {
  assert.match(catalog, /void dashboardLoginThrottle\(email, "success"\)\.catch\(\(\) => undefined\)/);
  assert.doesNotMatch(catalog, /await dashboardLoginThrottle\(email, "success"\)/);
});

test("sign-in prevents duplicate requests before React state updates", () => {
  assert.match(login, /const signInPendingRef = useRef\(false\)/);
  assert.match(login, /if \(signInPendingRef.current\) return/);
  assert.match(login, /signInPendingRef.current = true/);
  assert.match(login, /signInPendingRef.current = false/);
  assert.match(login, /await signInDashboard\(email, password, captchaToken \?\? undefined\)/);
});

test("MFA handoff reuses freshly verified status once, but direct links still revalidate", () => {
  assert.match(login, /const mfaStatus = await signInDashboard\(email, password, captchaToken \?\? undefined\)/);
  assert.doesNotMatch(login, /const mfaStatus = await getDashboardMfaStatus\(\)/);
  assert.match(login, /setMfaInitialStatus\(mfaStatus\);\s*setView\("mfa"\)/);
  assert.match(login, /initialStatus=\{mfaInitialStatus\}/);
  assert.match(mfa, /initialStatusRef = useRef\(initialStatus\)/);
  assert.match(mfa, /initialStatusRef\.current \?\? \(await getDashboardMfaStatus\(\)\)/);
  assert.match(mfa, /initialStatusRef\.current = null/);
  assert.match(mfa, /if \(!status\) \{/);
  assert.match(mfa, /await ensureDashboardMfaActivated\(\)/);
});

test("mobile browser focus does not trigger an obstructive security overlay", () => {
  assert.doesNotMatch(login, /privacyShielded|setPrivacyShielded|login-privacy-shield/);
  assert.doesNotMatch(login, /window\.addEventListener\("blur"/);
  assert.match(login, /<TurnstileChallenge/);
  assert.match(login, /autoComplete="username"/);
});

test("MFA checks run concurrently only after a validated session, then enforce all gates", () => {
  const start = catalog.indexOf("export async function getDashboardMfaStatus()");
  const end = catalog.indexOf("export async function beginDashboardTotpEnrollment()", start);
  const source = catalog.slice(start, end);
  assert.match(source, /const user = await getValidatedDashboardUser\(\)/);
  assert.match(source, /if \(!user\) return null/);
  assert.match(source, /Promise\.all\(\[/);
  assert.match(source, /\.from\("user_roles"\)/);
  assert.match(source, /supabase\.auth\.mfa\.getAuthenticatorAssuranceLevel\(\)/);
  assert.match(source, /supabase\.auth\.mfa\.listFactors\(\)/);
  assert.match(source, /getDashboardPasskeyStepUpReady\(\)/);
  assert.match(source, /if \(roleError \|\| !roleRow\) return null/);
  assert.match(source, /roleRow\.role !== "admin" && roleRow\.role !== "editor"/);
  assert.match(source, /throwIfError\(aalResult\.error/);
  assert.match(source, /throwIfError\(factorsResult\.error/);
  assert.match(source, /roleRow\.mfa_required === true/);
  assert.match(source, /currentLevel === "aal2"/);
});

test("unauthenticated login visits avoid unnecessary MFA network calls", () => {
  assert.match(login, /void supabase\.auth\.getSession\(\)/);
  assert.match(login, /if \(cancelled \|\| !session\) return null/);
  assert.match(login, /return getDashboardMfaStatus\(\)/);
  assert.match(login, /const mfaStatus = await signInDashboard\(/);
  assert.doesNotMatch(login, /await signInDashboard\([^\n]+\);[\s\S]*const mfaStatus = await getDashboardMfaStatus/);
});
