import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createDashboardBrowser } from "./helpers/dashboard-browser.mjs";

const { browser, context, id: userId } = await createDashboardBrowser();
const origin = process.env.SPACE_CALL_DASHBOARD_ORIGIN || "http://127.0.0.1:5173";
const productId = "00000000-0000-4000-8000-000000000020";
const variantId = "00000000-0000-4000-8000-000000000021";
const brandId = "00000000-0000-4000-8000-000000000022";
const categoryId = "00000000-0000-4000-8000-000000000023";
const collectionId = "00000000-0000-4000-8000-000000000024";
const now = new Date().toISOString();
const evidence = process.env.SPACE_CALL_EDITOR_EVIDENCE || "/tmp/space-call-evidence/after";
await mkdir(evidence, { recursive: true });
const results = [];
const errors = [];
const requests = [];
let product = null;
let failSave = false;
let failAlt = false;
let variant = { id: variantId, product_id: productId, title: "Default", sku: "", barcode: "", price: 100, compare_at_price: null, stock_quantity: 3, track_inventory: true, allow_backorder: false, options: {}, image_url: "", sort_order: 0, is_active: true, created_at: now, updated_at: now };
const images = [{ id: "image-1", product_id: productId, url: "https://example.test/photo.svg", alt_text: "Front view", sort_order: 0, is_primary: true, created_at: now }];
await context.route("https://example.test/**", route => route.fulfill({contentType:"image/svg+xml", body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#dbe4ef"/></svg>'}));
await context.route("**/rest/v1/**", async route => {
  const request=route.request(); const url=new URL(request.url());const name=url.pathname.split("/").at(-1);
  const json=(value)=>route.fulfill({json:value,headers:{"content-range":"0-0/1"}});
  if(name==="user_roles")return json({user_id:userId,role:"admin",mfa_required:true,mfa_enrolled_at:now});
  if(Number(url.searchParams.get("offset")||0)>0)return json([]);
  if(name==="cms_brands")return json([{id:brandId,name:"Space",slug:"space",is_visible:true}]);
  if(name==="store_categories")return json([{id:categoryId,name:"Phones",slug:"phones",is_active:true,spec_template:{sections:[]}}]);
  if(name==="store_collections")return json([{id:collectionId,title:"Featured",handle:"featured",is_active:true}]);
  if(name==="store_collection_products")return json(product?.collections?.map(collection_id=>({collection_id}))||[]);
  if(name==="store_product_variants")return json(product?[variant]:[]);
  if(name==="store_product_images"){
    if(request.method()==="PATCH"){
      if(failAlt)return route.fulfill({status:403,json:{message:"Alternative text denied. Retry."}});
      Object.assign(images[0],request.postDataJSON());return json(images[0]);
    }
    return json(product?images:[]);
  }
  if(name==="store_products")return json(product);
  if(name==="save_store_product_editor_details"){
    const body=request.postDataJSON();requests.push(body);
    if(failSave)return route.fulfill({status:503,json:{message:"Save unavailable. Retry."}});
    const p=body.p_editor,d=body.p_details;
    product={id:productId,handle:"qa-phone",title:p.p_title,description:p.p_description,title_ar:d.titleAr,description_ar:d.descriptionAr,product_type:d.productType,tags:d.tags,brand_id:p.p_brand_id,category_id:p.p_category_id,status:p.p_status,base_price:p.p_price,compare_at_price:p.p_compare_at_price,stock_quantity:p.p_stock,sku:p.p_sku,barcode:p.p_barcode,seo_title:p.p_seo_title,seo_description:p.p_seo_description,specifications:{values:p.p_specifications,keySpecs:[]},average_cost:65,collections:p.p_collection_ids};
    variant={...variant,price:p.p_price,compare_at_price:p.p_compare_at_price,sku:p.p_sku,barcode:p.p_barcode,stock_quantity:p.p_stock};
    return json({id:productId,handle:product.handle,stock:variant.stock_quantity,variant_managed_separately:false});
  }
  if(name==="update_store_product_variant"){
    const p=request.postDataJSON();variant={...variant,options:p.p_options};return json(variant);
  }
  return route.fallback();
});
const page=await context.newPage();
await page.emulateMedia({ reducedMotion: "reduce" });
page.on("pageerror",error=>errors.push(error.message));
page.on("dialog",dialog=>dialog.accept());
try{
  await page.goto(`${origin}/dashboard/products/new`);
  await page.getByLabel("Title",{exact:true}).waitFor();
  for(const width of [320,360,375,390,430,600,768,980,1024,1280,1440,1600,1920]){
    await page.setViewportSize({width,height:900});
    await page.getByLabel("Title",{exact:true}).waitFor();
    await page.locator('#product-pricing input').first().waitFor();
    const metrics=await page.evaluate(()=>{
      const price=document.querySelector('#product-pricing input').getBoundingClientRect();
      return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,priceWidth:price.width};
    });
    assert.ok(metrics.documentWidth<=width+1,`page overflow at ${width}px`);
    assert.ok(metrics.priceWidth>=159,`price field too narrow: ${metrics.priceWidth}px at ${width}px`);
    for(const label of ["General","Media","Collections","Variants","Specifications","SEO","Publishing","Pricing","Inventory","Shipping","Advanced","Product organization"]){
      await page.getByRole("navigation",{name:"Product sections",exact:true}).getByRole("button",{name:label,exact:true}).click();
    }
    if([320,390,768,980,1280,1440,1920].includes(width)){
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:`${evidence}/editor-${width}.png`,fullPage:true});
    }
    results.push({case:"responsive editor and 12 section destinations",width,pass:true,...metrics});
    console.log(JSON.stringify(results.at(-1)));
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(`${origin}/dashboard/products/new`);
  await page.getByRole("button",{name:"Save as Draft",exact:true}).first().click();
  assert.equal(await page.getByLabel("Title",{exact:true}).getAttribute("aria-invalid"),"true");
  await page.getByLabel("Title",{exact:true}).fill("QA Phone");
  await page.getByLabel("Description",{exact:true}).fill("A real product draft description.");
  await page.getByLabel("Price",{exact:true}).fill("-1");
  await page.getByRole("button",{name:"Save as Draft",exact:true}).first().click();
  assert.equal(await page.getByLabel("Price",{exact:true}).getAttribute("aria-invalid"),"true");
  await page.getByLabel("Price",{exact:true}).fill("100");
  await page.getByLabel("Compare-at price",{exact:true}).fill("150");
  await page.getByLabel("Stock",{exact:true}).fill("3");
  await page.getByLabel("SKU",{exact:true}).fill("QA-SKU");
  await page.getByLabel("Barcode",{exact:true}).fill("12345");
  await page.getByLabel("Brand",{exact:true}).selectOption(brandId);
  await page.getByLabel("Category",{exact:true}).selectOption(categoryId);
  await page.getByLabel("Product type",{exact:true}).fill("Smartphone");
  await page.getByLabel("Tags",{exact:true}).fill("Phone, Android, Phone");
  await page.getByText("Arabic translation",{exact:true}).click();
  await page.getByLabel("Arabic title",{exact:true}).fill("هاتف للاختبار");
  await page.getByLabel("Arabic description",{exact:true}).fill("وصف عربي للاختبار");
  await page.getByRole("button",{name:"Color: Graphite",exact:true}).click();
  await page.getByLabel("Storage / capacity",{exact:true}).fill("128GB");
  await page.getByRole("navigation",{name:"Product sections",exact:true}).getByRole("button",{name:"SEO",exact:true}).click();
  await page.getByLabel("SEO title",{exact:true}).fill("QA Phone | Space Call");
  await page.getByLabel("SEO description",{exact:true}).fill("QA Phone details and availability.");
  await page.getByLabel("Search engine preview",{exact:true}).getByText("QA Phone | Space Call",{exact:true}).waitFor();
  failSave=true;
  await page.getByRole("button",{name:"Save as Draft",exact:true}).first().click();
  await page.getByText("Saving product failed: Save unavailable. Retry.",{exact:true}).waitFor();
  assert.equal(await page.getByLabel("Title",{exact:true}).inputValue(),"QA Phone");
  failSave=false;
  await page.getByRole("button",{name:"Save as Draft",exact:true}).first().click();
  await page.waitForURL(`**/dashboard/products/${productId}`);
  await page.getByLabel("Title",{exact:true}).waitFor();
  assert.deepEqual(product.tags,["Android","Phone"]);
  assert.equal(product.title_ar,"هاتف للاختبار");
  assert.deepEqual(variant.options,{color:"Graphite",storage:"128GB"});
  await page.reload();
  await page.getByLabel("Title",{exact:true}).waitFor();
  assert.equal(await page.getByLabel("Product type",{exact:true}).inputValue(),"Smartphone");
  assert.equal(await page.getByLabel("Tags",{exact:true}).inputValue(),"Android, Phone");
  failAlt=true;
  await page.getByLabel("Alternative text",{exact:true}).fill("Rear view");
  await page.getByRole("button",{name:"Save alternative text",exact:true}).click();
  await page.getByText("Saving alternative text failed: Alternative text denied. Retry.",{exact:true}).waitFor();
  assert.equal(await page.getByLabel("Alternative text",{exact:true}).inputValue(),"Rear view");
  failAlt=false;
  await page.getByRole("button",{name:"Save alternative text",exact:true}).click();
  await page.getByText("Alternative text saved.",{exact:true}).waitFor();
  assert.equal(images[0].alt_text,"Rear view");
  await page.getByLabel("Description",{exact:true}).fill("Updated description");
  await page.getByRole("button",{name:"Save changes",exact:true}).first().click();
  await page.getByRole("button",{name:"Save changes",exact:true}).first().isEnabled();
  await page.getByRole("button",{name:"Publish Product",exact:true}).first().click();
  await page.getByRole("status").filter({hasText:"Active"}).waitFor();
  assert.equal(product.status,"active");
  await page.getByText("More Actions",{exact:true}).click();
  await page.getByRole("button",{name:"Archive",exact:true}).click();
  const confirmation=page.getByRole("dialog",{name:"Archive this product?",exact:true});
  await confirmation.waitFor();await confirmation.getByRole("button",{name:"Cancel",exact:true}).click();
  assert.equal(product.status,"active");
  results.push({case:"create/edit, validation, save failure/retry, translations, tags, variant options, reload, alt text failure/retry, publish, archive cancellation",pass:true});
  assert.deepEqual(errors,[]);
  await writeFile(`${evidence}/interaction-results.json`,JSON.stringify({results,errors,saveRequests:requests.length},null,2));
  console.log(JSON.stringify({results,errors}));
}catch(error){
  await page.screenshot({path:`${evidence}/failure.png`,fullPage:true}).catch(()=>{});
  console.error(JSON.stringify({url:page.url(),body:(await page.locator("body").innerText()).slice(-3000),errors,results}));
  throw error;
}finally{await browser.close();}
