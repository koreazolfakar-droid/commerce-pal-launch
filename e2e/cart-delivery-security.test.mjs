import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const cart = await readFile(new URL("../src/routes/cart.tsx", import.meta.url), "utf8");
const checkoutRoute = await readFile(
  new URL("../src/routes/checkout.tsx", import.meta.url),
  "utf8",
);
const checkout = await readFile(
  new URL("../src/components/CheckoutDetailsForm.tsx", import.meta.url),
  "utf8",
);
const client = await readFile(new URL("../src/lib/orderCheckout.ts", import.meta.url), "utf8");
const edge = await readFile(
  new URL("../supabase/functions/create-order/index.ts", import.meta.url),
  "utf8",
);
const settings = await readFile(
  new URL("../src/dashboard/data/settings.ts", import.meta.url),
  "utf8",
);
const settingsPage = await readFile(
  new URL("../src/dashboard/pages/SettingsPage.tsx", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL(
    "../supabase/migrations/20260921064500_harden_cart_delivery_pricing.sql",
    import.meta.url,
  ),
  "utf8",
);

test("shopper-visible subtotal and delivery fee are sent only as pricing expectations", () => {
  assert.match(cart, /const deliveryFee =/);
  assert.match(checkoutRoute, /deliveryFee=\{deliveryFee\}/);
  assert.match(checkout, /expectedSubtotal: total/);
  assert.match(checkout, /expectedDeliveryFee: deliveryFee/);

  const bodyStart = client.indexOf("const body = {");
  const invokeStart = client.indexOf("supabase.functions.invoke", bodyStart);
  assert.ok(
    bodyStart > 0 && invokeStart > bodyStart,
    "checkout request body should be identifiable",
  );
  const requestBodySource = client.slice(bodyStart, invokeStart);

  assert.match(requestBodySource, /expected_subtotal:/);
  assert.match(requestBodySource, /expected_delivery_fee:/);
  assert.doesNotMatch(requestBodySource, /shipping_total\s*:/);
});

test("checkout blocks silent price changes before WhatsApp or stock completion", () => {
  assert.match(edge, /pricing_changed/);
  assert.match(edge, /code === "pricing_changed"/);
  assert.match(migration, /v_expected_subtotal is distinct from v_subtotal/);
  assert.match(migration, /v_expected_delivery_fee is distinct from v_shipping_total/);
  assert.match(checkout, /code\.includes\("pricing_changed"\)/);
  assert.match(checkout, /Promise\.all\(\[syncCart\(\), refetchCms\(\)\]\)/);
});

test("delivery fee configuration fails closed instead of silently becoming free", () => {
  assert.match(migration, /cms_site_settings_delivery_fee_valid/);
  assert.match(migration, /v_delivery_fee_text is null/);
  assert.match(migration, /raise exception 'invalid_delivery_fee_config'/);
  assert.doesNotMatch(migration, /v_shipping_total := coalesce\(v_shipping_total, 0\)/);
});

test("global delivery fee is admin-only and audited", () => {
  assert.match(migration, /dashboard_staff_site_settings_update/);
  assert.match(migration, /key <> 'delivery_fee'/);
  assert.match(migration, /private\.is_dashboard_admin\(\)/);
  assert.match(migration, /audit_delivery_fee_change/);
  assert.match(migration, /delivery_fee_updated/);
  assert.match(settings, /role === "admin"/);
  assert.match(settings, /definition\.key !== "delivery_fee"/);
  assert.match(settingsPage, /disabled=\{role !== "admin"\}/);
});

test("edge validation requires real delivery details and bounded expected pricing", () => {
  assert.match(edge, /customer_city_required/);
  assert.match(edge, /customer_address_required/);
  assert.match(edge, /isMoney\(payload\.expected_subtotal, 1_000_000_000\)/);
  assert.match(edge, /isMoney\(payload\.expected_delivery_fee, 10_000\)/);
  assert.match(edge, /point\.accuracy > 100_000/);
});
