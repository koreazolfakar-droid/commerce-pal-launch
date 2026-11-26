import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readDashboardShellSource } from "./helpers/dashboard-shell-source.mjs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("storefront visual system keeps one canonical shell and radius language", async () => {
  const [consistency, overhaul, layout, styles] = await Promise.all([
    source("src/design-consistency.css"),
    source("src/ui-overhaul.css"),
    source("src/components/StoreLayout.tsx"),
    source("src/styles.css"),
  ]);

  assert.match(consistency, /--sc-shell-max:\s*80rem/);
  assert.match(consistency, /--sc-card-radius:\s*0\.9375rem/);
  assert.match(consistency, /--sc-control-radius:\s*0\.75rem/);
  assert.match(overhaul, /--ui-shell-max:\s*var\(--sc-shell-max, 80rem\)/);
  assert.match(overhaul, /--ui-radius-card:\s*var\(--sc-card-radius, 0\.9375rem\)/);
  assert.match(overhaul, /--ui-radius-control:\s*var\(--sc-control-radius, 0\.75rem\)/);
  assert.doesNotMatch(overhaul, /--ui-shell-max:\s*84rem/);

  const overhaulImport = layout.indexOf('import "../ui-overhaul.css"');
  const consistencyImport = layout.indexOf('import "../design-consistency.css"');
  assert.ok(overhaulImport >= 0, "StoreLayout must import ui-overhaul.css");
  assert.ok(consistencyImport > overhaulImport, "canonical consistency layer must load last");

  assert.match(styles, /--radius-md:\s*0\.75rem/);
  assert.match(styles, /--radius-lg:\s*1rem/);
  assert.match(styles, /--radius-2xl:\s*1\.25rem/);
  assert.match(styles, /--radius-3xl:\s*1\.5rem/);
  assert.match(styles, /--dashboard-card-radius:\s*1rem/);
  assert.match(styles, /--dashboard-control-radius:\s*0\.75rem/);
  assert.match(
    styles,
    /\.dashboard-theme-scope :where\(\[class~="rounded-2xl"\], \[class~="rounded-3xl"\]\)/,
  );
});

