import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const settings = await readFile(
  new URL("../src/dashboard/pages/SettingsPage.tsx", import.meta.url),
  "utf8",
);

test("dashboard shell exposes only truthful live actions", () => {
  assert.match(app, /import \{ SITE_URL \} from "@\/lib\/storeConfig"/);
  assert.match(app, /window\.open\(SITE_URL, "_blank", "noopener,noreferrer"\)/);
  assert.match(app, /placeholder=\{t\("Search products\.\.\."\)\}/);
  assert.doesNotMatch(app, /Search orders, products, customers/);
  assert.doesNotMatch(app, /Store preview link is available in the next integration phase/);
  assert.doesNotMatch(app, /You are all caught up/);
});

test("settings no longer pretends to persist mock configuration", () => {
  assert.match(settings, /loadDashboardSiteSettings/);
  assert.match(settings, /saveDashboardSiteSettings/);
  assert.match(settings, /Settings refreshed from Supabase\./);
  assert.match(settings, /Store settings saved to Supabase\./);
  assert.match(settings, /System \/ Live configuration/);
  assert.doesNotMatch(settings, /Settings saved to the local mock workspace/);
  assert.doesNotMatch(settings, /hello@spacecall\.demo/);
  assert.doesNotMatch(settings, /Visual placeholders only\. Nothing is connected/);
  assert.doesNotMatch(settings, /Standalone dashboard using mock\/demo data only/);
});

test("account menu uses separate valid action buttons", () => {
  assert.match(app, /aria-haspopup="menu"/);
  assert.match(app, /navigate\("\/dashboard\/security"\)/);
  assert.match(app, /navigate\("\/dashboard\/settings"\)/);
  assert.doesNotMatch(app, /> Profile<\/button>/);
});
