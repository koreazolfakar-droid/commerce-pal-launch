import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const [throttleSource, catalog, customer, customerChallenge] = await Promise.all([
  readFile(new URL("../src/dashboard/security/loginThrottleDecision.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/customer-auth/CustomerAuthDialog.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/customer-auth/CustomerTurnstile.tsx", import.meta.url), "utf8"),
]);

const compiled = ts.transpileModule(throttleSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { parseDashboardThrottleDecision } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);

test("login throttle explicitly rejects incomplete and malformed server responses", () => {
  for (const response of [null, [], {}, { allowed: "true" }, { error: "unavailable" }, { allowed: 1 }]) {
    assert.equal(parseDashboardThrottleDecision(response), null);
  }
  assert.deepEqual(parseDashboardThrottleDecision({ allowed: true, retryAfter: 0 }), {
    allowed: true,
    retryAfter: 0,
  });
  assert.deepEqual(parseDashboardThrottleDecision({ allowed: false, retryAfter: 92.5 }), {
    allowed: false,
    retryAfter: 93,
  });
  assert.deepEqual(parseDashboardThrottleDecision({ allowed: false }), {
    allowed: false,
    retryAfter: 60,
  });
});

test("pre-auth throttle is fail-closed, while post-auth best-effort cleanup remains non-blocking", () => {
  assert.match(catalog, /parseDashboardThrottleDecision\(data\)/);
  assert.match(catalog, /if \(!decision\) throw new Error\("invalid_throttle_response"\)/);
  assert.match(catalog, /if \(outcome === "success"\)[\s\S]*?return \{ allowed: true, retryAfter: 0 \}/);
  assert.match(catalog, /throw new Error\("Sign-in security check is temporarily unavailable\. Try again shortly\."\)/);
  assert.match(catalog, /const throttle = await dashboardLoginThrottle\(email, "attempt"\);[\s\S]*?supabase\.auth\.signInWithPassword/);
  assert.doesNotMatch(catalog, /return \{ allowed: payload\?\.allowed !== false/);
});

test("customer SMS OTP carries server-verifiable CAPTCHA tokens, including on resend", () => {
  assert.match(customer, /customerTurnstileSiteKey && !captchaToken/);
  assert.match(customer, /supabase\.auth\.signInWithOtp\([\s\S]*?\.\.\.\(captchaToken \? \{ captchaToken \} : \{\}\)/);
  assert.match(customer, /setCaptchaResetNonce\(\(value\) => value \+ 1\)/);
  assert.match(customer, /sendPhoneCode\(verifiedPhone\)/);
  assert.ok(customer.match(/<CustomerTurnstile onTokenChange=\{setCaptchaToken\}/g)?.length === 2);
  assert.match(customerChallenge, /VITE_TURNSTILE_SITE_KEY/);
  assert.match(customerChallenge, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/);
  assert.match(customerChallenge, /"expired-callback"/);
  assert.match(customerChallenge, /"error-callback"/);
  assert.match(customerChallenge, /turnstileApi\(\)/);
  assert.doesNotMatch(customerChallenge, /TURNSTILE_SECRET/);
});
