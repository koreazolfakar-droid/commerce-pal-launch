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

test("HIBP screening uses the privacy-preserving password range API", () => {
  assert.match(helper, /crypto\.subtle\.digest\("SHA-1"/);
  assert.match(helper, /digest\.slice\(0, 5\)/);
  assert.match(helper, /digest\.slice\(5\)/);
  assert.match(helper, /https:\/\/api\.pwnedpasswords\.com\/range\//);
  assert.match(helper, /"Add-Padding": "true"/);
  assert.match(helper, /credentials: "omit"/);
  assert.match(helper, /referrerPolicy: "no-referrer"/);
  assert.match(helper, /cache: "no-store"/);
});

test("dashboard password mutation is blocked until HIBP screening passes", () => {
  assert.match(catalog, /assertDashboardPasswordNotPwned\(password\)/);
  assert.match(catalog, /supabase\.auth\.updateUser\(\{ password \}\)/);

  const screening = catalog.indexOf("await assertDashboardPasswordNotPwned(password)");
  const mutation = catalog.indexOf("await supabase.auth.updateUser({ password })");

  assert.ok(screening >= 0, "HIBP screening call must exist");
  assert.ok(mutation > screening, "HIBP screening must happen before password mutation");
});

test("HIBP outage fails closed instead of silently changing the password", () => {
  assert.match(
    helper,
    /Security check is temporarily unavailable\. Your password was not changed\./,
  );
});

test("dashboard UI and CSP expose only the intended HIBP integration", () => {
  assert.match(login, /HIBP k-anonymity/);
  assert.match(login, /your password is never sent to HIBP/);
  assert.match(
    server,
    /connect-src[^\n]+https:\/\/api\.pwnedpasswords\.com/,
  );
});
