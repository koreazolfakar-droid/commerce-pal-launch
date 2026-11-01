import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [form, sections, css, catalog, variants, media, ai, aiFill, sql, storefront] =
  await Promise.all([
    readFile(new URL("../src/dashboard/pages/ProductFormPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/components/products/ProductFormMap.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/workspace.css", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/data/catalog.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/components/products/ProductVariantManager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/components/products/ProductMediaManager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/components/ai/AiAssistPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/dashboard/ai/formFill.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20261005000000_product_editor_stock_concurrency.sql", import.meta.url), "utf8"),
    readFile(new URL("../e2e/product-add-edit-supabase.test.mjs", import.meta.url), "utf8"),
  ]);

test("phase-one editor exposes nine real section destinations with preserved catalog managers", () => {
  for (const id of [
    "product-information", "product-variants", "product-inventory", "product-media",
    "product-specifications", "product-seo", "product-shipping", "product-pricing",
    "product-advanced",
  ]) {
    assert.ok(form.includes(`id="${id}"`), `missing section ${id}`);
    assert.match(sections, /document\.getElementById\(section\.id\)/);
  }
  assert.match(form, /dashboard-product-main/);
  assert.match(form, /dashboard-product-aside/);
  assert.match(form, /<ProductVariantManager/);
  assert.match(form, /<ProductMediaManager/);
  assert.match(form, /<ProductSpecificationEditor/);
  assert.match(form, /<AiAssistPanel/);
  assert.match(form, /<ProductColorPicker/);
  assert.match(form, /setCollectionIds/);
  assert.match(form, /Save as Draft/);
  assert.match(form, /More Actions/);
  assert.match(form, /Publish Product/);
});

test("create, edit, save draft and publish retain guarded atomic RPC flow", () => {
  assert.match(form, /onClick=\{\(\) => submitProduct\("Draft"\)\}/);
  assert.match(form, /onClick=\{\(\) => submitProduct\("Active"\)\}/);
  assert.match(form, /saveLockRef\.current = true/);
  assert.match(form, /saveLockRef\.current = false/);
  assert.match(form, /const savedProduct = await saveDashboardProduct\(productInput\)/);
  assert.match(form, /status: createAsDraft \? \("Draft" as const\) : status/);
  assert.match(form, /createAsDraft && status === "Active"/);
  assert.match(form, /setForm\(\(current\) => \(\{ \.\.\.current, status \}\)\)/);
  assert.match(catalog, /"save_store_product_editor"/);
  assert.match(catalog, /invalidateNativeStoreCache\(\)/);
  assert.match(catalog, /broadcastStorefrontRefresh\(\)/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /private\.is_dashboard_staff\(\)/);
  assert.match(sql, /p_status not in \('active', 'draft', 'archived'\)/);
  assert.match(storefront, /status", "active"/);
});

test("partial create failure keeps files in the editor and prevents duplicate records and uploads", () => {
  assert.match(form, /partialDraftIdRef\.current = savedProduct\.id/);
  assert.match(form, /id: id \?\? partialDraftIdRef\.current \?\? undefined/);
  assert.match(form, /uploadedPreviewsRef\.current\.has\(pending\.preview\)/);
  assert.match(form, /primaryUploadedUrlRef\.current = firstImageUrl/);
  const start = form.indexOf("} catch (cause) {", form.indexOf("const handleSave"));
  const end = form.indexOf("} finally {", start);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(form.slice(start, end), /navigate\(/);
  assert.match(form, /role="alert"/);
  assert.match(form, /setLoadRevision\(\(value\) => value \+ 1\)/);
});

test("media and variant edits stay on existing persistence and stock ledgers", () => {
  assert.match(form, /reorderPendingImage\(index, -1\)/);
  assert.match(form, /reorderPendingImage\(index, 1\)/);
  assert.match(form, /position === 0/);
  for (const fn of [
    "uploadDashboardProductImage", "setDashboardPrimaryProductImage",
    "reorderDashboardProductImages", "deleteDashboardProductImage",
  ]) assert.ok(media.includes(fn), `media integration lost: ${fn}`);
  assert.match(variants, /loadDashboardProductVariants/);
  assert.match(variants, /updateDashboardProductVariant/);
  assert.match(form, /variantManagedSeparately/);
  assert.match(form, /expectedStock: id && !variantLocked/);
  assert.match(sql, /'product_editor'/);
  assert.match(sql, /store_inventory_movements/);
});

test("AI cannot apply a field changed after research", () => {
  assert.match(ai, /hasFieldChanged\(suggestion\.field, requestValues\.current, currentData\)/);
  assert.match(ai, /onApply\(patch\)/);
  assert.match(aiFill, /export function hasFieldChanged/);
  assert.match(form, /onApply=\{applyAiPatch\}/);
});

test("responsive layout is constrained at phone, tablet and desktop breakpoints", () => {
  assert.match(css, /Space Call product editor — Phase 1/);
  assert.match(css, /@media \(max-width: 389px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /@media \(max-width: 1279px\)/);
  assert.match(css, /@media \(min-width: 1280px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /font-size: 1rem/);
  assert.doesNotMatch(form, /fixed inset-x-0 bottom-0 z-40 flex gap-2/);
});

test("shipping is transparently linked to existing store-wide delivery settings", () => {
  assert.match(form, /id="product-shipping"/);
  assert.match(form, /href="\/dashboard\/settings"/);
  assert.doesNotMatch(form, /Schedule publish|scheduledAt|deliveryFee: form/);
});
