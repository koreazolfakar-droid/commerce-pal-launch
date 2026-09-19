import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const login = await readFile(
  new URL("../src/dashboard/pages/LoginPage.tsx", import.meta.url),
  "utf8",
);
const catalog = await readFile(
  new URL("../src/dashboard/data/catalog.ts", import.meta.url),
  "utf8",
);

test("dashboard login route uses the dedicated redesigned page", () => {
  assert.match(app, /import LoginPage from "@\/dashboard\/pages\/LoginPage"/);
  assert.match(app, /<Route path="\/dashboard\/login" component=\{LoginPage\}/);
  assert.doesNotMatch(app, /function LoginPage\(\)/);
});

test("login page keeps Supabase staff authentication and never stores passwords", () => {
  assert.match(login, /signInDashboard\(email, password\)/);
  assert.match(login, /EMAIL_STORAGE_KEY = "spacecall-dashboard-email"/);
  assert.match(login, /Remember email/);
  assert.doesNotMatch(login, /localStorage\.setItem\([^\n]*password/i);
  assert.doesNotMatch(catalog, /localStorage.*password/i);
});

test("login page exposes responsive security and password UX", () => {
  assert.match(login, /Show password/);
  assert.match(login, /Hide password/);
  assert.match(login, /Authorized staff only/);
  assert.match(login, /Supabase authentication with staff-role authorization/);
  assert.match(login, /Automatic sign-out after 30 minutes of inactivity/);
  assert.match(login, /items-start[\s\S]+sm:items-center/);
  assert.match(login, /lg:grid-cols-\[1\.05fr_\.95fr\]/);
});

test("password recovery flow is real and uses Supabase Auth", () => {
  assert.match(login, /Forgot password\?/);
  assert.match(login, /requestDashboardPasswordReset\(email\)/);
  assert.match(login, /updateDashboardPassword\(newPassword\)/);
  assert.match(login, /mode=recovery/);
  assert.match(catalog, /resetPasswordForEmail/);
  assert.match(catalog, /updateUser\(\{ password \}\)/);
  assert.match(catalog, /\/dashboard\/login\?mode=recovery/);
  assert.match(catalog, /password\.length < 10/);
});

test("login provides accessible inline errors and loading states", () => {
  assert.match(login, /role="alert"/);
  assert.match(login, /Loader2/);
  assert.match(login, /disabled=\{loading\}/);
  assert.match(login, /autoComplete="username"/);
  assert.match(login, /autoComplete="current-password"/);
});
