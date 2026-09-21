import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const checkout = await readFile(
  new URL("../src/components/CheckoutDetailsForm.tsx", import.meta.url),
  "utf8",
);
const client = await readFile(new URL("../src/lib/orderCheckout.ts", import.meta.url), "utf8");
const edge = await readFile(
  new URL("../supabase/functions/create-order/index.ts", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL("../supabase/migrations/20260921053341_secure_order_workflow.sql", import.meta.url),
  "utf8",
);
const settings = await readFile(
  new URL("../src/dashboard/data/settings.ts", import.meta.url),
  "utf8",
);

test("checkout persists an order before WhatsApp is opened", () => {
  const createIndex = checkout.indexOf("await createStorefrontOrder({");
  const whatsappIndex = checkout.indexOf("whatsappUrl(message.join");
  assert.ok(createIndex > 0, "checkout must call createStorefrontOrder");
  assert.ok(whatsappIndex > createIndex, "WhatsApp must open only after order creation succeeds");
  assert.match(checkout, /Order"}: #\$\{order\.order_number\}/);
  assert.match(checkout, /formatPrice\(order\.total, order\.currency\)/);
});

test("checkout retries reuse a cart-scoped idempotency key", () => {
  assert.match(client, /CHECKOUT_ATTEMPT_KEY/);
  assert.match(client, /cartFingerprint/);
  assert.match(client, /crypto\.randomUUID/);
  assert.match(client, /idempotency_key: checkoutIdempotencyKey\(input\.items\)/);
});

test("create-order rejects unsafe or ambiguous order requests before RPC", () => {
  assert.match(edge, /idempotency_key_required/);
  assert.match(edge, /duplicate_variant/);
  assert.match(edge, /invalid_delivery_location/);
  assert.match(edge, /idempotency_key_conflict/);
  assert.match(edge, /db\.rpc\("create_store_order_internal"/);
});

test("database order creation serializes duplicates and inventory conflicts", () => {
  assert.match(migration, /store_orders_idempotency_key_uidx/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /hashtextextended\(v_idempotency_key, 0\)/);
  assert.match(migration, /order by locked_variant\.id[\s\S]+for update/);
  assert.match(migration, /duplicate_variant/);
  assert.match(migration, /insufficient_stock/);
});

test("delivery fee is server-owned and participates in the final total", () => {
  assert.match(settings, /key: "delivery_fee"/);
  assert.match(settings, /deliveryFeeNumber/);
  assert.match(migration, /where setting\.key = 'delivery_fee'/);
  assert.match(migration, /v_total := v_subtotal \+ v_shipping_total/);

  const bodyStart = client.indexOf("const body = {");
  const invokeStart = client.indexOf("supabase.functions.invoke", bodyStart);
  assert.ok(
    bodyStart > 0 && invokeStart > bodyStart,
    "checkout request body should be identifiable",
  );
  const requestBodySource = client.slice(bodyStart, invokeStart);
  assert.doesNotMatch(requestBodySource, /shipping_total\s*:/);
  assert.match(requestBodySource, /expected_delivery_fee:/);
});

test("successful creation writes an audit event in the same transaction", () => {
  assert.match(migration, /insert into public\.store_order_audit_log/);
  assert.match(migration, /'created'/);
  assert.match(migration, /request_key/);
});
