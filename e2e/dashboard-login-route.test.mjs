import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const route = await readFile(new URL("../src/routes/dashboard.$.tsx", import.meta.url), "utf8");

test("dashboard login stays inside the mounted dashboard route", () => {
  assert.match(route, /createFileRoute\("\/dashboard\/\$"\)/);
  assert.match(app, /<Route path="\/dashboard\/login" component=\{LoginPage\}/);
  assert.doesNotMatch(app, /navigate\("\/login"\)/);
  assert.match(app, /navigate\("\/dashboard\/login"\)/);
});
