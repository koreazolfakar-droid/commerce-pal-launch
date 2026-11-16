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
  assert.match(catalog, /const role = await getDashboardRole\(\)/);
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
  assert.match(login, /const mfaStatus = await getDashboardMfaStatus\(\)/);
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
