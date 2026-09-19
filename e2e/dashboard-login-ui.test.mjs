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

test("login page keeps staff authentication and never stores passwords", () => {
  assert.match(login, /signInDashboard\(email, password, captchaToken/);
  assert.match(login, /EMAIL_STORAGE_KEY = "spacecall-dashboard-email"/);
  assert.match(login, /Remember email/);
  assert.doesNotMatch(login, /localStorage\.setItem\([^\n]*password/i);
  assert.doesNotMatch(catalog, /localStorage.*password/i);
});

test("login page exposes bilingual theme-aware mobile UX without public security internals", () => {
  assert.match(login, /Show password/);
  assert.match(login, /Hide password/);
  assert.match(login, /تسجيل الدخول/);
  assert.match(login, /spacecall-login-theme/);
  assert.match(login, /ThemeLanguageControls/);
  assert.match(login, /min-h-\[100dvh\]/);
  assert.match(login, /sm:text-\[13px\]/);
  assert.match(login, /lg:grid-cols-\[1\.05fr_\.95fr\]/);
  assert.doesNotMatch(login, /Supabase authentication with staff-role authorization/);
  assert.doesNotMatch(login, /Cloudflare Turnstile bot protection/);
  assert.doesNotMatch(login, /AAL2 security verified/);
  assert.doesNotMatch(login, /HIBP receives only/);
  assert.doesNotMatch(login, /server-side data rules/);
  assert.doesNotMatch(login, /Automatic sign-out after 30 minutes of inactivity/);
});

test("password recovery flow is real and uses the protected auth path", () => {
  assert.match(login, /Forgot password\?/);
  assert.match(login, /requestDashboardPasswordReset\(email, captchaToken/);
  assert.match(login, /updateDashboardPassword\(newPassword\)/);
  assert.match(login, /mode=recovery/);
  assert.match(catalog, /resetPasswordForEmail/);
  assert.match(catalog, /functions\.invoke\("dashboard-update-password"/);
  assert.doesNotMatch(catalog, /auth\.updateUser\(\{ password \}\)/);
  assert.match(catalog, /\/dashboard\/login\?mode=recovery/);
  assert.match(catalog, /password\.length < 10/);
  assert.match(catalog, /Enter a valid dashboard email address/);
  assert.match(login, /If this email is authorized, a recovery link will be sent/);
  assert.match(login, /If this email belongs to an authorized account/);
});

test("login provides accessible inline errors and loading states", () => {
  assert.match(login, /role="alert"/);
  assert.match(login, /Loader2/);
  assert.match(login, /disabled=\{loading\}/);
  assert.match(login, /autoComplete="username"/);
  assert.match(login, /autoComplete="current-password"/);
  assert.match(login, /spellCheck=\{false\}/);
  assert.match(login, /getModifierState\("CapsLock"\)/);
  assert.match(login, /Caps Lock is on\. Check your password before continuing\./);
  assert.match(login, /Never share your password or verification code/);
});

test("login UI clears sensitive password state when changing authentication flows", () => {
  assert.match(
    login,
    /setPassword\("")[\s\S]+setShowPassword\(false\)[\s\S]+setView\("forgot"\)/,
  );
  assert.match(
    login,
    /const backToSignIn = \(\) => \{[\s\S]+setPassword\("")[\s\S]+setNewPassword\("")[\s\S]+setConfirmPassword\("")/,
  );
  assert.match(
    login,
    /const handleMfaCancel = useCallback\(\(\) => \{[\s\S]+setPassword\("")[\s\S]+setNewPassword\("")[\s\S]+setConfirmPassword\("")/,
  );
});

test("sign-in errors are sanitized and failed credentials are cleared", () => {
  assert.match(catalog, /DASHBOARD_SIGNIN_DENIED_MESSAGE = "Unable to sign in with those credentials\."/);
  assert.match(catalog, /dashboardSignInErrorMessage/);
  assert.match(catalog, /code === "captcha_failed"/);
  assert.match(catalog, /status === 429 \|\| code\.includes\("rate_limit"\)/);
  assert.match(catalog, /status >= 500/);
  assert.doesNotMatch(catalog, /throwIfError\(error, "Sign in failed"\)/);
  assert.doesNotMatch(catalog, /This account does not have dashboard access\./);
  assert.match(
    login,
    /catch \(cause\) \{[\s\S]+setPassword\("")[\s\S]+setShowPassword\(false\)[\s\S]+setInlineError\(message\)/,
  );
});

test("login supports Arabic RTL and a persisted light or dark appearance", () => {
  assert.match(login, /const \{ lang, setLang \} = useLanguage\(\)/);
  assert.match(login, /dir=\{isRtl \? "rtl" : "ltr"\}/);
  assert.match(login, /setLang\(lang === "en" \? "ar" : "en"\)/);
  assert.match(login, /LOGIN_THEME_STORAGE_KEY/);
  assert.match(login, /prefers-color-scheme: dark/);
  assert.match(login, /data-login-theme=\{theme\}/);
});
