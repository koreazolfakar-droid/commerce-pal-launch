import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const edge = await readFile(
  new URL("../supabase/functions/customer-orders/index.ts", import.meta.url),
  "utf8",
);
const account = await readFile(
  new URL("../src/lib/customerAccount.ts", import.meta.url),
  "utf8",
);
const orders = await readFile(
  new URL("../src/routes/my-orders.tsx", import.meta.url),
  "utf8",
);

test("customer orders returns only safe status timeline fields", () => {
  assert.match(edge, /from\("store_order_audit_log"\)/);
  assert.match(edge, /select\("order_id,action,to_state,created_at"\)/);
  assert.match(edge, /\.in\("action", \["created", "status_changed"\]\)/);
  assert.match(edge, /status_history: statusHistory/);
  assert.doesNotMatch(edge, /status_history:[\s\S]{0,180}actor_user_id/);
});

test("customer account parses status history defensively", () => {
  assert.match(account, /CustomerOrderStatusEvent/);
  assert.match(account, /statusHistory: Array\.isArray\(row\.status_history\)/);
  assert.match(account, /createdAt: text\(entry\.created_at\)/);
});

test("My Orders displays real per-stage timestamps with legacy fallbacks", () => {
  assert.match(orders, /function stageTime/);
  assert.match(orders, /order\.statusHistory\.find/);
  assert.match(orders, /stage === "received"\) return order\.createdAt/);
  assert.match(orders, /stage === "delivered"\) return order\.completedAt/);
  assert.match(orders, /formatStageTime/);
  assert.match(orders, /tabular-nums/);
});
