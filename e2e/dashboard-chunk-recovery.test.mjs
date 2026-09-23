import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [appMount, rootRoute] = await Promise.all([
  readFile(new URL("../src/dashboard/AppMount.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/__root.tsx", import.meta.url), "utf8"),
]);

test("dashboard lazy chunk loading recovers once from a stale deployed asset", () => {
  assert.match(appMount, /DASHBOARD_CHUNK_RELOAD_KEY/);
  assert.match(appMount, /failed to fetch dynamically imported module/i);
  assert.match(appMount, /sessionStorage\.getItem\(DASHBOARD_CHUNK_RELOAD_KEY\)/);
  assert.match(appMount, /sessionStorage\.setItem\(DASHBOARD_CHUNK_RELOAD_KEY, "1"\)/);
  assert.match(appMount, /window\.location\.reload\(\)/);
  assert.match(appMount, /const App = lazy\(loadDashboardApp\)/);
});

test("dashboard root error retry performs a fresh document reload", () => {
  assert.match(
    rootRoute,
    /window\.location\.pathname\.startsWith\("\/dashboard"\)[\s\S]*window\.location\.reload\(\)/,
  );
  assert.match(rootRoute, /router\.invalidate\(\);[\s\S]*reset\(\);/);
});
