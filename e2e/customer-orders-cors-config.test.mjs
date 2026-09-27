import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

const [config, customerOrders] = await Promise.all([
  read("supabase/config.toml"),
  read("supabase/functions/customer-orders/index.ts"),
]);

test("customer order history remains JWT-protected", () => {
  assert.match(
    config,
    /\[functions\.customer-orders\][\s\S]*?verify_jwt\s*=\s*true/,
  );
  assert.match(customerOrders, /db\.auth\.getUser\(token\)/);
});

test("customer-orders allows trusted app and preview origins but rejects arbitrary origins", () => {
  assert.match(customerOrders, /https:\/\/app\.spacecallapp\.store/);
  assert.match(customerOrders, /TRUSTED_PREVIEW_SUFFIXES/);
  assert.match(customerOrders, /\.lovable\.app/);
  assert.match(customerOrders, /\.lovableproject\.com/);
  assert.match(customerOrders, /function isAllowedOrigin/);
  assert.match(customerOrders, /url\.protocol === "https:"/);
  assert.match(customerOrders, /origin_not_allowed/);
  assert.match(customerOrders, /customer-orders rejected origin/);
});
