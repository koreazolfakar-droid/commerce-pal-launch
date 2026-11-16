import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const [bodySource, customerSource, createSource] = await Promise.all([
  read("supabase/functions/_shared/requestBody.ts"),
  read("supabase/functions/customer-orders/index.ts"),
  read("supabase/functions/create-order/index.ts"),
]);

function compile(source, require, extra = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  vm.runInNewContext(outputText, {
    exports, require, Request, Response, Headers, TextEncoder, TextDecoder, URL,
    crypto: webcrypto, atob, btoa, console: { warn() {}, error() {} }, ...extra,
  }, { timeout: 5000 });
  return exports;
}
const bodyModule = compile(bodySource, () => { throw new Error("Unexpected dependency"); });

const ownId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const orderId = "33333333-3333-4333-8333-333333333333";
const confirmed = "2026-11-01T00:00:00Z";
const baseUser = { id: ownId, email: "owner@example.test", phone: "+96170123456" };
const guestOrder = {
  id: orderId, customer_user_id: null, customer_email: baseUser.email,
  customer_phone: baseUser.phone, delivery_address: "Private fixture address",
};
const item = { id: "fixture-item", order_id: orderId, title: "Fixture", quantity: 1 };

function harness(source, options = {}) {
  let handler;
  const calls = [];
  const user = options.user === undefined ? baseUser : options.user;
  const db = {
    auth: { getUser: async (token) => {
      calls.push({ auth: token });
      return { data: { user }, error: options.authError ?? null };
    } },
    rpc: async (name, args) => {
      calls.push({ rpc: name, args });
      if (name === "consume_edge_rate_limit") return {
        data: [{ allowed: options.rateAllowed !== false }],
        error: options.rateError ? { message: "unavailable" } : null,
      };
      if (name === "create_store_order_for_customer_internal") return {
        data: { order_number: 1 }, error: null,
      };
      throw new Error("Unexpected RPC " + name);
    },
    from(table) {
      const filters = [];
      calls.push({ table, filters });
      const query = {
        select() { return query; },
        eq(key, value) { filters.push({ op: "eq", key, value }); return query; },
        ilike(key, value) { filters.push({ op: "ilike", key, value }); return query; },
        in(key, value) { filters.push({ op: "in", key, value }); return query; },
        order() { return query; },
        limit() { return query; },
        async maybeSingle() {
          const result = await query;
          return { ...result, data: result.data[0] ?? null };
        },
        then(resolve, reject) {
          const rows = table === "store_orders" ? options.orders ?? [guestOrder]
            : table === "store_order_items" ? [item] : [];
          const data = rows.filter((row) => filters.every(({ op, key, value }) =>
            op === "eq" ? row[key] === value
              : op === "in" ? value.includes(row[key])
                : String(row[key]).toLowerCase() === value.replace(/\\([\\%_])/g, "$1").toLowerCase(),
          ));
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  compile(source, (name) => {
    if (name === "../_shared/requestBody.ts") return bodyModule;
    if (name.startsWith("npm:@supabase/supabase-js")) return { createClient: () => db };
    if (name.startsWith("jsr:")) return {};
    throw new Error("Unexpected dependency " + name);
  }, { Deno: {
    env: { get: (key) => ({
      SUPABASE_URL: "https://fixture.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "fixture-server-only",
    })[key] },
    serve: (fn) => { handler = fn; },
  } });
  return { handler, calls };
}

function request(body, headers = {}) {
  return new Request("https://fixture.supabase.co/functions/v1/test", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + jwt(), ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
async function invoke(source, body, options = {}, headers = {}) {
  const h = harness(source, options);
  const response = await h.handler(request(body, headers));
  return { ...h, response, body: await response.json() };
}
const itemBody = { action: "items", order_id: orderId };

test("BOLA: unconfirmed contact fields cannot authorize legacy order item reads", async () => {
  const r = await invoke(customerSource, itemBody);
  assert.equal(r.response.status, 404);
  assert.equal(r.body.error, "order_not_found");
  assert.equal(r.calls.some((c) => c.table === "store_order_items"), false);
});

test("BOLA: unconfirmed contact fields never initiate legacy history queries", async () => {
  const r = await invoke(customerSource, { action: "list" });
  assert.equal(r.response.status, 200);
  assert.deepEqual(r.body.orders, []);
  const lookups = r.calls.filter((c) => c.table === "store_orders");
  assert.equal(lookups.length, 1);
  assert.deepEqual(lookups[0].filters, [{ op: "eq", key: "customer_user_id", value: ownId }]);
});

for (const [name, user] of [
  ["confirmed email", { ...baseUser, email_confirmed_at: confirmed }],
  ["confirmed phone", { ...baseUser, phone_confirmed_at: confirmed }],
]) {
  test("Legacy history remains available through " + name, async () => {
    const r = await invoke(customerSource, itemBody, { user });
    assert.equal(r.response.status, 200);
    assert.equal(r.body.items[0].title, "Fixture");
    const list = await invoke(customerSource, { action: "list" }, { user });
    assert.equal(list.body.orders.length, 1);
  });
}

test("Confirming one contact does not authorize the other contact", async () => {
  const emailOnly = await invoke(customerSource, itemBody, {
    user: { ...baseUser, email: "different@example.test", email_confirmed_at: confirmed },
  });
  assert.equal(emailOnly.response.status, 404);
  const phoneOnly = await invoke(customerSource, itemBody, {
    user: { ...baseUser, phone: "+96170999999", phone_confirmed_at: confirmed },
  });
  assert.equal(phoneOnly.response.status, 404);
});

test("Anonymous sessions cannot use contact-based fallback even with confirmation claims", async () => {
  const r = await invoke(customerSource, itemBody, {
    user: { ...baseUser, is_anonymous: true, email_confirmed_at: confirmed, phone_confirmed_at: confirmed },
  });
  assert.equal(r.response.status, 404);
});

test("Another account's explicit owner always overrides a matching verified contact", async () => {
  const r = await invoke(customerSource, itemBody, {
    user: { ...baseUser, email_confirmed_at: confirmed, phone_confirmed_at: confirmed },
    orders: [{ ...guestOrder, customer_user_id: otherId }],
  });
  assert.equal(r.response.status, 404);
  assert.equal(r.calls.some((c) => c.table === "store_order_items"), false);
});

test("Explicitly owned orders stay readable without legacy contact fallback", async () => {
  const r = await invoke(customerSource, itemBody, {
    orders: [{ ...guestOrder, customer_user_id: ownId }],
  });
  assert.equal(r.response.status, 200);
});

test("Order identifier injection is rejected before querying orders", async () => {
  const r = await invoke(customerSource, { action: "items", order_id: "' OR 1=1 --" });
  assert.equal(r.response.status, 400);
  assert.equal(r.calls.some((c) => c.table), false);
});

test("Verified email lookup escapes ILIKE wildcard characters", async () => {
  const r = await invoke(customerSource, { action: "list" }, {
    user: { ...baseUser, email: "a_%@example.test", email_confirmed_at: confirmed },
  });
  const filter = r.calls.flatMap((c) => c.filters ?? []).find((f) => f.op === "ilike");
  assert.equal(filter.value, "a\\_\\%@example.test");
});

for (const [name, source] of [["customer-orders", customerSource], ["create-order", createSource]]) {
  test(name + ": missing and invalid sessions fail before privileged queries", async () => {
    const missing = await invoke(source, {}, {}, { authorization: "" });
    assert.equal(missing.response.status, 401);
    assert.equal(missing.calls.length, 0);
    const invalid = await invoke(source, {}, { user: null, authError: { message: "expired" } });
    assert.equal(invalid.response.status, 401);
    assert.equal(invalid.calls.some((c) => c.rpc || c.table), false);
  });
  test(name + ": arbitrary browser origins are rejected before authentication", async () => {
    const r = await invoke(source, {}, {}, { origin: "https://attacker.example" });
    assert.equal(r.response.status, 403);
    assert.equal(r.calls.length, 0);
    assert.equal(r.response.headers.has("access-control-allow-origin"), false);
  });
  test(name + ": rate limiting fails closed before reading the request", async () => {
    for (const [options, status] of [[{ rateAllowed: false }, 429], [{ rateError: true }, 503]]) {
      const r = await invoke(source, "{", options);
      assert.equal(r.response.status, status);
      assert.equal(r.calls.some((c) => c.table || c.rpc === "create_store_order_for_customer_internal"), false);
    }
  });
  test(name + ": malformed JSON is rejected and never cached", async () => {
    const r = await invoke(source, "{");
    assert.equal(r.response.status, 400);
    assert.equal(r.body.error, "invalid_json");
    assert.match(r.response.headers.get("cache-control"), /no-store/);
  });
  test(name + ": oversized chunked request is cancelled before its open tail", { timeout: 5000 }, async () => {
    const h = harness(source);
    let cancelled = false;
    const body = new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(65537)); },
      cancel() { cancelled = true; },
    });
    const req = new Request("https://fixture.supabase.co/functions/v1/test", {
      method: "POST", body, duplex: "half",
      headers: { "content-type": "application/json", authorization: "Bearer fixture",
        "content-length": "1" },
    });
    // Only a signed-in claim passes create-order's preliminary JWT shape filter.
    if (name === "create-order") req.headers.set("authorization", "Bearer " + jwt());
    const response = await h.handler(req);
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error, "payload_too_large");
    assert.equal(cancelled, true);
    assert.equal(h.calls.some((c) => c.table || c.rpc === "create_store_order_for_customer_internal"), false);
  });
}

function jwt() {
  return "fixture." + Buffer.from(JSON.stringify({ role: "authenticated", sub: ownId })).toString("base64url") + ".fixture";
}

test("Checkout ignores caller-supplied account ID and email", async () => {
  const payload = {
    idempotency_key: "fixture-idempotency-key", p_customer_user_id: otherId,
    customer: { name: "Fixture", phone: "+96170123456", city: "Saida",
      address: "Fixture address", email: "attacker@example.test" },
    expected_subtotal: 10, expected_delivery_fee: 2,
    items: [{ product_id: otherId, variant_id: orderId, quantity: 1 }],
  };
  const r = await invoke(createSource, payload, {}, { authorization: "Bearer " + jwt() });
  assert.equal(r.response.status, 201);
  const mutation = r.calls.find((c) => c.rpc === "create_store_order_for_customer_internal");
  assert.equal(mutation.args.p_customer_user_id, ownId);
  assert.equal(mutation.args.payload.customer.email, baseUser.email);
});

test("Bounded reader preserves split UTF-8 at the exact byte boundary", async () => {
  const bytes = new TextEncoder().encode('{"city":"صيدا"}');
  const body = new ReadableStream({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  const req = new Request("https://fixture.test", { method: "POST", body, duplex: "half" });
  assert.equal(await bodyModule.readBoundedText(req, bytes.length), '{"city":"صيدا"}');
});
