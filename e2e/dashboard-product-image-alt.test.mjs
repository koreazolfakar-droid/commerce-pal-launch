import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

test('an alt text response preserves a newer edit typed while the request is pending', async () => {
  const source=await readFile(new URL('../src/dashboard/components/products/ProductMediaManager.tsx',import.meta.url),'utf8');
  const ast=ts.createSourceFile('media.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let fn;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='saveAlt')fn=n.getText(ast);ts.forEachChild(n,visit)}visit(ast);
  assert.ok(fn);let release;const gate=new Promise(resolve=>{release=resolve});
  let drafts={'image-id':'Rear view'};
  const helper={};new Function('exports',ts.transpileModule(await readFile(new URL('../src/dashboard/lib/productSave.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(helper);
  const deps={busyId:null,uploading:false,productId:'product-id',altDrafts:drafts,setBusyId:()=>{},setImages:()=>{},setAltDrafts:updater=>{drafts=updater(drafts)},updateDashboardProductImageAlt:async()=>{await gate;return{id:'image-id',altText:'Rear view'}},t:value=>value,toast:{success:()=>{},error:message=>{throw Error(message)}},...helper};
  const js=ts.transpileModule('const '+fn+';',{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const save=new Function(...Object.keys(deps),js+';return saveAlt')(...Object.values(deps));
  const pending=save({id:'image-id',altText:'Front view'});
  drafts={'image-id':'Newer close-up view'};release();await pending;
  assert.equal(drafts['image-id'],'Newer close-up view');
});

test('image alternative text updates are scoped to the image and its product and reject failed writes', async () => {
  const source=await readFile(new URL('../src/dashboard/data/catalog.ts',import.meta.url),'utf8');
  const ast=ts.createSourceFile('catalog.ts',source,ts.ScriptTarget.Latest,true);
  const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='updateDashboardProductImageAlt');
  assert.ok(fn,'image alt persistence must exist');
  let error=null;const filters=[];let payload;
  const query={update:values=>{payload=values;return query},eq:(...args)=>{filters.push(args);return query},select:()=>query,single:async()=>({data:{id:'image-id',product_id:'product-id',alt_text:payload.alt_text},error})};
  const deps={requireDashboardRole:async()=>{},supabase:{from:name=>{assert.equal(name,'store_product_images');return query}},throwIfError:(cause)=>{if(cause)throw Error(cause.message)},mapProductImage:row=>({id:row.id,altText:row.alt_text}),invalidateNativeStoreCache:()=>{},broadcastStorefrontRefresh:()=>{}};
  const js=ts.transpileModule(fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const update=new Function('exports',...Object.keys(deps),`${js};return updateDashboardProductImageAlt`)({},...Object.values(deps));
  assert.equal((await update('product-id','image-id','  Rear view  ')).altText,'Rear view');
  assert.deepEqual(filters,[['id','image-id'],['product_id','product-id']]);
  await assert.rejects(update('product-id','image-id','x'.repeat(501)),/500/);
  error={message:'permission denied'};
  await assert.rejects(update('product-id','image-id','Rear view'),/permission denied/);
});
