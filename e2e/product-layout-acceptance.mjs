import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
import {createStorefrontPage} from './helpers/storefront-fixture-fetch.mjs';
import {runProductLayoutChecks} from './product-layout-browser-check.mjs';
const base=process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const live=process.env.PRODUCT_LAYOUT_LIVE === '1';
const output=process.env.PRODUCT_LAYOUT_REPORT_DIR || '/tmp/spacecall-product-layout-qa';mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const reports=[];
try {
 for(const [width,height,language,theme] of [[320,720,'en','light'],[360,800,'ar','light'],[390,844,'en','light'],[430,932,'ar','dark'],[768,1024,'ar','light'],[1440,1000,'en','dark']]){
  const page=live?await browser.newPage({viewport:{width,height}}):await createStorefrontPage(browser,{viewport:{width,height}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({language,theme})=>{localStorage.setItem('space-cell-language',language);localStorage.setItem('space-cell:theme',theme);localStorage.removeItem('space-call-cart');},{language,theme});
  const response=await page.goto(base+(live?'/product/honor-play20c':'/product/fixture-phone-1'),{waitUntil:'load'});assert.ok(response?.ok());
  const result=await page.evaluate(runProductLayoutChecks,{language,fixture:!live});assert.deepEqual(errors,[]);
  await page.screenshot({path:`${output}/${width}-${language}-${theme}.png`,fullPage:true});reports.push({...result,theme,errors});
  console.log(`PASS product layout ${width}px ${language}/${theme}: ${result.checks.length} real browser checks`);await page.close();
 }
 writeFileSync(`${output}/results.json`,JSON.stringify(reports,null,2)+'\n');
}finally{await browser.close();}
