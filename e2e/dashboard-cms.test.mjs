import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const repairMigration = "supabase/migrations/20260916064000_restore_dashboard_admin_cms.sql";
const hardeningMigration = "supabase/migrations/20260916074000_harden_dashboard_access.sql";

test("public CMS gateway stays aligned with the live production schema", async () => {
  const source = await read("supabase/functions/public-cms/index.ts");

  for (const table of [
    "cms_site_settings",
    "cms_hero_slides",
    "cms_sections",
    "cms_navigation_items",
    "cms_brands",
    "cms_seo_pages",
  ]) {
    assert.match(source, new RegExp(`from\\("${table}"\\)`));
  }

  assert.match(source, /eq\("is_published", true\)/);
  assert.match(source, /starts_at/);
  assert.match(source, /ends_at/);
  assert.match(source, /sections:\s*sectionsResult\.data/);
  assert.match(source, /navigation:\s*navigationResult\.data/);
  assert.doesNotMatch(source, /from\("cms_sections"\)[\s\S]*?eq\("is_visible", true\)/);
  assert.doesNotMatch(source, /from\("cms_navigation_items"\)[\s\S]*?eq\("is_visible", true\)/);
  assert.match(source, /brands:\s*brandsResult\.data/);
  assert.match(source, /seoPages:\s*seoResult\.data/);
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

test("generic CMS editor creates drafts before database inserts", async () => {
  const editor = await read("src/components/admin/CollectionEditor.tsx");

  assert.match(editor, /const IS_DRAFT/);
  assert.match(editor, /draft-\$\{crypto\.randomUUID\(\)\}/);
  assert.match(editor, /insert\(payload as never\)\s*\.select\("\*"\)\s*\.single\(\)/);
  assert.match(editor, /field\.required/);
  assert.doesNotMatch(
    editor,
    /const addRow = async \(\) => \{\s*const \{ error \} = await client\.from/,
  );
});

test("storefront consumes dashboard brands SEO navigation and settings", async () => {
  const [home, brandsPage, layout, controls, directory, media] = await Promise.all([
    read("src/routes/index.tsx"),
    read("src/routes/brands.tsx"),
    read("src/components/StoreLayout.tsx"),
    read("src/components/CmsStoreControls.tsx"),
    read("src/lib/brandDirectory.ts"),
    read("src/lib/adminMedia.ts"),
  ]);

  assert.match(home, /applyCmsBrands/);
  assert.match(home, /cmsSeoPage\(cms, "home"\)/);
  assert.match(brandsPage, /applyCmsBrands/);
  assert.match(directory, /export function applyCmsBrands/);
  assert.match(layout, /<CmsAnnouncementBar/);
  assert.match(layout, /area="header"/);
  assert.match(layout, /area="mobile_menu"/);
  assert.match(layout, /area="footer"/);
  assert.match(layout, /<CmsTrustStrip/);
  assert.match(controls, /announcement_enabled/);
  assert.match(controls, /whatsapp_number/);
  assert.match(media, /getPublicUrl/);
  assert.doesNotMatch(media, /createSignedUrl/);
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

test("dashboard has no public signup or self-service admin bootstrap", async () => {
  const [migration, login, shell] = await Promise.all([
    read(hardeningMigration),
    read("src/components/admin/AdminLogin.tsx"),
    read("src/components/admin/DashboardShell.tsx"),
  ]);

  assert.match(migration, /drop trigger if exists guard_dashboard_role_insert/i);
  assert.match(migration, /dashboard_roles_insert/);
  assert.match(migration, /with check \(\(select private\.is_dashboard_admin\(\)\)\)/i);
  assert.match(migration, /guard_last_dashboard_admin/);
  assert.match(migration, /dashboard_last_admin_protected/);

  assert.doesNotMatch(login, /auth\.signUp\s*\(/);
  assert.doesNotMatch(login, /auth\.resend\s*\(/);
  assert.doesNotMatch(shell, /from\("user_roles"\)\.insert/);
  assert.doesNotMatch(shell, /role:\s*"admin"/);
  assert.match(shell, /ADMIN_IDLE_TIMEOUT_MS\s*=\s*30\s*\*\s*60\s*\*\s*1000/);
});
