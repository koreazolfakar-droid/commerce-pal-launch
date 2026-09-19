import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const login = await readFile(
  new URL("../src/dashboard/pages/LoginPage.tsx", import.meta.url),
  "utf8",
);
const server = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");

test("login page shields sensitive content when hidden or unfocused", () => {
  assert.match(login, /privacyShielded/);
  assert.match(login, /visibilitychange/);
  assert.match(login, /window\.addEventListener\("blur", shield\)/);
  assert.match(login, /window\.addEventListener\("focus", unshield\)/);
  assert.match(login, /window\.addEventListener\("pagehide", shield\)/);
  assert.match(login, /data-testid="login-privacy-shield"/);
});

test("login page deters desktop PrintScreen and printing", () => {
  assert.match(login, /event\.key === "PrintScreen"/);
  assert.match(login, /event\.preventDefault\(\)/);
  assert.match(login, /print:hidden/);
  assert.match(login, /@media print/);
  assert.match(login, /visibility: hidden !important/);
});

test("server disables page-initiated display capture", () => {
  assert.match(
    server,
    /Permissions-Policy"[\s\S]*display-capture=\(\)/,
  );
});
