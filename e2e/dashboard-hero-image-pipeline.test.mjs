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
const heroVisualEditor = await readFile(
  new URL("../src/dashboard/components/HeroVisualEditor.tsx", import.meta.url),
  "utf8",
);
const heroScene = await readFile(
  new URL("../src/components/HeroScene.tsx", import.meta.url),
  "utf8",
);
const heroSceneCss = await readFile(
  new URL("../src/components/hero-scene.css", import.meta.url),
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

test("hero dashboard media preview matches the 16:9 storefront shape on both devices", () => {
  assert.match(heroPage, /16:9 landscape/);
  assert.match(heroPage, /aspect-\[16\/9\]/);
  assert.doesNotMatch(heroPage, /aspect-\[9\/16\]/);
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


test("Hero page preflights dashboard verification before loading protected CMS data", () => {
  assert.match(heroData, /export async function ensureDashboardHeroSessionReady/);
  assert.match(heroPage, /await ensureDashboardHeroSessionReady\(\)/);
  const preflight = heroPage.indexOf("await ensureDashboardHeroSessionReady()");
  const loadSlides = heroPage.indexOf("listDashboardHeroSlides()");
  assert.ok(preflight >= 0 && loadSlides >= 0 && preflight < loadSlides);
});

test("compression preview cannot confirm before a valid result and explains the real upload boundary", () => {
  assert.match(
    imageOptimizationPreview,
    /Nothing is sent to Storage until you confirm the upload/,
  );
  assert.match(
    imageOptimizationPreview,
    /disabled=\{busy \|\| previewing \|\| Boolean\(error\) \|\| results\.length === 0\}/,
  );
});


test("discarding edits resets even when the user reselects the same slide", () => {
  assert.match(heroPage, /setSelectedId\(slide\.id\);\s*setForm\(fromSlide\(slide\)\)/);
});

test("Hero editor does not create a completely empty slide", () => {
  assert.match(heroPage, /disabled=\{busy \|\| hasPendingHeroImages \|\| !formDirty\}/);
});


test("Hero page exposes one clear create-or-edit workspace mode", () => {
  assert.match(heroPage, /const editorMode = selected \? "edit" : "create"/);
  assert.match(heroPage, /editorMode === "edit" \? "Editing slide" : "New slide"/);
  assert.match(heroPage, /editorMode === "edit" \? "Save changes" : "Create slide"/);
  assert.match(heroPage, />Content</);
  assert.doesNotMatch(
    heroPage,
    /<div className="text-\[13px\] font-bold text-\[#14203a\]">\{selected \? "Edit slide" : "Create slide"\}<\/div>/,
  );
});

test("Hero slide selector is compact on mobile and remains a desktop sidebar", () => {
  assert.match(heroPage, /flex gap-2 overflow-x-auto p-3 xl:block/);
  assert.match(heroPage, /min-w-\[230px\][\s\S]*xl:min-w-0/);
});


test("Hero editor groups secondary controls into compact accordion sections", () => {
  for (const label of [
    "Content",
    "Media",
    "Link & CTA",
    "Publishing & schedule",
    "Advanced appearance",
  ]) {
    assert.match(heroPage, new RegExp(`>${label.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")}<\\/div>`));
  }
  assert.match(heroPage, /group-open:rotate-180/);
  assert.match(heroPage, /\[&::-webkit-details-marker\]:hidden/);
  assert.doesNotMatch(heroPage, /Advanced appearance \/ إعدادات المظهر/);
});

test("Hero live preview stays outside Advanced appearance controls", () => {
  const preview = heroPage.indexOf("Design & live preview");
  const visualEditor = heroPage.indexOf("<HeroVisualEditor");
  const advanced = heroPage.indexOf(">Advanced appearance</div>");
  assert.ok(preview >= 0 && visualEditor > preview && advanced > visualEditor);
});

test("pending Hero media keeps its accordion expanded until upload or cancel", () => {
  assert.match(heroPage, /<details open=\{hasPendingHeroImages \|\| undefined\}[^>]*>/);
  assert.match(heroPage, /Upload pending/);
});


test("first desktop Hero artwork enables publishing without overriding later draft choices", () => {
  assert.match(
    heroPage,
    /imageUrl: asset\.url,[\s\S]{0,260}isPublished: current\.imageUrl\.trim\(\) \? current\.isPublished : true/,
  );
});


test("Hero crop controls are device-specific, touch friendly and reflected by storefront rendering", () => {
  assert.match(heroVisualEditor, /mode === "mobile" \? "mobileFocalPoint" : "focalPoint"/);
  assert.match(heroVisualEditor, /Image crop horizontal/);
  assert.match(heroVisualEditor, /Image crop vertical/);
  assert.match(heroVisualEditor, /Reset image crop/);
  assert.match(heroVisualEditor, /Adjust image by touch/);
  assert.match(heroVisualEditor, /absolute inset-0 z-20 touch-none cursor-crosshair/);
  assert.doesNotMatch(heroVisualEditor, /Touch crop focus/);
  assert.match(heroVisualEditor, /setPointerCapture\(event\.pointerId\)/);
  assert.match(heroVisualEditor, /max-w-\[360px\]/);
  assert.match(heroScene, /config\.mobileFocalPoint \?\? desktopFocus/);
  assert.match(heroScene, /--hero-mobile-focus-x/);
  assert.match(heroScene, /--hero-mobile-focus-y/);
  assert.doesNotMatch(heroScene, /hero-scene-backdrop/);
  assert.match(heroSceneCss, /aspect-ratio: 16 \/ 9/);
  assert.match(heroSceneCss, /object-position: var\(--hero-mobile-focus-x/);
  assert.match(heroSceneCss, /transform: scale\(1\.06\)/);
  assert.match(heroSceneCss, /transform-origin: var\(--hero-mobile-focus-x/);
});


test("mobile-first hero uploads always produce a storefront-readable primary image", () => {
  assert.match(
    heroPage,
    /imageUrl: currentForm\.imageUrl\.trim\(\) \? currentForm\.imageUrl : asset\.url/,
  );
  assert.match(heroPage, /const currentForm = formRef\.current/);
  assert.match(heroPage, /selectedId !== null/);
  assert.match(heroPage, /selected !== null/);
  assert.match(heroPage, /JSON\.stringify\(currentForm\) === JSON\.stringify\(fromSlide\(selected\)\)/);
  assert.match(heroPage, /updateDashboardHeroSlide\(selectedId, nextForm\)/);
  assert.match(
    heroPage,
    /imageUrl: current\.imageUrl\.trim\(\) \? current\.imageUrl : asset\.url/,
  );
});

test("hero dashboard keeps phone controls compact while preserving all actions", () => {
  assert.match(heroPage, /overflow-x-auto pb-1/);
  assert.match(heroPage, /order-first col-span-2/);
  assert.match(heroPage, /grid grid-cols-2 gap-2 sm:flex sm:justify-between/);
  assert.match(heroPage, /group order-2 overflow-hidden[^"]*xl:order-4/);
  assert.match(heroPage, /order-3 rounded-xl[^"]*xl:order-2/);
});
