import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/productOptionDisplay.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {productOptionKind,productOptionLabel,productOptionValue}=await import('data:text/javascript,'+encodeURIComponent(js));
test('option labels are consistent across merchant spelling and both storefront languages',()=>{
 for(const name of ['color','Colour','Finish','اللون']){assert.equal(productOptionKind(name),'color');assert.equal(productOptionLabel(name,'en'),'Color');assert.equal(productOptionLabel(name,'ar'),'اللون');}
 assert.equal(productOptionLabel('storage','en'),'Storage');assert.equal(productOptionLabel('storage','ar'),'التخزين');assert.equal(productOptionLabel('Package','ar'),'Package');
});
test('display-only units preserve existing units and unrelated numeric options',()=>{
 assert.equal(productOptionValue('storage','128'),'128GB');assert.equal(productOptionValue('RAM','8'),'8GB');assert.equal(productOptionValue('Storage','1TB'),'1TB');assert.equal(productOptionValue('Storage','256 GB'),'256 GB');assert.equal(productOptionValue('Size','128'),'128');assert.equal(productOptionValue('Color','أسود'),'أسود');
});
