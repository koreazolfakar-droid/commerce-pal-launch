import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const login = await readFile(
  new URL("../src/dashboard/pages/LoginPage.tsx", import.meta.url),
  "utf8",
);
const turnstile = await readFile(
  new URL("../src/dashboard/components/auth/TurnstileChallenge.tsx", import.meta.url),
  "utf8",
);
const catalog = await readFile(
  new URL("../src/dashboard/data/catalog.ts", import.meta.url),
  "utf8",
);
const securityPage = await readFile(
  new URL("../src/dashboard/pages/SecurityPage.tsx", import.meta.url),
  "utf8",
);
const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const nav = await readFile(new URL("../src/dashboard/config/navigation.ts", import.meta.url), "utf8");
const server = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");
const csp = await readFile(new URL("../src/lib/contentSecurityPolicy.ts", import.meta.url), "utf8");
const env = await readFile(new URL("../.env.example", import.meta.url), "utf8");
const throttle = await readFile(
  new URL("../supabase/functions/dashboard-auth-throttle/index.ts", import.meta.url),
  "utf8",
);
const securityMigration = await readFile(
  new URL("../supabase/migrations/20260919063000_dashboard_security_events.sql", import.meta.url),
  "utf8",
);
const throttleMigration = await readFile(
  new URL("../supabase/migrations/20260919064000_dashboard_login_throttle.sql", import.meta.url),
  "utf8",
);
const hardenedPolicies = await readFile(
  new URL("../supabase/migrations/20260919065000_harden_dashboard_security_policies.sql", import.meta.url),
  "utf8",
);

test("Turnstile is staged safely and passed directly to Supabase Auth", () => {
  assert.match(catalog, /VITE_TURNSTILE_SITE_KEY/);
  assert.match(catalog, /options: \{ captchaToken \}/);
  assert.match(catalog, /resetPasswordForEmail[\s\S]+captchaToken/);
  assert.match(login, /TurnstileChallenge/);
  assert.match(login, /captchaToken \?\? undefined/);
  assert.match(login, /isDashboardTurnstileConfigured && !captchaToken/);
  assert.doesNotMatch(env, /TURNSTILE_SECRET/i);
  assert.match(env, /Secret Key OUT of this repository/);
});

test("Turnstile widget uses explicit rendering, token expiry handling and CSP allowlisting", () => {
  assert.match(turnstile, /api\.js\?render=explicit/);
  assert.match(turnstile, /turnstile\.render/);
  assert.match(turnstile, /"expired-callback"/);
  assert.match(turnstile, /"error-callback"/);
  assert.match(turnstile, /turnstile\.reset/);
  assert.match(csp, /script-src[^\n]+https:\/\/challenges\.cloudflare\.com/);
  assert.match(csp, /connect-src[^\n]+https:\/\/challenges\.cloudflare\.com/);
  assert.match(csp, /frame-src[^\n]+https:\/\/challenges\.cloudflare\.com/);
});

test("pre-auth throttle uses opaque pair/IP buckets and authenticates success resets", () => {
  assert.match(catalog, /dashboard-auth-throttle/);
  assert.match(catalog, /outcome: "check" \| "failure" \| "success"/);
  assert.match(catalog, /dashboardLoginThrottle\(email, "check"\)/);
  assert.match(catalog, /dashboardLoginThrottle\(email, "failure"\)/);
  assert.match(catalog, /dashboardLoginThrottle\(email, "success"\)/);
  assert.match(throttle, /PAIR_SOFT_FAILURES = 5/);
  assert.match(throttle, /PAIR_HARD_FAILURES = 10/);
  assert.match(throttle, /IP_SOFT_FAILURES = 25/);
  assert.match(throttle, /IP_HARD_FAILURES = 50/);
  assert.match(throttle, /outcome === "success"/);
  assert.match(throttle, /authorization.*bearer/is);
  assert.match(throttle, /supabase\.auth\.getUser\(token\)/);
  assert.match(throttle, /from\("user_roles"\)/);
  assert.match(throttle, /roleRow\?\.role !== "admin"/);
  assert.match(throttle, /roleRow\?\.role !== "editor"/);
  assert.match(throttle, /email = user\.email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(throttle, /pair\|\$\{ip\}\|\$\{email\}/);
  assert.match(throttle, /ip\|\$\{ip\}/);
  assert.match(throttle, /eq\("key_hash", pairKeyHash\)/);
  assert.match(throttle, /48 \* 60 \* 60 \* 1000/);
  assert.match(throttleMigration, /key_hash text primary key/);
  assert.doesNotMatch(throttleMigration, /email text|ip_address|raw_email|raw_ip/i);

  const authCheck = throttle.indexOf("await supabase.auth.getUser(token)");
  const pairHash = throttle.indexOf("sha256(`pair|${ip}|${email}`)");
  const successBranch = throttle.indexOf('if (outcome === "success")');
  const successDelete = throttle.indexOf('.delete()\n        .eq("key_hash", pairKeyHash)', successBranch);
  assert.ok(authCheck >= 0, "success reset must validate the session");
  assert.ok(pairHash > authCheck, "pair bucket must be derived after authenticated identity");
  assert.ok(successDelete > authCheck, "pair bucket reset must happen after authentication");
});
test("throttle storage is denied to browser roles", () => {
  assert.match(hardenedPolicies, /dashboard_login_throttle_deny_clients/);
  assert.match(hardenedPolicies, /to anon, authenticated/);
  assert.match(hardenedPolicies, /using \(false\)/);
  assert.match(hardenedPolicies, /with check \(false\)/);
});

test("session controls use explicit Supabase sign-out scopes", () => {
  assert.match(catalog, /signOut\(\{ scope: "local" \}\)/);
  assert.match(catalog, /signOut\(\{ scope: "others" \}\)/);
  assert.match(catalog, /signOut\(\{ scope: "global" \}\)/);
  assert.match(securityPage, /Sign out this device/);
  assert.match(securityPage, /Sign out all other sessions/);
  assert.match(securityPage, /Sign out all sessions/);
});

test("security events are sanitized, user-bound and visible in the Security Center", () => {
  assert.match(securityMigration, /dashboard_security_events/);
  assert.match(securityMigration, /dashboard_security_events_staff_read_own/);
  assert.match(hardenedPolicies, /private\.log_dashboard_security_event_internal/);
  assert.match(hardenedPolicies, /security invoker/);
  assert.match(hardenedPolicies, /p_metadata - 'password' - 'token' - 'secret' - 'captchaToken'/);
  assert.match(catalog, /log_dashboard_security_event/);
  assert.match(catalog, /mfa_verified/);
  assert.match(catalog, /login_success/);
  assert.match(catalog, /password_changed/);
  assert.match(catalog, /signout_global/);
  assert.match(securityPage, /Recent security activity/);
});

test("Security Center is a real route and reports security state precisely", () => {
  assert.match(app, /import SecurityPage from "@\/dashboard\/pages\/SecurityPage"/);
  assert.match(app, /route === "\/dashboard\/security"[\s\S]+<SecurityPage \/>/);
  assert.match(nav, /href: "\/dashboard\/security"/);
  assert.match(nav, /label: "Security"/);
  assert.match(securityPage, /AAL2 active/);
  assert.match(securityPage, /Client configured/);
  assert.match(securityPage, /Supabase Auth must also have Cloudflare Turnstile enabled/);
});

