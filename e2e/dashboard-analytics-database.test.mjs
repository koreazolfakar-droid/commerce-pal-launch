import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(
  new URL(
    "../supabase/migrations/20261116223007_dashboard_analytics_upgrades.sql",
    import.meta.url,
  ),
  "utf8",
);
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function database() {
  const db = new PGlite();
  await db.exec(`
 create role anon; create role authenticated;
 create schema auth; create schema private;
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
 create function private.is_dashboard_staff() returns boolean language sql as $$ select coalesce(current_setting('test.staff',true),'false')='true' $$;
 create table store_products(id uuid primary key,title text,sku text,status text,brand_id uuid);
 create table store_product_variants(id uuid primary key,product_id uuid,title text,sku text,image_url text,stock_quantity integer,track_inventory boolean,is_active boolean);
 create table store_product_images(product_id uuid,url text,is_primary boolean,sort_order integer);
 create table store_orders(id uuid primary key,created_at timestamptz,currency text,public_order_number text default '100',customer_name text default 'Customer',total numeric default 0,status text default 'new',payment_status text default 'unpaid');
 create table store_sales(order_id uuid,subtotal numeric,discount_total numeric,total numeric,completed_at timestamptz,payment_status text,currency text);
 create table store_order_items(order_id uuid,product_id uuid,quantity integer,line_total numeric);
 create table store_customers(id uuid); create table cms_brands(id uuid,is_visible boolean,name text);
 `);
  await db.exec(migration);
  await db.query("select set_config('test.uid',$1,false),set_config('test.staff','true',false)", [
    uid(999),
  ]);
  return db;
}
async function snapshot(db, compare = true, currency = "USD") {
  return (
    await db.query("select get_dashboard_analytics_snapshot($1,$2,$3,$4) as value", [
      "2026-11-10T00:00:00Z",
      "2026-11-17T00:00:00Z",
      compare,
      currency,
    ])
  ).rows[0].value;
}
test("analytics SQL uses eligible sale subtotals, discounts, completion time, distinct orders and separate currencies", async () => {
  const db = await database();
  try {
    for (let n = 1; n <= 4; n++)
      await db.query("insert into store_products(id,title,sku,status) values ($1,$2,$3,$4)", [
        uid(n),
        n <= 2 ? "Same name" : `Product ${n}`,
        `SKU-${n}`,
        "active",
      ]);
    for (let n = 1; n <= 5; n++) {
      await db.query("insert into store_orders(id,created_at,currency) values ($1,$2,$3)", [
        uid(10 + n),
        n === 5 ? "2026-11-09T23:59:59Z" : "2026-11-10T00:00:00Z",
        n === 4 ? "LBP" : "USD",
      ]);
      await db.query("insert into store_sales values ($1,100,10,95,$2,$3,$4)", [
        uid(10 + n),
        n === 5 ? "2026-11-09T23:59:59Z" : "2026-11-10T00:00:00Z",
        n === 3 ? "refunded" : n === 2 ? "partially_refunded" : "paid",
        n === 4 ? "LBP" : "USD",
      ]);
    }
    // Multiple items for the same product in an order must count one order.
    await db.query("insert into store_order_items values ($1,$2,2,50),($1,$2,1,25),($3,$4,1,100)", [
      uid(11),
      uid(1),
      uid(12),
      uid(2),
    ]);
    await db.query(
      "insert into store_product_variants values ($1,$2,'Blue','SKU-1',null,2,true,true),($3,$2,'Black','B',null,0,true,true),($4,$5,'Ignored','I',null,99,false,true),($6,$5,'Inactive','N',null,99,true,false)",
      [uid(101), uid(1), uid(102), uid(103), uid(2), uid(104)],
    );
    await db.query("insert into cms_brands values ($1,true,'Space')", [uid(900)]);
    await db.query("update store_products set brand_id=$1 where id=$2", [uid(900), uid(1)]);
    const result = await snapshot(db);
    assert.equal(result.recentOrders.length, 5);
    assert.equal(result.topBrands[0].revenue, 75);
    assert.equal(result.topBrands[0].share, 100);
    assert.equal(result.current.grossSales, 200);
    assert.equal(result.current.netSales, 180);
    assert.equal(result.current.paidOrders, 2);
    assert.equal(result.current.aov, 90);
    assert.equal(result.current.orders, 3);
    assert.equal(result.previous.grossSales, 100);
    assert.equal(result.catalog.totalUnits, 2);
    assert.equal(result.catalog.lowStock, 1);
    assert.equal(result.catalog.outOfStock, 1);
    assert.equal(result.catalog.criticalStock, 1);
    assert.equal(result.products.topSelling[0].units, 3);
    assert.equal(result.products.topSelling[0].orders, 1);
    assert.equal(result.products.topSelling[0].revenue, 75);
    assert.equal(result.products.topSelling.length, 2);
    assert.ok(result.products.lowestPerforming.some((p) => p.units === 0));
    assert.equal(result.trend.length, 7);
    assert.equal(result.trend[0].revenue, 180);
    assert.equal(result.trend[0].orders, 3);
    assert.equal((await snapshot(db, false)).previous, null);
    assert.equal((await snapshot(db, true, "LBP")).current.grossSales, 100);
  } finally {
    await db.close();
  }
});
test("analytics rejects guests, nonstaff and invalid or excessive periods and revokes anonymous execution", async () => {
  const db = await database();
  try {
    await db.exec("select set_config('test.staff','false',false)");
    await assert.rejects(snapshot(db), /dashboard staff required/);
    await db.exec("select set_config('test.staff','true',false),set_config('test.uid','',false)");
    await assert.rejects(snapshot(db), /dashboard staff required/);
    await db.query("select set_config('test.uid',$1,false)", [uid(999)]);
    await assert.rejects(
      db.query("select get_dashboard_analytics_snapshot('2020-01-01','2026-01-01')"),
      /invalid analytics period/,
    );
    await assert.rejects(
      db.query("select get_dashboard_analytics_snapshot('infinity','infinity')"),
      /invalid analytics period/,
    );
    const acl = await db.query(
      "select has_function_privilege('anon','get_dashboard_analytics_snapshot(timestamptz,timestamptz,boolean,text)','execute') as allowed",
    );
    assert.equal(acl.rows[0].allowed, false);
  } finally {
    await db.close();
  }
});
test("inventory alerts prioritize severity, search the whole dataset and page stable results", async () => {
  const db = await database();
  try {
    await db.query(
      "insert into store_products(id,title,sku,status) values ($1,'Phone','P','active')",
      [uid(1)],
    );
    for (const [n, stock] of [
      [1, 8],
      [2, 2],
      [3, 0],
      [4, 3],
      [5, 11],
    ])
      await db.query(
        "insert into store_product_variants values ($1,$2,'Blue',$3,null,$4,true,true)",
        [uid(100 + n), uid(1), `SKU-${n}`, stock],
      );
    const load = async (search = "", status = "all", sort = "severity", page = 1) =>
      (
        await db.query("select get_dashboard_inventory_alerts($1,$2,$3,$4,2) as value", [
          search,
          status,
          sort,
          page,
        ])
      ).rows[0].value;
    const first = await load();
    assert.equal(first.total, 4);
    assert.deepEqual(
      first.items.map((i) => i.status),
      ["out", "critical"],
    );
    assert.deepEqual(
      (await load("", "all", "severity", 2)).items.map((i) => i.stock),
      [3, 8],
    );
    assert.equal((await load("SKU-1")).items[0].stock, 8);
    assert.equal((await load("Phone", "low")).total, 1);
    assert.equal((await load("", "critical")).total, 2);
    assert.equal((await load("", "all", "stock-desc")).items[0].stock, 8);
    assert.equal((await load("no match")).total, 0);
    await db.exec("select set_config('test.staff','false',false)");
    await assert.rejects(load(), /dashboard staff required/);
  } finally {
    await db.close();
  }
});

