import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/dashboard/App.tsx", import.meta.url), "utf8");
const page = await readFile(
  new URL("../src/dashboard/pages/CustomersPage.tsx", import.meta.url),
  "utf8",
);
const detail = await readFile(
  new URL("../src/dashboard/pages/CustomerDetailPage.tsx", import.meta.url),
  "utf8",
);
const data = await readFile(
  new URL("../src/dashboard/data/customers.ts", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL("../supabase/migrations/20260918214500_customer_managed_profile_protection.sql", import.meta.url),
  "utf8",
);

test("active customers routes use the Supabase CRM pages", () => {
  assert.match(app, /CustomersPageLive/);
  assert.match(app, /CustomerDetailPageLive/);
  assert.match(app, /route === "\/dashboard\/customers"[\s\S]+<CustomersPageLive \/>/);
  assert.match(app, /customerDetail[\s\S]+<CustomerDetailPageLive id=\{customerDetail\[1\]\} \/>/);
});

test("customers CRM contains no mock business data", () => {
  for (const source of [page, detail, data]) {
    assert.doesNotMatch(source, /@\/dashboard\/mock\//);
    assert.doesNotMatch(source, /1,206|284\.16|mock testing/i);
  }
});

test("customers CRM reads and writes real Supabase customer data", () => {
  assert.match(data, /from\("store_customers"\)/);
  assert.match(data, /rpc\("create_store_customer"/);
  assert.match(data, /rpc\("update_store_customer_profile"/);
  assert.match(data, /rpc\("get_store_customer_orders"/);
});

test("staff-managed customer profiles survive future order sync", () => {
  assert.match(migration, /is_profile_managed boolean not null default false/);
  assert.match(migration, /is_profile_managed = true/);
  assert.match(migration, /when public\.store_customers\.is_profile_managed then public\.store_customers\.name/);
  assert.match(migration, /total_orders = excluded\.total_orders/);
  assert.match(migration, /total_spent = excluded\.total_spent/);
});

test("customers UI exposes Shopify-style CRM controls", () => {
  assert.match(page, /Add customer/);
  assert.match(page, /VIP only/);
  assert.match(page, /Blocked only/);
  assert.match(detail, /Internal notes/);
  assert.match(detail, /VIP customer/);
  assert.match(detail, /Block customer/);
  assert.match(detail, /Order history/);
  assert.match(detail, /Unsaved customer changes/);
});
