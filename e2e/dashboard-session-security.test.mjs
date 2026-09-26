import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const catalog = await readFile(
  new URL("../src/dashboard/data/catalog.ts", import.meta.url),
  "utf8",
);
const storage = await readFile(
  new URL("../src/integrations/supabase/previewAuthStorage.ts", import.meta.url),
  "utf8",
);

test("dashboard expires inactive Supabase sessions", () => {
  assert.match(app, /DASHBOARD_IDLE_TIMEOUT_MS = 30 \* 60 \* 1000/);
  assert.match(app, /signOutDashboard\(\)/);
  assert.match(app, /pointerdown/);
  assert.match(app, /keydown/);
  assert.match(app, /touchstart/);
  assert.match(app, /Dashboard session expired after 30 minutes of inactivity/);
  assert.match(app, /Date\.now\(\) - lastActivityAt\.current >= DASHBOARD_IDLE_TIMEOUT_MS/);
  assert.match(
    app,
    /Date\.now\(\) - lastActivityAt\.current >= DASHBOARD_IDLE_TIMEOUT_MS[\s\S]*expireDashboardSession\(\)[\s\S]*getDashboardMfaStatus\(\)/,
  );
});

test("dashboard session recovery is centralized, bounded and tab-scoped", () => {
  assert.match(catalog, /DASHBOARD_ACCESS_TOKEN_REFRESH_SKEW_MS = 5_000/);
  assert.match(catalog, /DASHBOARD_USER_VALIDATION_CACHE_TTL_MS = 5_000/);
  assert.match(catalog, /let dashboardSessionRefreshRequest: Promise<boolean> \| null = null/);
  assert.match(catalog, /dashboardUserValidationRequest/);
  assert.match(catalog, /async function getServerValidatedDashboardUser/);
  assert.match(catalog, /dashboardValidatedUserCache\.expiresAt > Date\.now\(\)/);
  assert.match(catalog, /clearDashboardAuthCaches\(\)/);
  assert.match(catalog, /async function refreshDashboardSessionOnce\(\)/);
  assert.match(catalog, /await supabase\.auth\.refreshSession\(\)/);
  assert.match(catalog, /let refreshed = false/);
  assert.match(catalog, /if \(refreshed\) return false/);
  assert.match(catalog, /dashboardSessionNeedsRefresh\(session\)/);
  assert.match(catalog, /event === "TOKEN_REFRESHED"/);
  assert.match(catalog, /getDashboardMfaStatus[\s\S]*getValidatedDashboardUser\(\)/);

  assert.match(storage, /safeBrowserStorage\('session'\)/);
  assert.doesNotMatch(
    storage,
    /if \(!projectId \|\| !framed\) return localStorage/,
  );
});

test("dashboard redirects failed recovered sessions instead of leaving a stale shell", () => {
  assert.match(catalog, /DASHBOARD_AUTH_REQUIRED_EVENT = "spacecall:dashboard-auth-required"/);
  assert.match(catalog, /window\.dispatchEvent\(new Event\(DASHBOARD_AUTH_REQUIRED_EVENT\)\)/);
  assert.match(app, /window\.addEventListener\(DASHBOARD_AUTH_REQUIRED_EVENT, handleAuthRequired\)/);
  assert.match(app, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(app, /window\.addEventListener\("focus", revalidateVisibleSession\)/);
  assert.match(app, /navigate\(status \? "\/dashboard\/login\?mode=mfa" : "\/dashboard\/login"\)/);
});
