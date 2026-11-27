import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

const [checkout, client, edge, config, migration] = await Promise.all([
  read("src/components/CheckoutDetailsForm.tsx"),
  read("src/lib/orderCheckout.ts"),
  read("supabase/functions/create-order/index.ts"),
  read("supabase/config.toml"),
  read("supabase/migrations/20260927190000_require_customer_login_for_checkout.sql"),
]);

test("guest shoppers can browse and fill checkout but cannot place an order", () => {
  assert.match(checkout, /if \(!user\)/);
  assert.match(checkout, /persistDetails\(\)/);
  assert.match(checkout, /setError\(copy\.signInRequired\)/);
  assert.match(checkout, /openAuth\(\)/);
  assert.match(checkout, /signInToOrder/);
  assert.match(checkout, /user\s*\?\s*copy\.send\s*:\s*copy\.signInToOrder/);
});

test("client refuses to call create-order without a customer session", () => {
  assert.match(client, /supabase\.auth\.getSession\(\)/);
  assert.match(client, /session\?\.user\?\.id/);
  assert.match(client, /authentication_required/);
  assert.match(client, /customerUserId/);
});

test("server and database both enforce account-bound order creation", () => {
  assert.match(config, /\[functions\.create-order\][\s\S]*verify_jwt\s*=\s*true/);
  assert.match(edge, /if \(!userToken\)/);
  assert.match(edge, /db\.auth\.getUser\(userToken\)/);
  assert.match(edge, /create_store_order_for_customer_internal/);
  assert.match(migration, /p_customer_user_id uuid/);
  assert.match(migration, /customer_user_id = p_customer_user_id/);
  assert.match(migration, /order_account_conflict/);
});
