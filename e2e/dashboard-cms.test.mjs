import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const repairMigration = "supabase/migrations/20260916064000_restore_dashboard_admin_cms.sql";

test("public CMS gateway uses the canonical dashboard schema", async () => {
  const source = await read("supabase/functions/public-cms/index.ts");

  assert.match(source, /from\("cms_settings"\)/);
  assert.match(source, /from\("cms_hero_slides"\)/);
  assert.match(source, /from\("cms_sections"\)/);
  assert.match(source, /from\("cms_navigation"\)/);
  assert.match(source, /eq\("is_visible", true\)/);

  assert.doesNotMatch(source, /cms_site_settings/);
  assert.doesNotMatch(source, /cms_navigation_items/);
  assert.doesNotMatch(source, /is_published/);
  assert.doesNotMatch(source, /starts_at/);
  assert.doesNotMatch(source, /ends_at/);
});

test("dashboard CMS CRUD stays staff-only through RLS", async () => {
  const migration = await read(repairMigration);

  for (const table of [
    "cms_settings",
    "cms_hero_slides",
    "cms_sections",
    "cms_navigation",
    "cms_brands",
    "cms_seo_pages",
  ]) {
    assert.match(
      migration,
      new RegExp(`grant select, insert, update, delete on public\\.${table} to authenticated`, "i"),
    );
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from anon`, "i"));
  }

  assert.match(migration, /public\.is_staff\(auth\.uid\(\)\)/);
  assert.match(migration, /cms-media/);
});

test("first-admin bootstrap is one-time and race-safe", async () => {
  const migration = await read(repairMigration);

  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /if exists \(select 1 from public\.user_roles\)/i);
  assert.match(migration, /grant execute on function public\.claim_admin\(\) to authenticated/i);
  assert.match(migration, /revoke all on function public\.claim_admin\(\) from public, anon/i);
});