test("empty analytics returns zero metrics, zero-filled days and empty lists", async () => {
  const db = await database();
  try {
    const result = await snapshot(db);
    assert.deepEqual(result.current, {
      grossSales: 0,
      netSales: 0,
      orders: 0,
      paidOrders: 0,
      aov: 0,
    });
    assert.equal(result.trend.length, 7);
    assert.ok(result.trend.every((p) => p.revenue === 0 && p.orders === 0));
    assert.deepEqual(result.products, {
      topSelling: [],
      lowestPerforming: [],
      highestRevenue: [],
      restock: [],
    });
    assert.deepEqual(result.recentOrders, []);
    assert.deepEqual(result.topBrands, []);
  } finally {
    await db.close();
  }
});

test("analytics executes with caller RLS and anonymous callers cannot execute either RPC", async () => {
  const db = await database();
  try {
    await db.query(
      "insert into store_sales(order_id,subtotal,discount_total,total,completed_at,payment_status,currency) values ($1,100,0,100,'2026-11-11','paid','LBP')",
      [uid(1)],
    );
    await db.exec(`grant usage on schema public,private,auth to authenticated;
   grant select on all tables in schema public to authenticated;
   alter table store_sales enable row level security;
   create policy test_currency_scope on store_sales for select to authenticated using (currency='USD');
   set role authenticated;`);
    assert.equal(
      (await snapshot(db, true, "LBP")).current.grossSales,
      0,
      "SECURITY INVOKER must honor caller row policies",
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(snapshot(db), /permission denied for function/);
    await assert.rejects(
      db.query("select get_dashboard_inventory_alerts()"),
      /permission denied for function/,
    );
  } finally {
    await db.close();
  }
});
