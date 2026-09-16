import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard consumes the canonical OKLCH theme tokens without legacy hsl wrappers", async () => {
  const [css, charts] = await Promise.all([
    read("src/styles/admin-dashboard.css"),
    read("src/dashboard/components/DashboardCharts.tsx"),
  ]);

  assert.doesNotMatch(css, /hsl\(var\(--/);
  assert.doesNotMatch(charts, /hsl\(var\(--/);
  assert.match(css, /--admin-panel-border/);
  assert.match(css, /var\(--border\)/);
  assert.match(charts, /stroke="var\(--primary\)"/);
});

test("dashboard controls use semantic light and dark surfaces", async () => {
  const [header, search, card, pageHeader] = await Promise.all([
    read("src/dashboard/components/DashboardHeader.tsx"),
    read("src/dashboard/components/GlobalDashboardSearch.tsx"),
    read("src/dashboard/components/DashboardCard.tsx"),
    read("src/dashboard/components/DashboardPageHeader.tsx"),
  ]);

  for (const source of [header, search, card, pageHeader]) {
    assert.doesNotMatch(source, /border-slate-200/);
  }
  assert.match(header, /bg-background\/95/);
  assert.match(search, /bg-muted\/25/);
  assert.match(card, /border-border\/70/);
  assert.match(pageHeader, /bg-foreground/);
});

test("settings editor remains compact and progressively disclosed", async () => {
  const settings = await read("src/components/admin/SettingsEditor.tsx");

  assert.match(settings, /expandedIndex/);
  assert.match(settings, /aria-expanded=\{expanded\}/);
  assert.match(settings, /admin-setting-card/);
  assert.match(settings, /sm:grid-cols-4/);
});
