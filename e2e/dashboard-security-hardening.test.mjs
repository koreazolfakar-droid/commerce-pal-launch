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
const nav = await readFile(new URL("../src/dashboard/mock/data.ts", import.meta.url), "utf8");
const server = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");
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
  assert.match(server, /script-src[^\n]+https:\/\/challenges\.cloudflare\.com/);
  assert.match(server, /frame-src[^\n]+https:\/\/challenges\.cloudflare\.com/);
});

test("pre-auth throttle is non-clearable and stores only opaque hashes", () => {
  assert.match(catalog, /dashboard-auth-throttle/);
  assert.match(catalog, /outcome: "check" \| "failure"/);
  assert.doesNotMatch(catalog, /dashboardLoginThrottle\(email, "success"\)/);
  assert.match(throttle, /sha256\(\`pair\|\$\{ip\}\|\$\{email\}\`\)/);
  assert.match(throttle, /sha256\(\`ip\|\$\{ip\}\`\)/);
  assert.match(throttle, /PAIR_SOFT_FAILURES = 5/);
  assert.match(throttle, /IP_SOFT_FAILURES = 25/);
  assert.doesNotMatch(throttle, /outcome === "success"/);
  assert.match(throttleMigration, /key_hash text primary key/);
  assert.doesNotMatch(throttleMigration, /email text|ip_address|raw_email/i);
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
  assert.match(securityMigration, /p_metadata - 'password' - 'token' - 'secret' - 'captchaToken'/);
  assert.match(catalog, /log_dashboard_security_event/);
  assert.match(catalog, /mfa_verified/);
  assert.match(catalog, /login_success/);
  assert.match(catalog, /password_changed/);
  assert.match(securityPage, /Recent security activity/);
});

test("Security Center is a real dashboard route", () => {
  assert.match(app, /import SecurityPage from "@\/dashboard\/pages\/SecurityPage"/);
  assert.match(app, /route === "\/dashboard\/security"[\s\S]+<SecurityPage \/>/);
  assert.match(nav, /href: "\/dashboard\/security"/);
  assert.match(nav, /label: "Security"/);
});
