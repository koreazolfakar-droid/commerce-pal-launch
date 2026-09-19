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
const migration = await readFile(
  new URL("../supabase/migrations/20260918230000_harden_cms_hero_targets.sql", import.meta.url),
  "utf8",
);

test("dedicated hero dashboard route uses the real CMS page", () => {
  assert.match(app, /HeroBannersPageLive/);
  assert.match(
    app,
    /route === "\/dashboard\/homepage\/hero"[\s\S]+<HeroBannersPageLive \/>/,
  );
  assert.doesNotMatch(page, /@\/dashboard\/mock\//);
  assert.doesNotMatch(data, /@\/dashboard\/mock\//);
});

test("hero dashboard supports real Supabase CRUD, storage upload and media library", () => {
  assert.match(data, /from\("cms_hero_slides"\)/);
  assert.match(data, /rpc\("create_cms_hero_slide"/);
  assert.match(data, /rpc\("update_cms_hero_slide"/);
  assert.match(data, /rpc\("delete_cms_hero_slide"/);
  assert.match(data, /rpc\("reorder_cms_hero_slides"/);
  assert.match(data, /storage\.from\(HERO_BUCKET\)\.upload/);
  assert.match(data, /rpc\("register_cms_media_asset"/);
  assert.match(data, /from\("cms_media_assets"\)/);
  assert.match(page, /Desktop image/);
  assert.match(page, /Mobile image/);
  assert.match(page, /Hero media library/);
  assert.match(page, /Starts at/);
  assert.match(page, /Ends at/);
  assert.match(page, /Design & live preview/);
});

test("hero CTA uses validated product, collection or safe URL targets", () => {
  assert.match(migration, /validate_cms_hero_target/);
  assert.match(migration, /hero URL must be an internal path or HTTP\(S\) URL/);
  assert.match(migration, /p\.status = 'active'/);
  assert.match(migration, /c\.is_active = true/);
  assert.match(migration, /hero desktop image must use HTTPS/);
  assert.match(migration, /hero mobile image must use HTTPS/);
});

test("public CMS uses an edge gateway with resilient empty fallback", () => {
  assert.match(cms, /functions\/v1\/public-cms/);
  assert.match(cms, /CMS_PUBLIC_READ_TIMEOUT_MS = 4_000/);
  assert.match(cms, /return EMPTY_CMS/);
  assert.doesNotMatch(cms, /service_role|SUPABASE_SECRET|sb_secret_/);
  assert.match(cmsQuery, /queryKey: \["storefront", "public-cms"\]/);
  assert.match(cmsQuery, /queryFn: fetchCmsSnapshot/);
});

test("homepage hydrates CMS once and renders only the native CMS hero", () => {
  assert.match(home, /ensureQueryData\(cmsQueryOptions\(\)\)/);
  assert.match(home, /cmsHeroSlides=\{cms\.heroSlides\}/);
  assert.match(hero, /localizeHeroSlide/);
  assert.match(hero, /const usingCms = localizedCmsSlides\.length > 0/);
  assert.match(hero, /"supabase-cms"/);
  assert.doesNotMatch(hero, /shopify-collection|hero-product-fallback|SHOPIFY_CDN|shopifySlides/);
  assert.match(hero, /"placeholder"/);
  assert.match(hero, /cmsSlide\.mobile_image_url/);
  assert.match(hero, /cmsSlide\.overlay_opacity/);
  assert.match(hero, /cmsSlide\.open_in_new_tab/);
});

test("hero changes are auditable", () => {
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
