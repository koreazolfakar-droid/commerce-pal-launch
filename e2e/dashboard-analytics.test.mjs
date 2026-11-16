import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function helpers() {
  const source = await readFile(
    new URL("../src/dashboard/lib/analytics.ts", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

test("analytics UTC ranges include today and compare the same elapsed duration without overlap", async () => {
  const { analyticsRange } = await helpers();
  const range = analyticsRange("7D", new Date("2026-11-16T12:00:00Z"));
  assert.equal(range.start, "2026-11-10T00:00:00.000Z");
  assert.equal(range.end, "2026-11-16T12:00:00.000Z");
  assert.equal(range.previousEnd, range.start);
  assert.equal(
    Date.parse(range.end) - Date.parse(range.start),
    Date.parse(range.previousEnd) - Date.parse(range.previousStart),
  );
});
test("calendar 12M handles leap days, and custom ranges are inclusive dates with validated bounds", async () => {
  const { analyticsRange } = await helpers();
  const now = new Date("2024-02-29T12:00:00Z");
  assert.equal(analyticsRange("12M", now).start, "2023-03-01T00:00:00.000Z");
  const range = analyticsRange("custom", now, "2024-02-01", "2024-02-03");
  assert.equal(range.end, "2024-02-04T00:00:00.000Z");
  assert.throws(() => analyticsRange("custom", now, "2024-02-30", "2024-03-01"));
  assert.throws(() => analyticsRange("custom", now, "2024-03-01", "2024-02-01"));
  assert.throws(() => analyticsRange("custom", now, "2020-01-01", "2024-02-01"));
  assert.throws(() => analyticsRange("custom", now, "2024-02-01", "2024-03-01"));
});
test("trend changes do not invent percentages for missing or zero previous values", async () => {
  const { percentageChange } = await helpers();
  assert.equal(percentageChange(120, 100), 20);
  assert.equal(percentageChange(0, 100), -100);
  assert.equal(percentageChange(0, 0), 0);
  assert.equal(percentageChange(5, 0), null);
  assert.equal(percentageChange(5, null), null);
});

test("analytics has its own lazy route while the dashboard overview stays intact", async () => {
  const { assertDashboardRoute } = await import("./helpers/dashboard-routes.mjs");
  assertDashboardRoute("/dashboard/analytics", "analyticsPage");
  assertDashboardRoute("/dashboard", "homePage");
});
