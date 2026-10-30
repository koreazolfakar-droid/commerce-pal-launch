import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("variant metadata preserves concurrent sale; explicit stale stock fails atomically", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("./fixtures/product-editor-stock-schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const old = await readFile(
      new URL(
        "../supabase/migrations/20260919082451_product_management_step5.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(
      old.slice(
        old.indexOf("create or replace function public.update_store_product_variant("),
        old.indexOf("create or replace function public.reorder_store_product_variants("),
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261030171232_guard_variant_editor_stock.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const p = "00000000-0000-4000-8000-000000000001",
      v = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into store_products(id,title,handle) values ($1,'Phone','phone')", [p]);
    await db.query(
      "insert into store_product_variants(id,product_id,title,price,stock_quantity) values ($1,$2,'Black',100,9)",
      [v, p],
    );
    const save = (stock, expected) =>
      db.query(
        "select * from update_store_product_variant_guarded($1,'Blue','SKU','',100,null,$2,true,false,'{}','',0,true,$3)",
        [v, stock, expected],
      );
    await save(null, 10);
    assert.deepEqual(
      (await db.query("select title,stock_quantity from store_product_variants")).rows,
      [{ title: "Blue", stock_quantity: 9 }],
    );
    assert.equal((await db.query("select * from store_inventory_movements")).rows.length, 0);
    await assert.rejects(save(12, 10), /Stock changed in another session/);
    assert.equal(
      (await db.query("select stock_quantity from store_product_variants")).rows[0].stock_quantity,
      9,
    );
    await save(0, 9);
    assert.equal(
      (await db.query("select stock_quantity from store_product_variants")).rows[0].stock_quantity,
      0,
    );
    assert.deepEqual(
      (await db.query("select quantity_delta from store_inventory_movements")).rows,
      [{ quantity_delta: -9 }],
    );
    await db.exec(
      "create or replace function private.is_dashboard_staff() returns boolean language sql as $$ select false $$",
    );
    await assert.rejects(save(null, 0), /dashboard staff required/);
  } finally {
    await db.close();
  }
});
