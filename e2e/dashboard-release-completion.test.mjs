import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  model,
  categoryEditor,
  productEditor,
  productRoute,
  dashboardI18n,
  dashboardApp,
  focusHook,
  confirmDialog,
  orderDrawer,
  securityPage,
  migration,
] = await Promise.all([
  readFile(new URL("../src/lib/productSpecifications.ts", import.meta.url), "utf8"),
  readFile(
    new URL("../src/dashboard/components/categories/CategorySpecificationTemplateEditor.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/dashboard/components/products/ProductSpecificationEditor.tsx", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../src/routes/product.$handle.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/i18n.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8"),
  readFile(
    new URL("../src/dashboard/hooks/useDashboardDialogFocus.ts", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/dashboard/components/DashboardConfirmDialog.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/dashboard/components/orders/OrderQuickDrawer.tsx", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../src/dashboard/pages/SecurityPage.tsx", import.meta.url), "utf8"),
  readFile(
    new URL("../supabase/migrations/20260928141000_bilingual_specification_source_of_truth.sql", import.meta.url),
    "utf8",
  ),
]);

test("bilingual specification labels survive normalization and storefront mapping", () => {
  assert.match(model, /labelAr\?: string/);
  assert.match(model, /titleAr\?: string/);
  assert.match(model, /const titleAr = cleanText\(section\.titleAr/);
  assert.match(model, /const labelAr = cleanText\(field\.labelAr/);
  assert.match(model, /section\.titleAr \? \{ titleAr: section\.titleAr \}/);
  assert.match(model, /field\.labelAr \? \{ labelAr: field\.labelAr \}/);
  assert.match(productRoute, /language === "ar" \? group\.titleAr \|\| group\.title/);
  assert.match(productRoute, /language === "ar" \? row\.labelAr \|\| row\.label/);
});

test("category editor can safely edit both English and Arabic specification labels", () => {
  assert.match(categoryEditor, /Arabic specification section title/);
  assert.match(categoryEditor, /Arabic specification field label/);
  assert.match(categoryEditor, /titleAr: event\.target\.value \|\| undefined/);
  assert.match(categoryEditor, /labelAr: event\.target\.value \|\| undefined/);
  assert.match(productEditor, /section\.titleAr \|\| section\.title/);
  assert.match(productEditor, /field\.labelAr \|\| field\.label/);
});

test("required category and bilingual template state is reproducible from migrations", () => {
  assert.match(migration, /where not exists \([\s\S]*slug = 'headphones'/);
  assert.match(migration, /where not exists \([\s\S]*slug = 'bags'/);
  assert.match(migration, /'Headphones'/);
  assert.match(migration, /'Bags'/);
  assert.match(migration, /section_translations/);
  assert.match(migration, /field_translations/);
  assert.match(migration, /'Screen size','حجم الشاشة'/);
  assert.match(migration, /'Power & Connectivity','الطاقة والاتصال'/);
});

test("dashboard shell translates all current navigation and session controls", () => {
  for (const key of [
    "Sales",
    "Procurement",
    "Purchase Orders",
    "Suppliers",
    "Security",
    "Sign out",
    "No brand",
    "Uncategorized",
    "Loading products…",
  ]) {
    assert.ok(dashboardI18n.includes(`${key}:`) || dashboardI18n.includes(`"${key}":`), key);
  }
  assert.match(dashboardApp, /t\("Sign out"\)/);
  assert.match(dashboardApp, /t\("No brand"\)/);
  assert.match(dashboardApp, /t\("Loading products…"\)/);
});

test("critical custom dashboard dialogs trap and restore keyboard focus", () => {
  assert.match(focusHook, /FOCUSABLE_SELECTOR/);
  assert.match(focusHook, /event\.key !== "Tab"/);
  assert.match(focusHook, /previous\?\.isConnected/);
  assert.match(focusHook, /event\.key === "Escape"/);
  assert.match(confirmDialog, /useDashboardDialogFocus\(open, dialogRef/);
  assert.match(orderDrawer, /useDashboardDialogFocus\(Boolean\(orderId\), drawerRef, onClose\)/);
  assert.match(securityPage, /useDashboardDialogFocus\([\s\S]*passkeyDialogRef/);
});
