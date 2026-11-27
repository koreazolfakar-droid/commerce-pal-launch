import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/dashboard/lib/productSave.ts', import.meta.url), 'utf8').catch(() => '');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
new Function('exports', js)(exports);

test('a save adopts server normalization only for fields unchanged since submission', () => {
  assert.equal(typeof exports.reconcileSavedFields, 'function');
  const result = exports.reconcileSavedFields(
    { title: 'Newer title', stock: '12', status: 'Archived' },
    { title: ' Submitted ', stock: '10', status: 'Draft' },
    { title: 'Submitted', stock: '9', status: 'Active' },
  );
  assert.deepEqual(result, { title: 'Newer title', stock: '12', status: 'Archived' });
  assert.deepEqual(exports.reconcileSavedFields(
    { title: ' Submitted ', stock: '10', status: 'Draft' },
    { title: ' Submitted ', stock: '10', status: 'Draft' },
    { title: 'Submitted', stock: '9', status: 'Active' },
  ), { title: 'Submitted', stock: '9', status: 'Active' });
});

test('a saved specification snapshot preserves new values, newly added keys and deletions', () => {
  assert.equal(typeof exports.reconcileSavedFields, 'function');
  assert.deepEqual(exports.reconcileSavedFields(
    { ram: '12GB', color: 'Black' },
    { ram: '8GB', storage: '128GB' },
    { ram: '8 GB', storage: '128 GB' },
  ), { ram: '12GB', color: 'Black' });
});

test('a partially created draft allows replacing a file that never uploaded without creating another product', async () => {
  const page=await readFile(new URL('../src/dashboard/pages/ProductFormPage.tsx',import.meta.url),'utf8');
  const ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declarations=[];function visit(node){if(ts.isVariableDeclaration(node)&&['removePendingImage','stageProductImages'].includes(node.name.getText(ast)))declarations.push('const '+node.getText(ast)+';');ts.forEachChild(node,visit)}visit(ast);
  const initial=[{preview:'blob:bad',file:new File(['corrupt'],'bad.jpg',{type:'image/jpeg'})}];let pending=initial;
  const partialDraftIdRef={current:'existing-partial-draft'};
  const deps={partialDraftIdRef,uploadedPreviewsRef:{current:new Set()},pendingImages:initial,queuedPreviewUrlsRef:{current:[]},setPendingImages:updater=>{pending=updater(pending)},setSaved:()=>{},setPublishError:()=>{},t:value=>value,toast:{info:()=>{},error:message=>{throw Error(message)}}};
  const js=ts.transpileModule(declarations.join('\n'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const {remove,stage}=new Function(...Object.keys(deps),js+';return {remove:removePendingImage,stage:stageProductImages}')(...Object.values(deps));
  remove(0);assert.equal(pending.length,0);
  stage([new File(['replacement'],'replacement.jpg',{type:'image/jpeg'})]);
  assert.equal(pending.length,1);assert.equal(pending[0].file.name,'replacement.jpg');
  assert.equal(partialDraftIdRef.current,'existing-partial-draft');
  URL.revokeObjectURL(pending[0].preview);
});
