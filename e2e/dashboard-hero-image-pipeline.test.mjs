import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const heroData = await readFile(
  new URL("../src/dashboard/data/hero.ts", import.meta.url),
  "utf8",
);
const heroPage = await readFile(
  new URL("../src/dashboard/pages/HeroBannersPage.tsx", import.meta.url),
  "utf8",
);
const imageOptimizationPreview = await readFile(
  new URL("../src/dashboard/components/ImageOptimizationPreview.tsx", import.meta.url),
  "utf8",
);

test("hero raster images use the shared real WebP conversion pipeline", () => {
  assert.match(heroData, /WEBP_CONVERTIBLE_HERO_MIME_TYPES/);
  assert.match(heroData, /const targetResolution: ProductImageResolution = target === "mobile" \? "1080" : "1920"/);
  assert.match(heroData, /const conversion = await convertProductImageToWebp\(file, targetResolution\)/);
  assert.match(heroData, /storedFile = conversion\.file/);
  assert.match(heroData, /extension = "webp"/);
  assert.match(heroData, /contentType: storedFile\.type/);
  assert.match(heroData, /p_mime_type: storedFile\.type/);
  assert.doesNotMatch(heroData, /upload\(objectPath, file, \{/);
});

test("hero conversion happens before any storage upload", () => {
  const conversion = heroData.indexOf("const conversion = await convertProductImageToWebp(file, targetResolution)");
  const upload = heroData.indexOf("supabase.storage.from(HERO_BUCKET).upload");
  assert.ok(conversion >= 0, "conversion invocation is missing");
  assert.ok(upload >= 0, "storage upload is missing");
  assert.ok(conversion < upload, "hero file must be converted before it is uploaded");
});

test("hero preserves animation/vector formats instead of falsely labeling them WebP", () => {
  assert.match(heroData, /GIF preserved to keep animation/);
  assert.match(heroData, /SVG preserved to keep vector quality/);
  assert.match(heroData, /mode: "passthrough"/);
});

test("hero dashboard exposes real before and after optimization metadata", () => {
  assert.match(heroPage, /Real WebP optimization complete/);
  assert.match(heroPage, />Before</);
  assert.match(heroPage, />After</);
  assert.match(heroPage, /formatBytes\(optimization\.source\.bytes\)/);
  assert.match(heroPage, /formatBytes\(optimization\.output\.bytes\)/);
  assert.match(heroPage, /max \{isDesktop \? "1920" : "1080"\}px/);
});


test("hero upload revalidates dashboard MFA or passkey before Storage and redirects stale sessions", () => {
  assert.match(heroData, /getDashboardMfaStatus/);
  assert.match(heroData, /requireFreshHeroWriteVerification/);
  assert.match(heroData, /DashboardHeroVerificationRequiredError/);
  const verification = heroData.indexOf("await requireFreshHeroWriteVerification()");
  const conversion = heroData.indexOf("const conversion = await convertProductImageToWebp(file, targetResolution)");
  const upload = heroData.indexOf("supabase.storage.from(HERO_BUCKET).upload");
  assert.ok(verification >= 0, "fresh dashboard verification check is missing");
  assert.ok(verification < conversion, "verification must happen before local hero conversion");
  assert.ok(verification < upload, "verification must happen before Storage upload");
  assert.match(heroPage, /cause instanceof DashboardHeroVerificationRequiredError/);
  assert.match(heroPage, /window\.location\.assign\("\/dashboard\/login\?mode=mfa"\)/);
});


test("pending hero image stays visible and upload actions live inside the compression preview", () => {
  assert.match(heroPage, /pendingPreviewUrls/);
  assert.match(heroPage, /URL\.createObjectURL\(file\)/);
  assert.match(heroPage, /const displayUrl = pendingPreviewUrl \|\| url/);
  assert.match(heroPage, /Ready to upload/);
  assert.match(heroPage, /confirmLabel=\{isDesktop \? "Upload desktop hero" : "Upload mobile hero"\}/);
  assert.match(heroPage, /onConfirm=\{\(\) => void upload\(pendingHeroImages\[target\], target\)\}/);
  assert.match(imageOptimizationPreview, /onConfirm\?: \(\) => void/);
  assert.match(imageOptimizationPreview, /busy \? "Uploading…" : confirmLabel/);
  assert.match(imageOptimizationPreview, /w-full.*sm:w-auto/);
});


test("hero pending image state is protected across save, navigation and upload failures", () => {
  assert.match(heroPage, /const hasPendingHeroImages = Boolean\(pendingHeroImages\.desktop \|\| pendingHeroImages\.mobile\)/);
  assert.match(heroPage, /const dirty = formDirty \|\| hasPendingHeroImages/);
  assert.match(heroPage, /Upload or cancel the pending Hero image before saving the slide/);
  assert.match(heroPage, /let completed = false/);
  assert.match(heroPage, /if \(completed\) clearPendingHeroImages\(target\)/);
  assert.doesNotMatch(
    heroPage,
    /finally \{[\s\S]{0,500}setPendingHeroImages\(\(current\) => \{[\s\S]{0,200}delete next\[target\]/,
  );
});

test("pending Hero media is shown in the live editor without persisting blob URLs", () => {
  assert.match(heroPage, /const previewForm = useMemo<DashboardHeroInput>/);
  assert.match(heroPage, /imageUrl: pendingPreviewUrls\.desktop \|\| form\.imageUrl/);
  assert.match(heroPage, /mobileImageUrl: pendingPreviewUrls\.mobile \|\| form\.mobileImageUrl/);
  assert.match(heroPage, /form=\{previewForm\}/);
  assert.match(heroPage, /imageUrl: current\.imageUrl/);
  assert.match(heroPage, /mobileImageUrl: current\.mobileImageUrl/);
});

test("hero page protects mobile actions and destructive navigation while work is pending", () => {
  assert.match(heroPage, /Refresh and discard unsaved Hero changes/);
  assert.match(heroPage, /Save or discard unsaved Hero changes before reordering slides/);
  assert.match(heroPage, /disabled=\{busy \|\| dirty\}/);
  assert.match(heroPage, /bottom-\[calc\(76px\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(heroPage, /Hero image ready to upload/);
});

test("hero CTA validation mirrors storefront safe-link behavior", () => {
  assert.match(heroPage, /function isSafeHeroCustomUrl/);
  assert.match(heroPage, /Primary custom URL must be an internal \/path or an HTTP\(S\) URL/);
  assert.match(heroPage, /Secondary custom URL must be an internal \/path or an HTTP\(S\) URL/);
  assert.match(heroPage, /disabled=\{option\.status !== "active"\}/);
});

test("all Hero mutations revalidate dashboard write assurance", () => {
  assert.match(heroData, /async function requireFreshHeroWriteVerification/);
  for (const fn of [
    "createDashboardHeroSlide",
    "updateDashboardHeroSlide",
    "deleteDashboardHeroSlide",
    "reorderDashboardHeroSlides",
    "uploadDashboardHeroImage",
  ]) {
    const start = heroData.indexOf(`export async function ${fn}`);
    assert.ok(start >= 0, `${fn} is missing`);
    const body = heroData.slice(start, start + 1400);
    assert.match(body, /await requireFreshHeroWriteVerification\(\)/);
  }
});

test("Hero RPC payload normalizes text, visual config and overlay bounds", () => {
  assert.match(heroData, /function cleanText\(value: string\)/);
  assert.match(heroData, /p_title_en: cleanText\(input\.titleEn\)/);
  assert.match(heroData, /p_target_value: input\.targetType === "none" \? null : cleanText\(input\.targetValue\)/);
  assert.match(heroData, /p_overlay_opacity: Math\.max\(0, Math\.min\(90, input\.overlayOpacity\)\)/);
  assert.match(heroData, /p_visual_config: normalizeHeroVisualConfig\(input\.visualConfig\)/);
});
