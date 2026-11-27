import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("product setup map organizes all twelve existing jump targets into four unique stages", async () => {
  const source = await read("../src/dashboard/components/products/ProductFormMap.tsx");
  const groups = [...source.matchAll(/ids:\s*\[([^\]]+)\]/g)];
  assert.equal(groups.length, 4);
  const ids = groups.flatMap((match) =>
    [...match[1].matchAll(/"(product-[\w-]+)"/g)].map((item) => item[1]));
  assert.equal(ids.length, 12, "all existing form destinations should be preserved");
  assert.equal(new Set(ids).size, 12, "each section should appear in one group only");
  for (const required of [
    "product-information", "product-pricing", "product-inventory",
    "product-media", "product-variants", "product-specifications",
    "product-collections", "product-organization", "product-seo",
    "product-publishing", "product-shipping", "product-advanced",
  ]) assert.ok(ids.includes(required), "missing section: " + required);
  assert.match(source, /new Set\(\["essentials", "presentation"\]\)/);
  assert.match(source, /aria-controls=\{/);
  assert.match(source, /aria-expanded=\{isOpen\}/);
  assert.match(source, /data-complete=\{section.complete\}/);
  assert.match(source, /target\.scrollIntoView\(/);
  assert.match(source, /target\.focus\(\{ preventScroll: true \}\)/);
});

test("product map progress is transparent and not treated as a publishing gate", async () => {
  const source = await read("../src/dashboard/components/products/ProductFormMap.tsx");
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-valuemax=\{progressSections.length\}/);
  assert.match(source, /NAVIGATION_ONLY/);
  assert.match(source, /Section content progress, not publishing readiness/);
  assert.match(source, /aria-valuenow=\{prepared\}/);
  assert.match(source, /save a draft at any time/);
  assert.doesNotMatch(source, /saveDashboardProduct|onSubmit|supabase/);
});

test("mobile grouped navigation has no hidden-content regression or horizontal scrolling", async () => {
  const css = await read("../src/dashboard/workspace.css");
  assert.match(css, /\.dashboard-form-map \.dashboard-form-map-steps\s*\{\s*display: grid/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.dashboard-form-map \.dashboard-form-map-steps\s*\{\s*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.dashboard-form-map \.dashboard-form-map-links\[hidden\]\s*\{\s*display: none/);
  assert.match(css, /\.dashboard-form-map \.dashboard-form-map-link:focus-visible/);
});

test("specification groups are collapsible while next-missing focus opens a collapsed target", async () => {
  const source = await read("../src/dashboard/components/products/ProductSpecificationEditor.tsx");
  assert.match(source, /openSections, setOpenSections/);
  assert.match(source, /sectionIdForField\(key\)/);
  assert.match(source, /setOpenSections\(\(current\) => new Set\(\[\.\.\.current, sectionKey\]\)\)/);
  assert.match(source, /setFocusTarget\(key\)/);
  assert.match(source, /document\.getElementById\("spacecall-spec-field-" \+ focusTarget\)/);
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.match(source, /aria-controls=\{"spacecall-spec-section-fields-" \+ sectionKey\}/);
  assert.match(source, /className=\{expanded \? "grid gap-3/);
  assert.match(source, /Expand all/);
  assert.match(source, /Collapse all/);
  assert.match(source, /section\.fields\.map\(\(field\) => \{/);
});

test("spec group totals use the original template, not only visible filtered fields", async () => {
  const source = await read("../src/dashboard/components/products/ProductSpecificationEditor.tsx");
  assert.match(source, /const originalSection = template\.sections\.find/);
  assert.match(source, /originalSection\?\.fields\.length \?\? section\.fields\.length/);
  assert.match(source, /originalSection\?\.fields\.filter\(\(field\) => values\[field.key\]\?\.trim\(\)\)\.length/);
  assert.match(source, /if \(mode !== "all"\) setOpenSections\(new Set\(allSectionIds\)\)/);
  assert.match(source, /if \(event\.target\.value\.trim\(\)\) setOpenSections\(new Set\(allSectionIds\)\)/);
  assert.match(source, /dark:text-amber-300/);
});
