import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const publicClient = await readFile(new URL("../src/integrations/supabase/publicClient.ts", import.meta.url), "utf8");
const nativeStore = await readFile(new URL("../src/lib/nativeStore.ts", import.meta.url), "utf8");
const storefrontData = await readFile(new URL("../src/lib/storefrontData.ts", import.meta.url), "utf8");

test("public storefront uses an SSR-safe Supabase client without auth storage", () => {
  assert.match(nativeStore, /@\/integrations\/supabase\/publicClient/);
  assert.doesNotMatch(nativeStore, /@\/integrations\/supabase\/client/);
  assert.match(publicClient, /persistSession:\s*false/);
  assert.match(publicClient, /autoRefreshToken:\s*false/);
  assert.match(publicClient, /detectSessionInUrl:\s*false/);
  assert.doesNotMatch(publicClient, /localStorage/);
  assert.match(publicClient, /new Proxy/);
});

test("Supabase is the only live commerce source", () => {
  assert.match(storefrontData, /nativeStore\.fetchCatalogProducts/);
  assert.match(storefrontData, /nativeStore\.fetchCollectionByHandle/);
  assert.match(storefrontData, /nativeStore\.fetchProductByHandle/);
  assert.match(storefrontData, /nativeStore\.searchStorefront/);
  assert.doesNotMatch(storefrontData, /withShopifyFallback|fetchShopify|SHOPIFY_|myshopify|storefrontApiRequest/);
});

test("native store reads public commerce tables only", () => {
  for (const table of [
    "store_products",
    "store_product_variants",
    "store_product_images",
    "store_collections",
    "store_collection_products",
    "cms_brands",
  ]) assert.match(nativeStore, new RegExp(`from\\("${table}"\\)`));
});


test("public storefront refuses Supabase runtime drift and degrades category template schema drift safely", () => {
  assert.match(publicClient, /CANONICAL_SUPABASE_HOST/);
  assert.match(publicClient, /isCanonicalSupabaseUrl/);
  assert.match(publicClient, /DEFAULT_SUPABASE_URL/);
  assert.match(publicClient, /createSupabaseFetch/);
  assert.doesNotMatch(
    publicClient,
    /viteEnv\["VITE_SUPABASE_URL"\]\s*\|\|\s*nodeEnv\?\.\["SUPABASE_URL"\]/,
  );

  assert.match(nativeStore, /isMissingCategorySpecTemplate/);
  assert.match(nativeStore, /categoryRowsOrEmpty/);
  assert.match(nativeStore, /if \(isMissingCategorySpecTemplate\(result\.error\)\) \{\s*result = await readProduct\("id,name,slug,is_active"\)/);
  assert.match(nativeStore, /continuing without category templates/);
});
