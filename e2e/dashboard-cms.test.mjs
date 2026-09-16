import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const repairMigration = "supabase/migrations/20260916064000_restore_dashboard_admin_cms.sql";

test("public CMS gateway stays aligned with the live production schema", async () => {
  const source = await read("supabase/functions/public-cms/index.ts");

  assert.match(source, /from\("cms_site_settings"\)/);
  assert.match(source, /from\("cms_hero_slides"\)/);
  assert.match(source, /from\("cms_sections"\)/);
  assert.match(source, /from\("cms_navigation_items"\)/);
  assert.match(source, /eq\("is_published", true\)/);
  assert.match(source, /starts_at/);
  assert.match(source, /ends_at/);
});

test("dashboard routes edit the same CMS tables and fields as production", async () => {
  const [hero, navigation, brands, seo, settings] = await Promise.all([
    read("src/routes/dashboard.hero.tsx"),
    read("src/routes/dashboard.navigation.tsx"),
    read("src/routes/dashboard.brands.tsx"),
    read("src/routes/dashboard.seo.tsx"),
    read("src/components/admin/SettingsEditor.tsx"),
  ]);

  assert.match(hero, /table="cms_hero_slides"/);
  assert.match(hero, /is_published/);
  assert.match(navigation, /table="cms_navigation_items"/);
  assert.match(brands, /key: "href"/);
  assert.doesNotMatch(brands, /collection_handle/);
  assert.match(seo, /idKey="page_slug"/);
  assert.match(seo, /json_ld/);
  assert.match(settings, /from\("cms_site_settings"\)/);
  assert.match(settings, /value_type/);
});

test("dashboard CMS CRUD stays role-gated through RLS", async () => {
  const migration = await read(repairMigration);

  for (const table of [
    "cms_site_settings",
    "cms_hero_slides",
    "cms_sections",
    "cms_navigation_items",
    "cms_brands",
    "cms_seo_pages",
  ]) {
    assert.match(
      migration,
      new RegExp(`grant select, insert, update, delete on public\\.${table} to authenticated`, "i"),
    );
  }

  assert.match(migration, /create table if not exists public\.user_roles/i);
  assert.match(migration, /private\.is_dashboard_staff/);
  assert.match(migration, /private\.is_dashboard_admin/);
  assert.match(migration, /dashboard_media_staff_insert/);
  assert.match(migration, /bucket_id = 'cms-media'/);
});

test("first-admin bootstrap is one-time, race-safe, and not a public RPC", async () => {
  const migration = await read(repairMigration);

  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /if exists \(select 1 from public\.user_roles\)/i);
  assert.match(migration, /guard_dashboard_role_insert/);
  assert.match(migration, /new\.user_id <> \(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(migration, /function public\.claim_admin/i);
});
