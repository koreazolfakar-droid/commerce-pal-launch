import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const security = await readFile(
  new URL("../src/dashboard/security/Auth0DashboardSecurity.tsx", import.meta.url),
  "utf8",
);
const mount = await readFile(
  new URL("../src/dashboard/AppMount.tsx", import.meta.url),
  "utf8",
);
const app = await readFile(
  new URL("../src/dashboard/App.tsx", import.meta.url),
  "utf8",
);
const login = await readFile(
  new URL("../src/dashboard/pages/LoginPage.tsx", import.meta.url),
  "utf8",
);
const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

test("dashboard is wrapped by Auth0 before the admin app mounts", () => {
  assert.match(mount, /Auth0DashboardSecurity/);
  assert.match(mount, /<Auth0DashboardSecurity>[\s\S]*<App \/>/);
});

test("Auth0 uses public Vite configuration and in-memory token cache", () => {
  assert.match(security, /VITE_AUTH0_DOMAIN/);
  assert.match(security, /VITE_AUTH0_CLIENT_ID/);
  assert.match(security, /cacheLocation="memory"/);
  assert.match(security, /scope: "openid profile email"/);
  assert.doesNotMatch(security, /clientSecret|CLIENT_SECRET|localStorage/);
});

test("dashboard keeps Supabase staff and MFA authorization behind Auth0", () => {
  assert.match(app, /getDashboardMfaStatus\(\)/);
  assert.match(login, /signInDashboard\(email, password\)/);
  assert.match(app, /signOutDashboard/);
  assert.match(app, /logoutAuth0/);
  assert.match(app, /status\?\.ready/);
});

test("official Auth0 React SDK is installed", () => {
  assert.equal(pkg.dependencies["@auth0/auth0-react"], "^2.26.0");
});
