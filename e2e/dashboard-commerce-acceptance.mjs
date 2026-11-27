import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as pause } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("../", import.meta.url));
const stackDir =
  process.env.SPACE_CALL_TEST_STACK_DIR || join(tmpdir(), "space-call-commerce-test");
const status = JSON.parse(readFileSync(join(stackDir, "status.json"), "utf8"));
const api = new URL(status.API_URL);
assert.ok(
  api.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(api.hostname),
  "Acceptance writes are allowed only to a local Supabase instance",
);
assert.ok(status.SERVICE_ROLE_KEY && status.ANON_KEY, "Local Supabase keys are required");
const prefix = `acceptance-${randomUUID().slice(0, 8)}`;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(api.href, status.SERVICE_ROLE_KEY, options);
const staff = createClient(api.href, status.ANON_KEY, options);
const customer = createClient(api.href, status.ANON_KEY, options);
const editor = createClient(api.href, status.ANON_KEY, options);
const anonymous = createClient(api.href, status.ANON_KEY, options);
const children = [],
  checks = [],
  pageErrors = [];
let browser;
const checked = (name) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
function data(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}
async function rpc(client, name, args = {}) {
  return data(await client.rpc(name, args), name);
}
async function row(table, id) {
  return data(await admin.from(table).select("*").eq("id", id).single(), table);
}
async function eventually(read, predicate, label) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const value = await read();
    if (predicate(value)) return value;
    await pause(250);
  }
  throw new Error(`Timed out: ${label}`);
}
function totp(secret) {
  const bits = [...secret.toUpperCase().replace(/=+$/, "")]
    .map((c) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const count = Buffer.alloc(8);
  count.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const hash = createHmac("sha1", key).update(count).digest();
  return String((hash.readUInt32BE(hash.at(-1) & 15) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
async function user(client, name) {
  const email = `${prefix}-${name}@example.test`,
    password = `${randomUUID()}Aa1!`;
  const created = data(
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
    "create local test user",
  );
  data(await client.auth.signInWithPassword({ email, password }), "password sign-in");
  return created.user;
}
async function verifiedStaff(client, name, role) {
  const operator = await user(client, name);
  data(
    await admin.from("user_roles").upsert(
      {
        user_id: operator.id,
        role,
        mfa_required: true,
        mfa_enrolled_at: new Date().toISOString(),
      },
      { onConflict: "user_id,role" },
    ),
    "assign local staff role",
  );
  // The role alone must never bypass MFA.
  assert.equal(await rpc(client, "dashboard_staff_access_ready"), false);
  for (const inventoryRpc of ["dashboard_inventory_page", "dashboard_inventory_summary"]) {
    const { error } = await client.rpc(inventoryRpc);
    assert.match(error?.message ?? "", /dashboard authentication is required/);
  }
  const factor = data(
    await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Acceptance authenticator" }),
    "enroll TOTP",
  );
  const challenge = data(
    await client.auth.mfa.challenge({ factorId: factor.id }),
    "challenge TOTP",
  );
  data(
    await client.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code: totp(factor.totp.secret),
    }),
    "verify TOTP",
  );
  return data(await client.auth.getSession(), "verified session").session;
}
function start(command, args, env, name) {
  const fd = openSync(join(stackDir, `${name}.log`), "w", 0o600);
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    detached: true,
    stdio: ["ignore", fd, fd],
  });
  closeSync(fd);
  children.push(child);
  return child;
}
async function ready(url, child) {
  for (let attempt = 0; attempt < 180; attempt++) {
    if (child.exitCode !== null)
      throw new Error(`Test service stopped: ${url}; inspect temporary service log`);
    try {
      if ((await fetch(url, { method: "OPTIONS" })).status < 500) return;
    } catch {
      /* service starting */
    }
    await pause(500);
  }
  throw new Error(`Service did not start: ${url}`);
}
const base = {
  p_product_id: null,
  p_title: `${prefix} Phone`,
  p_description: "Local acceptance fixture",
  p_brand_id: null,
  p_category_id: null,
  p_status: "active",
  p_price: 100,
  p_compare_at_price: null,
  p_sku: prefix,
  p_barcode: "",
  p_stock: 20,
  p_expected_stock: null,
  p_image_url: "",
  p_seo_title: "",
  p_seo_description: "",
  p_specifications: {},
  p_collection_ids: [],
};

