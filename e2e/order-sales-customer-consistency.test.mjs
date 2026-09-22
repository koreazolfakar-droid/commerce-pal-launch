import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [migration, orderDetail] = await Promise.all([
  readFile(
    new URL(
      "../supabase/migrations/20260922171000_order_sales_customer_consistency.sql",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(new URL("../src/dashboard/pages/OrderDetailPage.tsx", import.meta.url), "utf8"),
]);

test("DONE cannot create an unpaid sale snapshot", () => {
  assert.match(
    migration,
    /if p_status = 'done' and v_before\.payment_status = 'unpaid' then/,
  );
  assert.match(migration, /order_payment_required_before_done/);
  assert.match(orderDetail, /nextStatus !== "done" \|\| order\.paymentStatus !== "unpaid"/);
  assert.match(orderDetail, /Mark the payment as paid before completing this order/);
});

test("post-completion payment changes keep the sales ledger aligned", () => {
  assert.match(
    migration,
    /update public\.store_sales\s+set payment_status = v_after\.payment_status/s,
  );
  assert.match(migration, /where order_id = p_order_id/);
  assert.match(
    migration,
    /update public\.store_sales as sale\s+set payment_status = orders\.payment_status/s,
  );
});

test("customer aggregates exclude cancelled orders and count completed spend only", () => {
  assert.match(
    migration,
    /count\(\*\) filter \(where status <> 'cancelled'\)::integer/,
  );
  assert.match(
    migration,
    /when status = 'done' and payment_status <> 'refunded' then total/,
  );
  assert.match(
    migration,
    /max\(created_at\) filter \(where status <> 'cancelled'\)/,
  );
  assert.match(migration, /perform private\.rebuild_customer_from_phone\(customer_row\.phone\)/);
});

test("payment selector exposes only valid forward transitions", () => {
  assert.match(
    orderDetail,
    /if \(status === "unpaid"\) return \["unpaid", "paid"\]/,
  );
  assert.match(
    orderDetail,
    /if \(status === "paid"\) return \["paid", "partially_refunded", "refunded"\]/,
  );
  assert.match(
    orderDetail,
    /if \(status === "partially_refunded"\) return \["partially_refunded", "refunded"\]/,
  );
  assert.match(orderDetail, /return \["refunded"\]/);
  assert.match(orderDetail, /allowedPaymentStatuses\.map/);
});
