import { assertDashboardRoute, assertDashboardNavigation } from "./helpers/dashboard-routes.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const page = await readFile(
  new URL("../src/dashboard/pages/HeroBannersPage.tsx", import.meta.url),
  "utf8",
);
const data = await readFile(
  new URL("../src/dashboard/data/hero.ts", import.meta.url),
  "utf8",
);
const cms = await readFile(new URL("../src/lib/cms.ts", import.meta.url), "utf8");
const cmsQuery = await readFile(new URL("../src/lib/cmsQuery.ts", import.meta.url), "utf8");
const hero = await readFile(new URL("../src/components/HomeHero.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
const criticalHero = await readFile(new URL("../src/lib/criticalHero.ts", import.meta.url), "utf8");
const syncHeroEdge = await readFile(new URL("../supabase/functions/sync-current-hero/index.ts", import.meta.url), "utf8");
const migration = await readFile(
  new URL("../supabase/migrations/20260918230000_harden_cms_hero_targets.sql", import.meta.url),
  "utf8",
);
const customizationMigration = await readFile(
  new URL("../supabase/migrations/20260919210516_expand_hero_customization.sql", import.meta.url),
  "utf8",
);
const cmsGateway = await readFile(
  new URL("../supabase/functions/public-cms/index.ts", import.meta.url),
  "utf8",
);
const visualMigration = await readFile(
  new URL("../supabase/migrations/20260919212052_hero_visual_config.sql", import.meta.url),
  "utf8",
);
const atomicVisualMigration = await readFile(
  new URL("../supabase/migrations/20260919212447_hero_visual_atomic_save.sql", import.meta.url),
  "utf8",
);

test("dedicated hero dashboard route uses the real CMS page", () => {
assertDashboardRoute("/dashboard/homepage/hero","heroBannersPage");

  assert.doesNotMatch(page, /@\/dashboard\/mock\//);
  assert.doesNotMatch(data, /@\/dashboard\/mock\//);
});

test("hero dashboard supports real Supabase CRUD, storage upload and media library", () => {
  assert.match(data, /from\("cms_hero_slides"\)/);
  assert.match(data, /rpc\(\s*"create_cms_hero_slide_v3"/);
  assert.match(data, /rpc\(\s*"update_cms_hero_slide_v3"/);
  assert.match(data, /rpc\(\s*"delete_cms_hero_slide"/);
  assert.match(data, /rpc\(\s*"reorder_cms_hero_slides"/);
  assert.match(data, /supabase\.functions\.invoke\("sync-current-hero"/);
  assert.match(data, /storage\s*\.from\(HERO_BUCKET\)\s*\.upload/);
  assert.match(data, /rpc\(\s*"register_cms_media_asset"/);
  assert.match(data, /from\("cms_media_assets"\)/);
  assert.match(page, /Desktop image/);
  assert.match(page, /Mobile image/);
  assert.match(page, /Hero media library/);
  assert.match(page, /Starts at/);
  assert.match(page, /Ends at/);
  assert.match(page, /Design & live preview/);
  assert.match(page, /Eyebrow text/);
  assert.match(page, /Secondary CTA \(optional\)/);
  assert.doesNotMatch(page, /Content theme|Minimal|Centered|Glass/);
  assert.match(page, /Vertical position/);
  assert.match(page, /Title size/);
  assert.match(page, /Content width/);
  assert.match(page, /Button shape/);
  assert.match(data, /secondaryButtonStyle/);
  assert.match(data, /contentTheme/);
});

test("hero CTA uses validated product, collection or safe URL targets", () => {
  assert.match(migration, /validate_cms_hero_target/);
  assert.match(migration, /hero URL must be an internal path or HTTP\(S\) URL/);
  assert.match(migration, /p\.status = 'active'/);
  assert.match(migration, /c\.is_active = true/);
  assert.match(migration, /hero desktop image must use HTTPS/);
  assert.match(migration, /hero mobile image must use HTTPS/);
});

test("hero customization is persisted and exposed through the public CMS gateway", () => {
  assert.match(customizationMigration, /add column if not exists eyebrow_en/);
  assert.match(customizationMigration, /secondary_target_type/);
  assert.match(customizationMigration, /content_theme/);
  assert.match(customizationMigration, /create_cms_hero_slide_v2/);
  assert.match(customizationMigration, /update_cms_hero_slide_v2/);
  assert.match(customizationMigration, /from public, anon/);
  assert.match(cmsGateway, /eyebrow_en: row\.eyebrow_en/);
  assert.match(cmsGateway, /secondary_button_label_en/);
  assert.match(cmsGateway, /secondary_target_type/);
  assert.match(cmsGateway, /content_theme: row\.content_theme/);
  assert.match(cmsGateway, /visual_config: row\.visual_config/);
  assert.match(visualMigration, /add column if not exists visual_config/);
  assert.match(visualMigration, /set_cms_hero_visual_config/);
  assert.match(visualMigration, /from public, anon/);
  assert.match(data, /create_cms_hero_slide_v3/);
  assert.match(data, /update_cms_hero_slide_v3/);
  assert.match(atomicVisualMigration, /create_cms_hero_slide_v3/);
  assert.match(atomicVisualMigration, /update_cms_hero_slide_v3/);
  assert.match(atomicVisualMigration, /set_cms_hero_visual_config/);
});

test("public CMS uses an edge gateway with resilient empty fallback", () => {
  assert.match(cms, /functions\/v1\/public-cms/);
  assert.match(cms, /CMS_PUBLIC_READ_TIMEOUT_MS = 4_000/);
  assert.match(cms, /return EMPTY_CMS/);
  assert.doesNotMatch(cms, /service_role|SUPABASE_SECRET|sb_secret_/);
  assert.match(cmsQuery, /queryKey: \["storefront", "public-cms"\]/);
  assert.match(cmsQuery, /queryFn: fetchCmsSnapshot/);
});

test("homepage keeps CMS content dynamic while first hero pixels use stable aliases", async () => {
  assert.match(home, /useQuery\(cmsQueryOptions\(\)\)/);
  assert.doesNotMatch(home, /ensureQueryData\(cmsQueryOptions\(\)\)/);
  assert.match(home, /cmsHeroSlides=\{cms\.heroSlides\}/);
  assert.doesNotMatch(home, /heroCollection=\{heroCollection\}/);

  assert.match(criticalHero, /hero\/current-desktop/);
  assert.match(criticalHero, /hero\/current-mobile/);
  assert.match(home, /CRITICAL_HERO_DESKTOP_URL/);
  assert.match(home, /CRITICAL_HERO_MOBILE_URL/);

  assert.match(hero, /localizeHeroSlide/);
  assert.match(hero, /"supabase-cms"/);
  assert.match(hero, /"placeholder"/);
  assert.match(hero, /CRITICAL_HERO_DESKTOP_URL/);
  assert.match(hero, /CRITICAL_HERO_MOBILE_URL/);
  assert.doesNotMatch(
    hero,
    /shopify-collection|hero-product-fallback|homepageHeroCollections|SHOPIFY_CDN/i,
  );

  assert.match(syncHeroEdge, /Authorization/);
  assert.match(syncHeroEdge, /from\("cms_hero_slides"\)/);
  assert.match(syncHeroEdge, /storage\.upload|storage\.from|\.upload\(/);
  assert.match(syncHeroEdge, /upsert: true/);

  assert.match(hero, /<HeroScene/);
  const scene = await readFile(new URL("../src/components/HeroScene.tsx", import.meta.url), "utf8");
  assert.match(scene, /slide.mobile_image_url/);
  assert.match(scene, /slide.overlay_opacity/);
  assert.match(scene, /slide.open_in_new_tab/);
  assert.match(scene, /noopener noreferrer/);
  assert.match(scene, /normalizeHeroVisualConfig/);
  assert.match(page, /<HeroVisualEditor/);
});


test("hero changes are auditable", async () => {
  assert.match(page, /Save changes/);
  assert.match(data, /reorderDashboardHeroSlides/);
  assert.match(
    await readFile(
      new URL("../supabase/migrations/20260918224500_homepage_hero_cms_management.sql", import.meta.url),
      "utf8",
    ),
    /cms_audit_log|log_cms_action/,
  );
});

