import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesheet = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const sectionName = "Space Call Dashboard / Phase 2: mobile data cards and dialog polish.";

test("dashboard mobile card rules stay scoped to authenticated workspace", () => {
  const sections = stylesheet.split(sectionName);
  assert.equal(sections.length, 2, "phase 2 dashboard styles should appear once");
  const phase = sections[1];
  assert.match(phase, /@media \(max-width: 767px\)/);
  assert.match(phase, /\.dashboard-theme-scope \.dashboard-responsive-table tbody tr \{/);
  assert.match(phase, /background: var\(--color-card\)/);
  assert.match(phase, /border: 1px solid var\(--color-border\)/);
  assert.match(phase, /\.dashboard-theme-scope \.dashboard-responsive-table tbody tr:focus-within/);
  assert.match(phase, /\.dashboard-theme-scope \.dashboard-responsive-table tbody td\[data-label=""\]::before/);
  assert.match(phase, /@media \(max-width: 359px\)/);
  assert.match(phase, /grid-template-columns: minmax\(0, 1fr\)/);
});

test("dashboard mobile dialogs respect device safe areas", () => {
  const phase = stylesheet.split(sectionName)[1];
  assert.match(phase, /@media \(max-width: 639px\)/);
  assert.match(phase, /\.dashboard-theme-scope \.dashboard-modal-backdrop/);
  assert.match(phase, /padding-block-start: env\(safe-area-inset-top\)/);
  assert.match(phase, /\.dashboard-theme-scope \.dashboard-modal-surface/);
  assert.match(phase, /env\(safe-area-inset-bottom\)/);
});
