import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");

test("dashboard shell exposes only truthful live actions", () => {
  assert.match(app, /import \{ SITE_URL, STORE_CONFIG \} from "@\/lib\/storeConfig"/);
  assert.match(app, /window\.open\(SITE_URL, "_blank", "noopener,noreferrer"\)/);
  assert.match(app, /placeholder=\{t\("Search products\.\.\."\)\}/);
  assert.doesNotMatch(app, /Search orders, products, customers/);
  assert.doesNotMatch(app, /Store preview link is available in the next integration phase/);
  assert.doesNotMatch(app, /You are all caught up/);
});

test("settings no longer pretends to persist mock configuration", () => {
  assert.match(app, /Current storefront configuration/);
  assert.match(app, /No fake saves/);
  assert.match(app, /Live connections/);
  assert.doesNotMatch(app, /Settings saved to the local mock workspace/);
  assert.doesNotMatch(app, /hello@spacecall\.demo/);
  assert.doesNotMatch(app, /Visual placeholders only\. Nothing is connected/);
  assert.doesNotMatch(app, /Standalone dashboard using mock\/demo data only/);
});

test("account menu uses separate valid action buttons", () => {
  assert.match(app, /aria-haspopup="menu"/);
  assert.match(app, /navigate\("\/dashboard\/security"\)/);
  assert.match(app, /navigate\("\/dashboard\/settings"\)/);
  assert.doesNotMatch(app, /> Profile<\/button>/);
});
