import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const details = await readFile(
  new URL("../src/routes/my-orders.$orderId.tsx", import.meta.url),
  "utf8",
);

test("order details keeps the five-stage customer tracker with timestamps", () => {
  assert.match(details, /CUSTOMER_STAGES/);
  assert.match(details, /Received/);
  assert.match(details, /Preparing/);
  assert.match(details, /Ready/);
  assert.match(details, /On the way/);
  assert.match(details, /Delivered/);
  assert.match(details, /stageTime\(order, stage\)/);
  assert.match(details, /formatStageTime/);
});

test("order details shows product image quantity unit price and line total", () => {
  assert.match(details, /item\.imageUrl/);
  assert.match(details, /×\{item\.quantity\}/);
  assert.match(details, /formatMoney\(item\.unitPrice, currency\)/);
  assert.match(details, /formatMoney\(item\.lineTotal, currency\)/);
  assert.match(details, /each/);
});

test("order details shows delivery payment and final pricing summary", () => {
  assert.match(details, /Delivery & payment/);
  assert.match(details, /order\.deliveryAddress/);
  assert.match(details, /order\.paymentMethod/);
  assert.match(details, /Order summary/);
  assert.match(details, /order\.subtotal/);
  assert.match(details, /order\.shippingTotal/);
  assert.match(details, /order\.discountTotal/);
  assert.match(details, /order\.total/);
});
