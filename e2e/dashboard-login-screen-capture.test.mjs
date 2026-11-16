import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const login = await readFile(
  new URL("../src/dashboard/pages/LoginPage.tsx", import.meta.url),
  "utf8",
);
const server = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");

test("login remains usable when the mobile browser loses and regains focus", () => {
  assert.doesNotMatch(login, /privacyShielded|setPrivacyShielded|login-privacy-shield/);
  assert.doesNotMatch(login, /window\.addEventListener\("blur"|window\.addEventListener\("pagehide"/);
  assert.doesNotMatch(login, /PrintScreen|Sensitive content hidden|تم إخفاء المحتوى الحساس/);
  assert.match(login, /type=\{visible \? "text" : "password"\}/);
});

test("login still hides credentials from printed pages", () => {
  assert.match(login, /print:hidden/);
  assert.match(login, /@media print/);
  assert.match(login, /visibility: hidden !important/);
});

test("server disables page-initiated display capture", () => {
  assert.match(server, /Permissions-Policy"[\s\S]*display-capture=\(\)/);
});
