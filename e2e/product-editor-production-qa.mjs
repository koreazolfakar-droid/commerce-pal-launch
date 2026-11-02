// Run browser suites against the built Worker and deterministic server read fixtures.
// Browser helper intercepts dashboard writes; synthetic sessions never reach production.
process.env.SPACE_CALL_VISUAL_FIXTURES = '1';
await import('./helpers/storefront-fixture-fetch.mjs');
await import('./helpers/production-preview.mjs');
const origin=`http://127.0.0.1:${process.env.SPACE_CALL_PREVIEW_PORT || 4173}`;
process.env.SPACE_CALL_DASHBOARD_ORIGIN=origin;
let code=0;
try {
  const deadline=Date.now()+20000;
  while(true){
    try{const response=await fetch(origin+'/dashboard/products/new');if(response.ok)break;}catch{}
    if(Date.now()>deadline)throw Error('Production preview did not become ready');
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  const scripts=(process.env.SPACE_CALL_QA_SCRIPTS || 'dashboard-ai-form-fill-browser.mjs,dashboard-ai-responsive-browser.mjs,dashboard-product-editor-browser.mjs').split(',');
  for(const script of scripts){
    if(!/^[a-z0-9-]+\.mjs$/.test(script))throw Error('Invalid QA script name');
    console.log('Running',script);
    await import('./'+script);
    console.log('Passed',script);
  }
} catch(error){console.error(error);code=1;}
finally{process.exit(code);}
