import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("metadata-only saves preserve multi-variant pricing, quantities and movements even for a free variant", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL("./fixtures/product-editor-stock-schema.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/20261102002908_product_editor_owned_field_validation.sql", import.meta.url), "utf8"));
    const id = "00000000-0000-4000-8000-000000000001";
    await db.query("insert into store_products(id,title,handle,status,stock_quantity) values ($1,'Phone','phone','draft',5)", [id]);
    await db.query("insert into store_product_variants(product_id,title,price,stock_quantity) values ($1,'Free',0,2),($1,'Paid',100,3)", [id]);
    const save = (productId, price, stock, image = "") => db.query("select save_store_product_editor($1::uuid,'Updated','Description',null::uuid,null::uuid,'draft',$2::numeric,null::numeric,'','',$3::integer,$4::text,'','','{}'::jsonb,'{}'::uuid[],null::integer) as result", [productId, price, stock, image]);
    assert.equal((await save(id, 0, -1)).rows[0].result.variant_managed_separately, true);
    assert.deepEqual((await db.query("select price::text,stock_quantity from store_product_variants order by price")).rows,
      [{ price: "0", stock_quantity: 2 }, { price: "100", stock_quantity: 3 }]);
    assert.equal((await db.query("select count(*)::int as count from store_inventory_movements")).rows[0].count, 0);
    const image = "https://example.com/phone.webp";
    await db.query("insert into store_product_images(product_id,url,alt_text,is_primary) values ($1,$2,'Custom front view',true)", [id,image]);
    await save(id, 0, -1, image);
    assert.equal((await db.query("select alt_text from store_product_images where product_id=$1", [id])).rows[0].alt_text, "Custom front view");
    await assert.rejects(save(null, 0, 0), /price must be greater than zero/);
    await db.query("delete from store_product_variants where price=0");
    await assert.rejects(save(id, 0, 0), /price must be greater than zero/);
    await assert.rejects(save(id, 100, -1), /stock cannot be negative/);
    await db.exec("create or replace function private.is_dashboard_staff() returns boolean language sql as $$ select false $$;");
    await assert.rejects(save(id, 100, 1), /dashboard staff required/);
    const signature = "save_store_product_editor(uuid,text,text,uuid,uuid,text,numeric,numeric,text,text,integer,text,text,text,jsonb,uuid[],integer)";
    assert.deepEqual((await db.query("select has_function_privilege('anon',$1,'execute') as anon, has_function_privilege('authenticated',$1,'execute') as staff", [signature])).rows, [{ anon: false, staff: true }]);
  } finally { await db.close(); }
});
