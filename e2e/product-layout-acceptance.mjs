import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,expect} from '@playwright/test';
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
 if (!live) {
  const page = await createStorefrontPage(browser, {viewport:{width:320,height:540}});
  const recommendationRequests = [];
  page.on('request', request => {
    if (/\/ProductSuggestions-[^/]+\.js$/.test(request.url())) recommendationRequests.push(request.url());
  });
  await page.route('**/logo.svg?fixture-gallery-full=1', route => route.fulfill({status:404}));
  await page.goto(base+'/product/fixture-phone-1');
  await expect(page.getByTestId('product-buy-box').getByRole('button', {name:'Buy now'})).toBeVisible();
  const thumb = page.getByTestId('product-gallery-thumbnails').locator('img').first();
  const thumbnailSource = await thumb.getAttribute('src');
  assert.match(thumbnailSource, /^data:image\/svg\+xml/);
  await expect(page.getByRole('img', {name:'Front', exact:true})).toHaveAttribute('src', thumbnailSource);
  assert.deepEqual(recommendationRequests, []);
  await page.getByRole('button', {name:'Storage: 512GB'}).click();
  await expect(page.getByTestId('product-gallery-counter')).toHaveText('2 / 3');
  const zoom = page.getByRole('button', {name:'Zoom image'});
  await zoom.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('img', {name:'Side'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(zoom).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByRole('region', {name:'More from Samsung'})).toBeVisible();
  assert.equal(recommendationRequests.length, 1);
  let loadingFailed = true;
  await page.route(url => url.pathname.endsWith('/rest/v1/store_products') &&
    url.searchParams.get('handle') === 'eq.fixture-phone-4', route => loadingFailed
    ? route.fulfill({status:400, json:{message:'Temporary fixture failure'}})
    : route.fallback());
  await page.getByRole('region', {name:'More from Samsung'}).locator('a[href="/product/fixture-phone-4"]').first().click();
  await expect(page.getByRole('heading', {name:'Unable to load this product'})).toBeVisible();
  await expect(page.getByTestId('bottom-nav')).toBeVisible();
  loadingFailed = false;
  await page.getByRole('button', {name:'Try again'}).click();
  await expect(page.getByRole('heading', {name:'Samsung Fixture Phone 4'})).toBeVisible();
  await page.getByTestId('product-buy-box').getByRole('button', {name:'Buy now'}).click();
  await expect(page).toHaveURL(/\/cart$/);
  const unavailable = await page.goto(base+'/product/nonexistent-fixture-product');
  assert.equal(unavailable?.status(), 404);
  await expect(page.getByRole('heading', {name:'This product is unavailable'})).toBeVisible();
  await expect(page.getByTestId('bottom-nav')).toBeVisible();
  await expect(page.getByTestId('product-purchase-bar')).toHaveCount(0);
  console.log('PASS gallery fallback, variant media, accessible zoom, deferred suggestions, mobile checkout, retry and unavailable product');
  await page.close();
 }
 writeFileSync(`${output}/results.json`,JSON.stringify(reports,null,2)+'\n');
}finally{await browser.close();}
