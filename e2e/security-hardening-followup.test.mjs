import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20260926190500_security_hardening_followup.sql", import.meta.url),
  "utf8",
);
const serverLimiter = await readFile(
  new URL("../src/security/mutation-rate-limit.server.ts", import.meta.url),
  "utf8",
);
const throttle = await readFile(
  new URL("../supabase/functions/dashboard-auth-throttle/index.ts", import.meta.url),
  "utf8",
);

test("retired CI debug storage is removed", () => {
  assert.match(migration, /drop table if exists public\.ci_debug_logs/);
});

test("privileged dashboard RPC implementations live in private schema", () => {
  for (const name of [
    "dashboard_inventory_page",
    "dashboard_inventory_summary",
    "update_store_order_delivery",
    "update_store_order_payment_status",
    "update_store_order_status",
  ]) {
    assert.match(migration, new RegExp(`alter function public\\.${name}`));
    assert.match(migration, new RegExp(`rename to ${name}_impl`));
  }
  assert.match(migration, /security invoker/g);
  assert.match(migration, /private\.dashboard_inventory_page_impl/);
  assert.match(migration, /private\.update_store_order_status_impl/);
});

test("server mutation limiting uses shared Supabase storage without raw IP persistence", () => {
  assert.match(serverLimiter, /consume_edge_rate_limit/);
  assert.match(serverLimiter, /server-mutation:/);
  assert.match(serverLimiter, /sha256/);
  assert.doesNotMatch(serverLimiter, /edge_rate_limits.*insert|from\("edge_rate_limits"\)/s);
});

test("dashboard auth throttle no longer checks whether a submitted email is staff", () => {
  assert.doesNotMatch(throttle, /dashboard_staff_email_exists/);
  assert.match(throttle, /outcome === "attempt" \|\| outcome === "check"/);
  assert.match(throttle, /outcome === "failure"[\s\S]*allowed: true/);
});