try {
  mkdirSync(stackDir, { recursive: true });
  const buyer = await user(customer, "customer");
  const session = await verifiedStaff(staff, "staff", "admin");
  assert.equal(
    JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url")).aal,
    "aal2",
  );
  assert.equal(await rpc(staff, "dashboard_staff_access_ready"), true);
  await rpc(staff, "dashboard_inventory_page");
  await rpc(staff, "dashboard_inventory_summary");
  checked("real password + TOTP staff authentication and database authorization");

  const product = await rpc(staff, "save_store_product_editor", base);
  const productId = product.id || product.product_id;
  assert.ok(productId, "Product editor returns its id");
  const variants = data(
    await admin.from("store_product_variants").select("*").eq("product_id", productId),
    "primary variant",
  );
  const variantId = variants[0].id;
  const stock = async () => {
    const variant = await row("store_product_variants", variantId),
      summary = await row("store_products", productId);
    assert.equal(
      summary.stock_quantity,
      variant.stock_quantity,
      "Catalog stock summary follows variant stock",
    );
    return variant.stock_quantity;
  };
  const handle = (await row("store_products", productId)).handle;
  await rpc(staff, "save_store_product_editor", {
    ...base,
    p_product_id: productId,
    p_title: `${prefix} Renamed`,
    p_stock: 20,
    p_expected_stock: 20,
  });
  assert.equal((await row("store_products", productId)).handle, handle);
  checked("atomic product save preserves public handle and stock summaries");
  const draft = await rpc(staff, "save_store_product_editor", {
    ...base,
    p_title: `${prefix} Draft`,
    p_sku: `${prefix}-draft`,
    p_status: "draft",
    p_stock: 0,
    p_image_url: "https://example.test/acceptance.webp",
  });
  assert.equal(
    data(
      await staff.from("store_product_images").select("id").eq("product_id", draft.id),
      "draft media",
    ).length,
    1,
  );
  assert.equal(
    data(
      await customer.from("store_products").select("id").eq("id", draft.id),
      "customer draft isolation",
    ).length,
    0,
  );
  assert.equal(
    data(
      await anonymous.from("store_products").select("id").eq("id", draft.id),
      "anonymous draft isolation",
    ).length,
    0,
  );
  for (const reader of [customer, anonymous]) {
    assert.equal(
      data(
        await reader.from("store_product_images").select("id").eq("product_id", draft.id),
        "draft image isolation",
      ).length,
      0,
    );
  }
  checked(
    "verified staff can create draft media while customers and anonymous readers cannot see drafts",
  );

  const edge = start(
    "npx",
    [
      "--yes",
      "deno@2.9.6",
      "run",
      "--no-lock",
      "--allow-env",
      "--allow-net",
      "--allow-read",
      "supabase/functions/create-order/index.ts",
    ],
    {
      SUPABASE_URL: api.href.replace(/\/$/, ""),
      SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
      ALLOW_NON_PRODUCTION_ORIGINS: "true",
      DENO_DIR: join(stackDir, "deno-cache"),
      ...(process.env.CODEX_PROXY_CERT ? { DENO_CERT: process.env.CODEX_PROXY_CERT } : {}),
    },
    "create-order",
  );
  await ready("http://127.0.0.1:8000", edge);
  const customerSession = data(await customer.auth.getSession(), "customer session").session;
  const payload = {
    idempotency_key: randomUUID(),
    customer: {
      name: `${prefix} Customer`,
      phone: `+96171${String(parseInt(randomUUID().slice(0, 6), 16) % 1_000_000).padStart(6, "0")}`,
      address: "Local test address",
      city: "Beirut",
      email: buyer.email,
    },
    items: [{ product_id: productId, variant_id: variantId, quantity: 2 }],
    payment_method: "cash",
    expected_subtotal: 200,
    expected_delivery_fee: 2,
  };
  async function order(body, token = customerSession.access_token) {
    // Isolated loopback-only Auth/REST fixture; no remote credentials or production traffic.
    // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
    const response = await fetch("http://127.0.0.1:8000", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:5173",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }
  assert.equal((await order(payload, "")).status, 401);
  for (const changes of [{ expected_subtotal: 199 }, { expected_delivery_fee: 1 }]) {
    const declined = await admin.rpc("create_store_order_for_customer_internal", {
      payload: { ...payload, ...changes },
      p_customer_user_id: buyer.id,
    });
    assert.equal(declined.error?.message, "pricing_changed");
  }
  const historicalPayload = { ...payload, idempotency_key: randomUUID() };
  const historical = await rpc(admin, "create_store_order_internal", { payload: historicalPayload });
  const ownership = await admin.rpc("create_store_order_for_customer_internal", {
    payload: historicalPayload,
    p_customer_user_id: buyer.id,
  });
  assert.equal(ownership.error?.message, "order_account_conflict");
  assert.equal((await row("store_orders", historical.order_id)).customer_user_id, null);

  const created = await order(payload);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const orderId = created.body.order.order_id;
  assert.match(created.body.order.public_order_number, /^\d{5}-\d{5}$/);
  assert.equal((await row("store_orders", orderId)).customer_user_id, buyer.id);
  assert.equal(await stock(), 20, "New orders reserve stock only when staff confirms");
  const otherOwner = await admin.rpc("create_store_order_for_customer_internal", {
    payload,
    p_customer_user_id: session.user.id,
  });
  assert.equal(otherOwner.error?.message, "order_account_conflict");
  const retry = await order(payload);
  assert.equal(retry.status, 201);
  assert.equal(retry.body.order.order_id, orderId);
  assert.equal(await stock(), 20);
  const conflict = await order({ ...payload, notes: "Changed retry" });
  assert.equal(conflict.status, 409);
  assert.equal(await stock(), 20);
  checked(
    "real create-order handler authenticates, links customer and rejects conflicting retries without premature stock changes",
  );

  const denied = await customer.rpc("update_store_order_status", {
    p_order_id: orderId,
    p_status: "confirmed",
    p_expected_version: 1,
  });
  assert.ok(denied.error);
  assert.equal((await row("store_orders", orderId)).status, "new");
  const anonOrders = await anonymous.from("store_orders").select("id");
  assert.ok(anonOrders.error || anonOrders.data.length === 0);
  checked(
    "customer and anonymous sessions cannot perform staff order actions or read order tables",
  );

  const frontend = start(
    process.execPath,
    ["e2e/helpers/commerce-dev-server.mjs"],
    {
      SPACE_CALL_TEST_STACK_DIR: stackDir,
      VITE_SUPABASE_URL: "http://localhost:5173/__test-supabase",
      SPACE_CALL_LOCAL_API_URL: api.href.replace(/\/$/, ""),
      VITE_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
    },
    "frontend",
  );
  await ready("http://localhost:5173/dashboard", frontend);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(
    ({ session, key }) => {
      sessionStorage.setItem(key, JSON.stringify(session));
    },
    { session, key: "sb-localhost-auth-token" },
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("response", async (response) => {
    if (response.status() >= 400 && response.url().includes("/__test-supabase/rest/"))
      console.error(
        "API rejection",
        response.request().postDataJSON(),
        response.url().split("/rest/v1/")[1]?.split("?")[0],
        (await response.text()).slice(0, 350),
      );
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`http://localhost:5173/dashboard/orders/${orderId}`);
  await page
    .getByRole("button", { name: "Confirm order", exact: true })
    .waitFor({ timeout: 60000 });
  for (const [button, state] of [
    ["Confirm order", "confirmed"],
    ["Start processing", "processing"],
    ["Mark ready", "ready"],
    ["Out for delivery", "out_for_delivery"],
    ["Mark delivered", "delivered"],
  ]) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await eventually(
      () => row("store_orders", orderId),
      (o) => o.status === state,
      `order ${state}`,
    );
  }
  assert.equal(
    await page.getByRole("button", { name: "Mark DONE", exact: true }).isDisabled(),
    true,
  );
  const current = await row("store_orders", orderId);
  assert.ok(
    (
      await staff.rpc("update_store_order_status", {
        p_order_id: orderId,
        p_status: "done",
        p_expected_version: current.version,
      })
    ).error,
  );
  assert.ok(
    (
      await staff.rpc("update_store_order_status", {
        p_order_id: orderId,
        p_status: "done",
        p_expected_version: 1,
      })
    ).error,
  );
  await page.getByLabel("Payment status", { exact: true }).selectOption("paid");
  await eventually(
    () => row("store_orders", orderId),
    (o) => o.payment_status === "paid",
    "payment paid",
  );
  await page.getByRole("button", { name: "Mark DONE", exact: true }).click();
  await eventually(
    () => row("store_orders", orderId),
    (o) => o.status === "done",
    "completed order",
  );
  const sales = data(
    await admin.from("store_sales").select("*").eq("order_id", orderId),
    "completed sale",
  );
  assert.equal(sales.length, 1);
  const completedOrder = await row("store_orders", orderId);
  const crm = data(
    await admin
      .from("store_customers")
      .select("id,total_orders,total_spent")
      .eq("phone_normalized", payload.customer.phone.replace(/\D/g, ""))
      .single(),
    "customer totals",
  );
  assert.equal(crm.total_orders, 1);
  assert.equal(Number(crm.total_spent), Number(completedOrder.total));
  await rpc(staff, "update_store_order_status", {
    p_order_id: orderId,
    p_status: "done",
    p_expected_version: completedOrder.version,
  });
  assert.equal(
    data(
      await admin.from("store_sales").select("id").eq("order_id", orderId),
      "idempotent completion",
    ).length,
    1,
  );
  assert.equal(await stock(), 18);
  checked(
    "staff browser → real API → database: all fulfillment stages, unpaid completion blocked, one sale",
  );
  await page.getByLabel("Payment status", { exact: true }).selectOption("refunded");
  await eventually(
    () => row("store_orders", orderId),
    (o) => o.payment_status === "refunded",
    "refund",
  );
  assert.equal(
    data(
      await admin.from("store_sales").select("payment_status").eq("order_id", orderId).single(),
      "refunded sale",
    ).payment_status,
    "refunded",
  );
  assert.equal(await stock(), 18, "A financial refund must not invent a physical stock return");
  assert.equal(Number((await row("store_customers", crm.id)).total_spent), 0);
  checked("refund keeps sales in sync and does not silently restock goods");

  const cancelOrder = await order({ ...payload, idempotency_key: randomUUID() });
  assert.equal(cancelOrder.status, 201, JSON.stringify(cancelOrder.body));
  const cancelId = cancelOrder.body.order.order_id;
  assert.equal(await stock(), 18);
  const pendingCancellation = await row("store_orders", cancelId);
  const confirmations = await Promise.all(
    [1, 2].map(() =>
      staff.rpc("update_store_order_status", {
        p_order_id: cancelId,
        p_status: "confirmed",
        p_expected_version: pendingCancellation.version,
      }),
    ),
  );
  assert.equal(confirmations.filter((r) => !r.error).length, 1);
  assert.match(confirmations.find((r) => r.error).error.message, /order_version_conflict/);
  assert.equal(await stock(), 16);
  let cancellation = await row("store_orders", cancelId);
  await rpc(staff, "update_store_order_status", {
    p_order_id: cancelId,
    p_status: "cancelled",
    p_expected_version: cancellation.version,
  });
  assert.equal(await stock(), 18);
  cancellation = await row("store_orders", cancelId);
  await rpc(staff, "update_store_order_status", {
    p_order_id: cancelId,
    p_status: "cancelled",
    p_expected_version: cancellation.version,
  });
  assert.equal(await stock(), 18);
  checked(
    "cancellation releases only reserved stock and repeated cancellation cannot duplicate it",
  );

  const supplier = data(
    await staff
      .from("store_suppliers")
      .insert({ name: `${prefix} Supplier`, code: prefix, is_active: true })
      .select("id")
      .single(),
    "supplier",
  );
  const location = data(
    await admin
      .from("store_procurement_locations")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single(),
    "location",
  );
  const poId = await rpc(staff, "create_store_purchase_order_v2", {
    p_supplier_id: supplier.id,
    p_location_id: location.id,
    p_po_number: prefix,
    p_currency: "USD",
    p_expected_at: null,
    p_discount_amount: 0,
    p_tax_amount: 0,
    p_shipping_amount: 0,
    p_exchange_rate: 1,
    p_notes: "Local acceptance",
    p_items: [
      { product_id: productId, variant_id: variantId, expected_quantity: 5, unit_cost: 20 },
    ],
  });
  await page.goto(`http://localhost:5173/dashboard/purchase-orders/${poId}`);
  const draftPo = await row("store_purchase_orders", poId);
  for (const [button, state] of [
    ["Submit for approval", "pending_approval"],
    ["Approve PO", "approved"],
    ["Issue PO", "ordered"],
  ]) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await eventually(
      () => row("store_purchase_orders", poId),
      (po) => po.status === state,
      `PO ${state}`,
    );
    if (state === "pending_approval") {
      const pending = await row("store_purchase_orders", poId);
      assert.match(
        (
          await staff.rpc("approve_store_purchase_order_v2", {
            p_purchase_order_id: poId,
            p_expected_updated_at: draftPo.updated_at,
          })
        ).error?.message || "",
        /procurement_version_conflict/,
      );
      await verifiedStaff(editor, "editor", "editor");
      assert.match(
        (
          await editor.rpc("approve_store_purchase_order_v2", {
            p_purchase_order_id: poId,
            p_expected_updated_at: pending.updated_at,
          })
        ).error?.message || "",
        /dashboard admin required/,
      );
      await staff.from("store_purchase_orders").update({ status: "approved" }).eq("id", poId);
      assert.equal(
        (await row("store_purchase_orders", poId)).status,
        "pending_approval",
        "Direct writes must not bypass the lifecycle RPC",
      );
      checked(
        "pending PO locks retain version checks, admin-only approval and draft-only direct writes",
      );
    }
  }
  const poItem = data(
    await admin
      .from("store_purchase_order_items")
      .select("id")
      .eq("purchase_order_id", poId)
      .single(),
    "PO line",
  );
  const receiptId = await rpc(staff, "create_store_receiving", {
    p_purchase_order_id: poId,
    p_invoice_number: `${prefix}-invoice`,
    p_receiving_employee_label: "Acceptance staff",
    p_notes: null,
    p_lines: [
      {
        purchase_order_item_id: poItem.id,
        received_quantity: 3,
        damaged_quantity: 1,
        unit_cost: 20,
        overage_confirmed: false,
        overage_reason: null,
      },
    ],
  });
  assert.equal(await stock(), 18, "Draft receiving must not change stock");
  await page.goto(`http://localhost:5173/dashboard/receivings/${receiptId}`);
  await page.getByRole("button", { name: "Approve receiving", exact: true }).click();
  await eventually(
    () => row("store_receivings", receiptId),
    (r) => r.status === "approved",
    "receiving approval",
  );
  assert.equal(await stock(), 21, "Only three usable units enter stock; damaged unit does not");
  const approved = await row("store_receivings", receiptId);
  await staff.rpc("approve_store_receiving_v2", {
    p_receiving_id: receiptId,
    p_expected_updated_at: approved.updated_at,
  });
  assert.equal(await stock(), 21);
  assert.equal((await row("store_purchase_orders", poId)).status, "partially_received");
  checked(
    "staff browser approves and issues PO, approves receiving, excludes damage and prevents duplicate stock",
  );

  assert.deepEqual(pageErrors, []);
  console.log(
    JSON.stringify({
      passed: checks,
      browserErrors: pageErrors,
      backend: "local Supabase Auth + PostgREST + PostgreSQL and production create-order handler",
      productionWrites: false,
    }),
  );
} finally {
  await browser?.close();
  for (const child of children.reverse()) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      /* service already stopped */
    }
  }
  await staff.auth.signOut();
  await editor.auth.signOut();
  await customer.auth.signOut();
}
