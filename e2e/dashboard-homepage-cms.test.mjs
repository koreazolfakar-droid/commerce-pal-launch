import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [builder, dataLayer, storefront, publicCms, categories, brands, trust] = await Promise.all([
  readFile(new URL("../src/dashboard/pages/HomepageBuilder.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/data/homepage.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/index.tsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/public-cms/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/HomeCategorySection.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/TopBrands.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/WhyShop.tsx", import.meta.url), "utf8"),
]);

test("homepage builder no longer persists production state in localStorage", () => {
  assert.doesNotMatch(builder, /spacecall-homepage-sections/);
  assert.doesNotMatch(builder, /spacecall-homepage-published/);
  assert.doesNotMatch(builder, /Published to the local Storefront Preview/);
  assert.match(builder, /loadDashboardHomepageWorkspace/);
  assert.match(builder, /saveDashboardHomepageSections/);
  assert.match(builder, /deleteDashboardHomepageSection/);
  assert.match(builder, /Synced to Supabase/);
});

test("homepage CMS data layer reads and writes cms_sections with existing RLS session", () => {
  assert.match(dataLayer, /from\("cms_sections"\)/);
  assert.match(dataLayer, /\.eq\("page_slug", "home"\)/);
  assert.match(dataLayer, /\.upsert\(payloads, \{ onConflict: "id" \}\)/);
  assert.match(dataLayer, /getDashboardRole\(\)/);
  assert.match(dataLayer, /builderType: section\.type/);
  assert.doesNotMatch(dataLayer, /service_role|SUPABASE_SERVICE_ROLE|sb_secret_/);
});

test("storefront orders and hides homepage blocks from public CMS sections", () => {
  assert.match(storefront, /homeSections = cms\.sections\.filter/);
  assert.match(storefront, /orderOf\("hero", 10\)/);
  assert.match(storefront, /orderOf\("brands", 20\)/);
  assert.match(storefront, /orderOf\("featured_products", 30\)/);
  assert.match(storefront, /orderOf\("trust", 40\)/);
  assert.match(storefront, /orderedBlocks = blocks/);
  assert.match(storefront, /\.sort\(\(a, b\) => a\.order - b\.order/);
  assert.match(storefront, /section\.is_visible && cmsSectionIsScheduled\(section\)/);
  assert.match(storefront, /<CmsBuilderSection section=\{section\} \/>/);
});

test("public CMS exposes only visible sections, navigation and brands", () => {
  assert.match(publicCms, /from\\("cms_sections"\\)[\\s\\S]*?\\.eq\\("is_visible", true\\)/);
  assert.match(publicCms, /from\\("cms_navigation_items"\\)[\\s\\S]*?\\.eq\\("is_visible", true\\)/);
  assert.match(publicCms, /from\\("cms_brands"\\)[\\s\\S]*?\\.eq\\("is_visible", true\\)/);
  assert.match(categories, /localizeSection\\(cmsSection, language\\)/);
  assert.match(brands, /localizeSection\\(cmsSection, language\\)/);
  assert.match(trust, /localizeSection\\(section, language\\)/);
});

test("core homepage sections cannot be accidentally deleted from the builder", () => {
  assert.match(builder, /CORE_HOMEPAGE_SECTION_KEYS/);
  assert.match(builder, /Core storefront sections cannot be deleted/);
});
