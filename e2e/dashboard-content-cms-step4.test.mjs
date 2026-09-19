import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [
  app,
  navigationData,
  navigationPage,
  mediaData,
  mediaPage,
  seoData,
  seoPage,
  homepageBuilder,
  mediaPicker,
  bottomNav,
  storeLayout,
  publicCms,
] = await Promise.all([
  readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/navigation.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/NavigationPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/media.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/MediaLibraryPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/seo.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/SeoPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/pages/HomepageBuilder.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/components/DashboardMediaPicker.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/BottomNav.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/StoreLayout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/public-cms/index.ts", import.meta.url), "utf8"),
]);

test("step 4 dashboard routes no longer fall through to GenericPage", () => {
  assert.match(app, /route === "\/dashboard\/navigation"\) content = <NavigationPage \/>/);
  assert.match(app, /route === "\/dashboard\/media"\) content = <MediaLibraryPage \/>/);
  assert.match(app, /route === "\/dashboard\/seo"\) content = <SeoPage \/>/);
});

test("navigation manager is Supabase-backed and storefront consumes it", () => {
  assert.match(navigationData, /from\("cms_navigation_items"\)/);
  assert.match(navigationData, /createDashboardNavigationItem/);
  assert.match(navigationData, /updateDashboardNavigationItem/);
  assert.match(navigationData, /deleteDashboardNavigationItem/);
  assert.match(navigationPage, /loadDashboardNavigationWorkspace/);
  assert.match(publicCms, /from\("cms_navigation_items"\)/);
  assert.match(storeLayout, /<CmsNavigationStrip area="header"/);
  assert.match(storeLayout, /<CmsNavigationStrip area="mobile_menu"/);
  assert.match(storeLayout, /<CmsNavigationStrip area="footer"/);
  assert.match(storeLayout, /<BottomNav \/>/);
  assert.match(bottomNav, /localizeNavigationItem\(item, language\)/);
});

test("media library uses protected cms-media storage and homepage builder uses it", () => {
  assert.match(mediaData, /BUCKET = "cms-media"/);
  assert.match(mediaData, /from\("cms_media_assets"\)/);
  assert.match(mediaData, /storage\.from\(BUCKET\)\.upload/);
  assert.match(mediaData, /register_cms_media_asset/);
  assert.match(mediaData, /convertProductImageToWebp\(file, "1920"\)/);
  assert.match(mediaPage, /loadDashboardMediaWorkspace/);
  assert.match(mediaPicker, /uploadDashboardMediaImage/);
  assert.match(homepageBuilder, /DashboardMediaPicker/);
  assert.doesNotMatch(homepageBuilder, /const media = \["https:\/\/images\.unsplash\.com/);
});

test("SEO manager persists cms_seo_pages and public CMS exposes only public SEO rows", () => {
  assert.match(seoData, /from\("cms_seo_pages"\)/);
  assert.match(seoData, /\.upsert\(payload, \{ onConflict: "page_slug" \}\)/);
  assert.match(seoPage, /loadDashboardSeoWorkspace/);
  assert.match(publicCms, /from\("cms_seo_pages"\).*eq\("is_public", true\)/s);
});

test("step 4 frontend data layers do not expose privileged Supabase secrets", () => {
  for (const source of [navigationData, mediaData, seoData]) {
    assert.doesNotMatch(source, /service_role|SUPABASE_SERVICE_ROLE|sb_secret_/);
  }
});
