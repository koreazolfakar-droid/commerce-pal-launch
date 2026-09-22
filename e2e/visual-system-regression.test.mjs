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

  assert.match(styles, /--dashboard-card-radius:\s*1rem/);
  assert.match(styles, /--dashboard-control-radius:\s*0\.75rem/);
  assert.match(styles, /\.dashboard-theme-scope :where\(\[class~="rounded-2xl"\], \[class~="rounded-3xl"\]\)/);
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
  assert.ok(restoreIndex >= 0 && reduceIndex > restoreIndex, "reduced-motion override must load after control transitions");
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

test("dashboard shared chrome stays compact without changing navigation structure", async () => {
  const dashboard = await source("src/dashboard/App.tsx");

  assert.match(dashboard, /backdrop-blur-md/);
  assert.match(dashboard, /grid min-h-\[64px\] grid-cols-5/);
  assert.match(dashboard, /rounded-lg \$\{active \? "bg-accent" : ""\}/);
  assert.match(dashboard, /shadow-\[0_-4px_18px_rgba\(15,23,42,\.07\)\]/);
  assert.match(dashboard, /<MobileBottomNav onMore=/);
});
