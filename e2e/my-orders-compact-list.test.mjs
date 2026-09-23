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
const list = await readFile(
  new URL("../src/routes/my-orders.tsx", import.meta.url),
  "utf8",
);
const detail = await readFile(
  new URL("../src/routes/my-orders_.$orderId.tsx", import.meta.url),
  "utf8",
);
const routeTree = await readFile(
  new URL("../src/routeTree.gen.ts", import.meta.url),
  "utf8",
);

test("customer order list payload contains compact item previews without per-order item calls", () => {
  assert.match(edge, /preview_items: previewItems/);
  assert.match(edge, /item_count: itemCount/);
  assert.match(edge, /from\("store_order_items"\)/);
  assert.match(edge, /previewItemsByOrder/);
  assert.match(edge, /current\.length >= 2/);
  assert.match(edge, /preview image lookup/);
  assert.match(account, /CustomerOrderPreviewItem/);
  assert.match(account, /previewItems: Array\.isArray\(row\.preview_items\)/);
  assert.match(account, /itemCount: number\(row\.item_count\)/);
});

test("My Orders renders compact cards with two previews, quantity, other count, and total", () => {
  assert.match(list, /Active orders/);
  assert.match(list, /Past orders/);
  assert.match(list, /order\.previewItems\.map/);
  assert.match(list, /×\{item\.quantity\}/);
  assert.match(list, /otherCount/);
  assert.match(list, /formatMoney\(order\.total, order\.currency\)/);
  assert.match(list, /to="\/my-orders\/\$orderId"/);
  assert.match(list, /MiniOrderProgress/);
  assert.match(list, /MINI_ORDER_STAGES/);
  assert.doesNotMatch(list, /loadMyOrderItems/);
});

test("customer order cards link to a registered non-nested details route", () => {
  assert.match(detail, /createFileRoute\("\/my-orders\/\$orderId"\)/);
  assert.match(detail, /Route\.useParams\(\)/);
  assert.match(detail, /loadMyOrderItems\(orderId\)/);
  assert.match(detail, /Back to My orders/);
  assert.match(routeTree, /routes\/my-orders_\.\$orderId/);
  assert.match(routeTree, /'\/my-orders\/\$orderId': typeof MyOrdersOrderIdRoute/);
  assert.match(routeTree, /MyOrdersOrderIdRoute: MyOrdersOrderIdRoute/);
});