test("responsive spacing and reduced-motion rules keep correct cascade boundaries", async () => {
  const consistency = await source("src/design-consistency.css");

  assert.match(
    consistency,
    /@media \(min-width: 640px\) and \(max-width: 1023px\) \{[\s\S]*?gap: var\(--sc-section-gap-tablet\)/,
  );
  assert.match(
    consistency,
    /@media \(min-width: 1024px\) \{[\s\S]*?gap: var\(--sc-section-gap-desktop\)/,
  );

  const restoreIndex = consistency.indexOf("transition-duration: 140ms !important");
  const reduceIndex = consistency.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.ok(
    restoreIndex >= 0 && reduceIndex > restoreIndex,
    "reduced-motion override must load after control transitions",
  );
});

test("storefront polish avoids restoring decorative page gradients", async () => {
  const overhaul = await source("src/ui-overhaul.css");
  assert.match(overhaul, /\.store-layout\s*\{\s*background:\s*var\(--color-background\);\s*\}/);
  assert.doesNotMatch(
    overhaul,
    /\.store-layout\s*\{[\s\S]{0,240}radial-gradient/,
    "storefront page background should stay clean rather than decorative",
  );
});

test("shared RTL primitives use logical spacing and semantic dark-mode text", async () => {
  const [dashboard, select, table, pagination] = await Promise.all([
    readDashboardShellSource(),
    source("src/components/ui/select.tsx"),
    source("src/components/ui/table.tsx"),
    source("src/components/ui/pagination.tsx"),
  ]);

  assert.doesNotMatch(dashboard, /absolute left-3\.5 top-1\/2/);
  assert.doesNotMatch(dashboard, /bg-card pl-10 pr-14/);
  assert.doesNotMatch(dashboard, /text-slate-800/);
  const commands = await source("src/dashboard/components/layout/DashboardCommandCenter.tsx");
  assert.match(commands, /absolute start-3\.5 top-4/);
  assert.match(commands, /pe-10 ps-10/);
  assert.doesNotMatch(commands, /absolute left-/);

  assert.match(select, /min-h-9 w-full/);
  assert.match(select, /py-1\.5 ps-2\.5 pe-8/);
  assert.match(select, /absolute end-2/);
  assert.match(table, /text-start/);
  assert.match(table, /\]:pe-0/);
  assert.match(pagination, /ps-2\.5/);
  assert.match(pagination, /pe-2\.5/);
  assert.match(pagination, /rtl:rotate-180/);
});

test("product actions stay aligned without overlapping compact card content", async () => {
  const [compact, consistency] = await Promise.all([
    source("src/components/CompactProductCard.tsx"),
    source("src/design-consistency.css"),
  ]);

  assert.doesNotMatch(compact, /absolute -bottom-2 end-0\.5/);
  assert.match(compact, /market-product-footer/);
  assert.match(compact, /product-action-button/);
  assert.match(compact, /replacementAddButtonRef/);
  assert.match(compact, /handleDecrement/);
  assert.match(
    compact,
    /requestAnimationFrame\(\(\) => replacementAddButtonRef\.current\?\.focus\(\)\)/,
    "quantity controls should restore focus to the replacement add button",
  );
  assert.match(
    compact,
    /product-card-title line-clamp-2 min-h-\[2\.15rem\]/,
    "market cards should reserve a stable two-line title area",
  );

  assert.match(consistency, /\.store-layout \.product-action-button \{/);
  assert.match(consistency, /width: 2\.25rem;/);
  assert.match(consistency, /height: 2\.25rem;/);
  assert.match(consistency, /\.market-product-card \.market-product-action svg\.lucide/);
  assert.match(consistency, /grid-template-rows: 1rem 2\.2rem 1rem 1\.1rem 2\.375rem/);
  assert.match(
    consistency,
    /\.homepage-product-card \.product-card-title \{[\s\S]*?min-height: 2\.15rem/,
  );
  assert.match(
    consistency,
    /\.market-product-card \.market-product-action \{[\s\S]*?width: 2\.375rem/,
  );
  assert.match(consistency, /\.market-product-quantity button \{[\s\S]*?min-width: 2rem/);
});

test("dashboard command navigation keeps five reachable mobile actions and contextual search", async () => {
  const [dashboard, workspace, routes, translations] = await Promise.all([
    readDashboardShellSource(),
    source("src/dashboard/workspace.css"),
    source("src/dashboard/config/routes.tsx"),
    source("src/dashboard/uiTranslations.ts"),
  ]);

  assert.match(dashboard, /<MobileBottomNav onMore=/);
  assert.match(dashboard, /dashboard-mobile-nav-grid grid min-h-\[68px\] grid-cols-5/);
  assert.match(dashboard, /dashboard-mobile-nav-create/);
  assert.match(dashboard, /dashboard-sidebar-new-product/);
  assert.match(dashboard, /dashboard-sidebar-store/);
  assert.match(dashboard, /dashboard-header-search/);
  assert.match(dashboard, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(dashboard, /useDashboardDialogFocus\(mobileOpen, sidebarRef/);
  assert.match(workspace, /Space Call Command — navigation system/);
  assert.match(workspace, /\.dark \.dashboard-theme-scope \{/);
  assert.match(workspace, /\[dir="rtl"\]/);
  assert.match(workspace, /prefers-reduced-motion: reduce/);
  assert.match(routes, /label: "Overview"/);
  assert.match(routes, /label: "Sales & customers"/);
  assert.match(routes, /label: "Stock & purchasing"/);
  assert.match(routes, /label: "Administration"/);
  assert.match(translations, /Overview: "نظرة عامة"/);
  assert.match(translations, /"Sales & customers": "المبيعات والعملاء"/);
  assert.match(translations, /"Stock & purchasing": "المخزون والمشتريات"/);
  assert.match(translations, /Administration: "الإدارة والإعدادات"/);
});

test("shared controls expose one compact sizing and focus language", async () => {
  const [button, input, textarea, select] = await Promise.all([
    source("src/components/ui/button.tsx"),
    source("src/components/ui/input.tsx"),
    source("src/components/ui/textarea.tsx"),
    source("src/components/ui/select.tsx"),
  ]);

  assert.match(button, /compact:\s*"h-8 px-2\.5 text-xs"/);
  assert.match(button, /"icon-sm":\s*"h-9 w-9 p-0"/);
  assert.match(button, /mobileCta:\s*"h-11 w-full px-4 text-sm"/);
  assert.match(button, /duration-150/);
  assert.match(input, /h-10 w-full min-w-0/);
  assert.match(input, /focus-visible:ring-2 focus-visible:ring-ring\/20/);
  assert.match(textarea, /min-h-24/);
  assert.match(select, /h-10 w-full min-w-0/);
  assert.match(select, /min-h-9 w-full/);
});

test("semantic product and dashboard hooks replace fragile visual selectors", async () => {
  const [product, compact, overhaul, consistency, dashboard, styles] = await Promise.all([
    source("src/components/ProductCard.tsx"),
    source("src/components/CompactProductCard.tsx"),
    source("src/ui-overhaul.css"),
    source("src/design-consistency.css"),
    readDashboardShellSource(),
    source("src/styles.css"),
  ]);

  for (const file of [product, compact]) {
    assert.match(file, /product-card-primary-action/);
    assert.match(file, /product-card-title/);
  }
  assert.match(product, /product-card-secondary-action/);
  assert.match(compact, /product-card-secondary-action/);

  assert.doesNotMatch(overhaul, /article\.card-lift\[class\*="bg-card"\]/);
  assert.match(consistency, /\.store-layout \.product-card-title \{/);
  assert.match(consistency, /--sc-control-height-lg:\s*2\.75rem/);

  assert.match(dashboard, /dashboard-header/);
  assert.match(dashboard, /dashboard-icon-button/);
  assert.match(dashboard, /dashboard-sidebar-action/);
  assert.match(dashboard, /dashboard-mobile-nav/);
  assert.match(styles, /--dashboard-touch:\s*2\.75rem/);
  assert.match(styles, /\.dashboard-theme-scope \.dashboard-icon-button \{/);
  assert.match(styles, /text-\[#14203a\]/);
  assert.match(styles, /bg-\[#f5f6ff\]/);
  assert.match(styles, /border-\[#dfe2ff\]/);
});


test("dashboard design refresh stays scoped, theme-aware and responsive", async () => {
  const [workspace, app, pageTitle, modal, editor, products] = await Promise.all([
    source("src/dashboard/workspace.css"),
    readDashboardShellSource(),
    source("src/dashboard/components/layout/PageTitle.tsx"),
    source("src/dashboard/components/DashboardModal.tsx"),
    source("src/dashboard/pages/ProductFormPage.tsx"),
    source("src/dashboard/pages/ProductsPage.tsx"),
  ]);

  assert.match(workspace, /2026 dashboard visual refresh/);
  assert.match(workspace, /\.dashboard-theme-scope \.dashboard-sidebar-action\[aria-current="page"\]/);
  assert.match(workspace, /\[dir="rtl"\] \.dashboard-theme-scope \.dashboard-sidebar-action/);
  assert.match(workspace, /\.dark \.dashboard-theme-scope \{/);
  assert.match(workspace, /@media \(max-width: 767px\)/);
  assert.match(workspace, /@media \(prefers-contrast: more\)/);
  assert.match(app, /dashboard-mobile-nav/);
  assert.match(pageTitle, /dashboard-page-title/);
  assert.match(pageTitle, /text-foreground/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /bg-card/);
  assert.match(editor, /dashboard-editor-grid/);
  assert.match(editor, /dashboard-editor-panel/);
  assert.match(editor, /renderCreateActions\("header"\)/);
  assert.match(products, /dashboard-metric-card/);
  assert.match(products, /dashboard-catalog-panel/);
  assert.match(products, /dashboard-filter-panel/);
});
