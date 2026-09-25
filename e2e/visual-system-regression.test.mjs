import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
    source("src/dashboard/App.tsx"),
    source("src/components/ui/select.tsx"),
    source("src/components/ui/table.tsx"),
    source("src/components/ui/pagination.tsx"),
  ]);

  assert.doesNotMatch(dashboard, /absolute left-3\.5 top-1\/2/);
  assert.doesNotMatch(dashboard, /bg-card pl-10 pr-14/);
  assert.doesNotMatch(dashboard, /text-slate-800/);
  assert.match(dashboard, /absolute start-3\.5 top-1\/2/);
  assert.match(dashboard, /bg-card ps-10 pe-14/);

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
});

test("dashboard shared chrome stays compact without changing navigation structure", async () => {
  const dashboard = await source("src/dashboard/App.tsx");

  assert.match(dashboard, /backdrop-blur-md/);
  assert.match(dashboard, /grid min-h-\[64px\] grid-cols-5/);
  assert.match(dashboard, /rounded-lg \$\{active \? "bg-accent" : ""\}/);
  assert.match(dashboard, /shadow-\[0_-4px_18px_rgba\(15,23,42,\.07\)\]/);
  assert.match(dashboard, /<MobileBottomNav onMore=/);
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
    source("src/dashboard/App.tsx"),
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
