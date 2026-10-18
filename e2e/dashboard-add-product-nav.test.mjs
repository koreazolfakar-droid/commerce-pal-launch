import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const routes = await readFile(new URL("../src/dashboard/config/routes.tsx", import.meta.url), "utf8");
const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");

test("sidebar exposes Add New Product linking to the existing create route", () => {
  const start = routes.indexOf('id: "products-new"');
  const block = routes.slice(start, start + 600);
  assert.match(block, /path: "\/dashboard\/products\/new"/);
  assert.match(block, /label: "Add New Product"/);
  assert.match(block, /icon: "PackagePlus"/);
  assert.match(app, /^\s+PackagePlus,$/m);
});
