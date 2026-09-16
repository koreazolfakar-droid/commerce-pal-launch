import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard overview preserves the reference-inspired information architecture", async () => {
  const source = await read("src/routes/dashboard.index.tsx");
  assert.match(source, /Sales Overview/);
  assert.match(source, /Total Sales/);
  assert.match(source, /Valuable Customers/);
  assert.match(source, /Top Selling Products/);
  assert.match(source, /Stock Report/);
  assert.match(source, /Recent Orders/);
  assert.match(source, /xl:grid-cols-\[220px_minmax\(0,1fr\)_230px\]/);
  assert.match(source, /useDashboardLanguage/);
});
