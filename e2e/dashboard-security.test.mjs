import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard CMS writes stay behind the authenticated server boundary", async () => {
  const [functions, server, editor, media] = await Promise.all([
    read("src/lib/cmsAdmin.functions.ts"),
    read("src/lib/cmsAdmin.server.ts"),
    read("src/components/admin/CollectionEditor.tsx"),
    read("src/lib/adminMedia.ts"),
  ]);

  assert.match(functions, /requireSupabaseAuth/);
  assert.match(functions, /requireDashboardRole/);
  assert.match(server, /SUPABASE_SERVICE_ROLE_KEY|supabaseAdmin/);
  assert.doesNotMatch(editor, /integrations\/supabase\/client/);
  assert.doesNotMatch(media, /storage\.from/);
});

test("dashboard authorization does not auto-promote the first signed-in user", async () => {
  const [migration, login] = await Promise.all([
    read("supabase/migrations/20260915213000_add_dashboard_roles.sql"),
    read("src/components/admin/AdminLogin.tsx"),
  ]);

  assert.match(migration, /dashboard_roles/);
  assert.match(migration, /revoke all on public\.dashboard_roles from public, anon, authenticated/);
  assert.match(migration, /grant all on public\.dashboard_roles to service_role/);
  assert.doesNotMatch(migration, /first signed-in user becomes admin/i);
  assert.doesNotMatch(login, /claim_admin/);
});

test("dashboard route is noindex and the CMS uses the live production table names", async () => {
  const [route, server] = await Promise.all([
    read("src/routes/dashboard.tsx"),
    read("src/lib/cmsAdmin.server.ts"),
  ]);

  assert.match(route, /noindex, nofollow, noarchive/);
  assert.match(server, /cms_site_settings/);
  assert.match(server, /cms_navigation_items/);
  assert.match(server, /is_published|cms_hero_slides/);
  assert.doesNotMatch(server, /cms_settings/);
});
