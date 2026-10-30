import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const root = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const source = await root("src/dashboard/lib/orderDeliveryLocation.ts");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const {
  parseOrderDeliveryLocation,
  orderLocationDirectionsUrl,
  orderLocationMapUrl,
  formatOrderCoordinates,
} = await import("data:text/javascript;charset=utf-8," + encodeURIComponent(transpiled));

test("order coordinates accept saved JSON pins and legacy JSON strings", () => {
  const expected = { latitude: 33.8938, longitude: 35.5018, accuracy: 20 };
  assert.deepEqual(parseOrderDeliveryLocation(expected), expected);
  assert.deepEqual(parseOrderDeliveryLocation(JSON.stringify(expected)), expected);
  assert.deepEqual(
    parseOrderDeliveryLocation({ latitude: 33.8, longitude: 35.5, accuracy: 0 }),
    { latitude: 33.8, longitude: 35.5, accuracy: null },
  );
  assert.deepEqual(
    parseOrderDeliveryLocation({ latitude: 0, longitude: 0 }),
    { latitude: 0, longitude: 0, accuracy: null },
  );
});

test("invalid and unshared locations never render a map link", () => {
  for (const value of [
    null,
    undefined,
    "",
    "{}",
    "not json",
    {},
    [],
    { latitude: "33.89", longitude: 35.5 },
    { latitude: Number.NaN, longitude: 35.5 },
    { latitude: Number.POSITIVE_INFINITY, longitude: 35.5 },
    { latitude: 91, longitude: 35.5 },
    { latitude: -91, longitude: 35.5 },
    { latitude: 33, longitude: 181 },
    { latitude: 33, longitude: -181 },
    { latitude: 33, longitude: 35, accuracy: -1 },
    { latitude: 33, longitude: 35, accuracy: "10" },
    { latitude: 33, longitude: 35, accuracy: Number.NaN },
  ]) {
    assert.equal(parseOrderDeliveryLocation(value), null);
  }
});

test("map and navigation links use a validated immutable order pin", () => {
  const point = parseOrderDeliveryLocation({ latitude: 33.8938, longitude: 35.5018 });
  assert.ok(point);
  assert.equal(formatOrderCoordinates(point), "33.893800, 35.501800");
  assert.match(orderLocationMapUrl(point), /^https:\/\/maps\.google\.com\/maps\?q=33\.893800,35\.501800/);
  assert.match(orderLocationDirectionsUrl(point), /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
});

test("staff-only order detail and quick view render the same delivery pin without customer address lookups", async () => {
  const [details, quick, data, ui, checkout] = await Promise.all([
    root("src/dashboard/pages/OrderDetailPage.tsx"),
    root("src/dashboard/components/orders/OrderQuickDrawer.tsx"),
    root("src/dashboard/data/orders.ts"),
    root("src/dashboard/components/orders/OrderDeliveryLocation.tsx"),
    root("src/components/CheckoutDetailsForm.tsx"),
  ]);
  assert.match(details, /<OrderDeliveryLocation value=\{order\.deliveryLocation\}/);
  assert.match(quick, /<OrderDeliveryLocation value=\{order\.deliveryLocation\} compact/);
  assert.match(data, /await requireDashboardStaff\(\)/);
  assert.match(data, /deliveryLocation: order\.delivery_location/);
  assert.doesNotMatch(data, /delivery_location: string \| null/);
  assert.match(ui, /data-testid="order-location-missing"/);
  assert.match(ui, /referrerPolicy="no-referrer"/);
  assert.match(ui, /rel="noopener noreferrer"/);
  assert.match(checkout, /shareLocation && resolvedLocation/);
});
