import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const publicClient = await readFile(
  new URL("../src/integrations/supabase/publicClient.ts", import.meta.url),
  "utf8",
);
const nativeStore = await readFile(
  new URL("../src/lib/nativeStore.ts", import.meta.url),
  "utf8",
);
const storefrontData = await readFile(
  new URL("../src/lib/storefrontData.ts", import.meta.url),
  "utf8",
);

const publicConsumers = await Promise.all(
  [
    "../src/lib/queries.ts",
    "../src/components/SearchOverlay.tsx",
    "../src/lib/merchandising.ts",
    "../src/routes/product.$handle.tsx",
    "../src/routes/sitemap[.]xml.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);

test("public storefront uses an SSR-safe Supabase client without auth storage", () => {
  assert.match(nativeStore, /@\/integrations\/supabase\/publicClient/);
  assert.doesNotMatch(nativeStore, /@\/integrations\/supabase\/client/);
  assert.match(publicClient, /persistSession:\s*false/);
  assert.match(publicClient, /autoRefreshToken:\s*false/);
  assert.match(publicClient, /detectSessionInUrl:\s*false/);
  assert.doesNotMatch(publicClient, /brokeredPreviewStorage|localStorage/);
});

test("public storefront data has a Shopify fail-safe instead of throwing the whole site", () => {
  assert.match(storefrontData, /withShopifyFallback/);
  assert.match(storefrontData, /Supabase .* failed; using Shopify fallback/);
  assert.match(storefrontData, /fetchShopifyCatalogProducts/);
  assert.match(storefrontData, /fetchShopifyCollectionByHandle/);
  assert.match(storefrontData, /fetchShopifyProductByHandle/);
  assert.match(storefrontData, /searchShopifyStorefront/);
});

test("all migrated public storefront consumers use the resilient data facade", () => {
  for (const source of publicConsumers) {
    assert.match(source, /@\/lib\/storefrontData/);
    assert.doesNotMatch(source, /@\/lib\/nativeStore/);
  }
});
