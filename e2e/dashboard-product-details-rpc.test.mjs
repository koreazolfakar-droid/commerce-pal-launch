import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('extended editor persists organization and Arabic atomically with guarded stock and staff authorization', async () => {
  const dir = new URL('../supabase/migrations/', import.meta.url);
  const filename = (await readdir(dir)).find(name => name.endsWith('_product_editor_details.sql'));
  assert.ok(filename, 'product details migration must exist');
  const migration = await readFile(new URL(filename, dir), 'utf8');
  assert.match(migration, /save_store_product_editor_details/);
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL('./fixtures/product-editor-stock-schema.sql', import.meta.url), 'utf8'));
    await db.exec("alter table store_products add tags text[] default '{}', add title_ar text, add description_ar text, add description_html text;");
    for (const file of ['20260928061000_atomic_product_editor_specifications.sql','20261005000000_product_editor_stock_concurrency.sql','20261021193000_product_editor_specifications_shape_compat.sql']) {
      await db.exec(await readFile(new URL(file, dir), 'utf8'));
    }
    await db.exec(migration);
    const editor = {p_product_id:null,p_title:'Phone',p_description:'New description',p_brand_id:null,p_category_id:null,p_status:'draft',p_price:100,p_compare_at_price:null,p_sku:'SKU',p_barcode:'',p_stock:8,p_image_url:'',p_seo_title:'',p_seo_description:'',p_specifications:{},p_collection_ids:[],p_expected_stock:null};
    const details = { productType:'Smartphone', tags:['  Phone  ','Phone','Android'], titleAr:'هاتف',descriptionAr:'وصف عربي' };
    async function save(input=editor, organization=details) {
      return (await db.query('select save_store_product_editor_details($1::jsonb,$2::jsonb) as saved',[JSON.stringify(input),JSON.stringify(organization)])).rows[0].saved;
    }
    const created=await save();
    assert.ok(created.id);
    let row=(await db.query('select * from store_products where id=$1',[created.id])).rows[0];
    assert.equal(row.product_type,'Smartphone');assert.equal(row.title_ar,'هاتف');
    assert.deepEqual(row.tags,['Android','Phone']);
    assert.equal(row.status,'draft');
    await db.query("insert into store_product_images(product_id,url,alt_text,is_primary) values($1,'https://example.test/photo.webp','Rear view',true)",[created.id]);
    await save({...editor,p_product_id:created.id,p_image_url:'https://example.test/photo.webp'});
    assert.equal((await db.query('select alt_text from store_product_images where product_id=$1',[created.id])).rows[0].alt_text,'Rear view');
    await db.query("delete from store_product_images where product_id=$1",[created.id]);
    await db.query("insert into store_product_images(product_id,url,alt_text,is_primary) values($1,'https://example.test/new.webp','Side view',true)",[created.id]);
    await save({...editor,p_product_id:created.id,p_image_url:'https://example.test/photo.webp'});
    assert.deepEqual((await db.query('select url,alt_text from store_product_images where product_id=$1',[created.id])).rows,[{url:'https://example.test/new.webp',alt_text:'Side view'}]);
    await db.query("update store_products set description_html='<p>Old description</p>' where id=$1",[created.id]);
    await save({...editor,p_product_id:created.id});
    assert.equal((await db.query('select description_html from store_products where id=$1',[created.id])).rows[0].description_html,'<p>Old description</p>');
    await save({...editor,p_product_id:created.id,p_description:'Changed description'});
    assert.equal((await db.query('select description_html from store_products where id=$1',[created.id])).rows[0].description_html,null);
    await assert.rejects(save({...editor,p_product_id:created.id,p_title:'Must roll back'},{...details,tags:['x'.repeat(256)]}),/tag/i);
    row=(await db.query('select title from store_products where id=$1',[created.id])).rows[0];assert.equal(row.title,'Phone');
    await assert.rejects(save({...editor,p_product_id:created.id,p_stock:11,p_expected_stock:99}),/stock_conflict/);
    const grants=(await db.query("select has_function_privilege('anon','save_store_product_editor_details(jsonb,jsonb)','execute') as anon,has_function_privilege('authenticated','save_store_product_editor_details(jsonb,jsonb)','execute') as staff")).rows[0];
    assert.deepEqual(grants,{anon:false,staff:true});
    await db.exec('create or replace function private.is_dashboard_staff() returns boolean language sql as $$ select false $$');
    await assert.rejects(save(),/staff required/);
  } finally { await db.close(); }
});
