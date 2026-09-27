import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

const [config, createOrder, migration] = await Promise.all([
  read("supabase/config.toml"),
  read("supabase/functions/create-order/index.ts"),
  read("supabase/migrations/20260927190000_require_customer_login_for_checkout.sql"),
]);

test("create-order requires a valid customer JWT at the Supabase gateway", () => {
  assert.match(
    config,
    /\[functions\.create-order\][\s\S]*?verify_jwt\s*=\s*true/,
  );
});

test("create-order validates the signed-in customer again before order creation", () => {
  assert.match(createOrder, /const userToken = authenticatedBearerToken\(req\)/);
  assert.match(createOrder, /if \(!userToken\)/);
  assert.match(createOrder, /authentication_required/);
  assert.match(createOrder, /db\.auth\.getUser\(userToken\)/);
  assert.match(createOrder, /invalid_session/);
  assert.match(createOrder, /const accountUserId = authData\.user\.id/);
  assert.match(createOrder, /create_store_order_for_customer_internal/);
  assert.match(createOrder, /p_customer_user_id: accountUserId/);
});

test("authenticated checkout keeps origin, validation, rate-limit and idempotency protections", () => {
  assert.match(createOrder, /const PRODUCTION_ORIGINS = new Set/);
  assert.match(createOrder, /https:\/\/app\.spacecallapp\.store/);
  assert.match(createOrder, /ALLOW_NON_PRODUCTION_ORIGINS/);
  assert.match(createOrder, /if \(!allowNonProductionOrigins\(\)\) return false/);
  assert.match(createOrder, /TRUSTED_PREVIEW_SUFFIXES/);
  assert.match(createOrder, /function isAllowedOrigin/);
  assert.match(createOrder, /url\.protocol === "https:"/);
  assert.match(createOrder, /origin_not_allowed/);
  assert.match(createOrder, /consume_edge_rate_limit/);
  assert.match(createOrder, /RATE_LIMIT_PER_USER = 10/);
  assert.match(createOrder, /create-order:user:\$\{userFingerprint\}/);
  assert.match(createOrder, /idempotency_key/);
  assert.match(createOrder, /validatePayload\(body\)/);
});

test("database order creation and customer linking are atomic and service-role-only", () => {
  assert.match(migration, /create_store_order_for_customer_internal/);
  assert.match(migration, /public\.create_store_order_internal\(payload\)/);
  assert.match(migration, /customer_user_id = p_customer_user_id/);
  assert.match(migration, /order_account_conflict/);
  assert.match(
    migration,
    /revoke all on function public\.create_store_order_for_customer_internal\(jsonb, uuid\)[\s\S]*from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.create_store_order_for_customer_internal\(jsonb, uuid\)[\s\S]*to service_role/,
  );
});
