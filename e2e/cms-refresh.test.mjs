import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cms = fs.readFileSync("src/lib/cms.ts", "utf8");
const cmsQuery = fs.readFileSync("src/lib/cmsQuery.ts", "utf8");
const publicClient = fs.readFileSync("src/integrations/supabase/publicClient.ts", "utf8");
const publicCmsEdge = fs.readFileSync("supabase/functions/public-cms/index.ts", "utf8");
const criticalHero = fs.readFileSync("src/lib/criticalHero.ts", "utf8");
const syncHeroEdge = fs.readFileSync("supabase/functions/sync-current-hero/index.ts", "utf8");

test("public storefront CMS reads only through the resilient public edge gateway", () => {
  assert.match(cms, /functions\/v1\/public-cms/);
  assert.match(cms, /CMS_PUBLIC_READ_TIMEOUT_MS = 4_000/);
  assert.match(cms, /AbortController/);
  assert.match(cms, /return EMPTY_CMS/);
  assert.match(cms, /normalizeCmsSnapshot/);
  assert.doesNotMatch(cms, /service_role|SUPABASE_SECRET|sb_secret_/);
  assert.doesNotMatch(cms, /localStorage|CMS_BROWSER_FALLBACK_KEY/);
  assert.match(publicClient, /export function getPublicSupabaseConfig/);
});

test("storefront CMS query refreshes safely without pinning stale dashboard content forever", () => {
  assert.match(cmsQuery, /queryKey: \["storefront", "public-cms"\]/);
  assert.match(cmsQuery, /queryFn: fetchCmsSnapshot/);
  assert.match(cmsQuery, /placeholderData: EMPTY_CMS/);
  assert.match(cmsQuery, /staleTime: 60_000/);
  assert.match(cmsQuery, /gcTime: 5 \* 60_000/);
  assert.match(cmsQuery, /retry: 1/);
  assert.doesNotMatch(cmsQuery, /dashboard-disconnected/);
  assert.doesNotMatch(cmsQuery, /Number\.POSITIVE_INFINITY/);
});


test("public CMS remains cached while critical hero aliases avoid startup CMS reads", () => {
  assert.match(publicCmsEdge, /Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300"/);
  assert.doesNotMatch(publicCmsEdge, /Cache-Control": "no-store/);

  assert.match(criticalHero, /hero\/current-desktop/);
  assert.match(criticalHero, /hero\/current-mobile/);
  assert.match(syncHeroEdge, /DESKTOP_TARGET = "hero\/current-desktop"/);
  assert.match(syncHeroEdge, /MOBILE_TARGET = "hero\/current-mobile"/);
  assert.match(syncHeroEdge, /upsert: true/);
  assert.match(syncHeroEdge, /cacheControl: "60"/);
});
