import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [app, page, data, header, footer, publicCms] = await Promise.all([
  readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/SettingsPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/settings.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/SiteHeader.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/SiteFooter.tsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/public-cms/index.ts", import.meta.url), "utf8"),
]);

test("dashboard settings are Supabase-backed", () => {
  assert.match(data, /from\("cms_site_settings"\)/);
  assert.match(data, /\.upsert\(rows, \{ onConflict: "key" \}\)/);
  assert.match(data, /getDashboardRole\(\)/);
  assert.doesNotMatch(data, /service_role|SUPABASE_SERVICE_ROLE|sb_secret_/);
});

test("dashboard settings support real CMS logo upload", () => {
  assert.match(data, /SETTINGS_BUCKET = "cms-media"/);
  assert.match(data, /convertProductImageToWebp\(file, "1080"\)/);
  assert.match(data, /register_cms_media_asset/);
  assert.match(page, /uploadDashboardStoreLogo/);
  assert.match(page, /Save changes/);
});

test("settings route uses the live SettingsPage module", () => {
  assert.match(app, /import SettingsPage from "@\/dashboard\/pages\/SettingsPage"/);
  assert.match(app, /route === "\/dashboard\/settings"\) content = <SettingsPage \/>/);
  assert.doesNotMatch(app, /function SettingsPage\(\)/);
});

test("storefront consumes CMS identity, logo, WhatsApp and social settings", () => {
  assert.match(header, /cms\?\.settings\["site_name"\]/);
  assert.match(header, /cms\?\.settings\["logo_url"\]/);
  assert.match(footer, /cms\?\.settings\["whatsapp_number"\]/);
  assert.match(footer, /socialSetting\("instagram_url"/);
  assert.match(publicCms, /from\("cms_site_settings"\)/);
  assert.match(publicCms, /"Cache-Control": "no-store, max-age=0"/);
});
