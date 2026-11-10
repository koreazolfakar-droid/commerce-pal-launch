import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  resolve: { alias: { "@": new URL("../src", import.meta.url).pathname } },
});
test.after(() => server.close());
const product = (title, patch = {}) => ({
  node: { id: title, handle: title, title, tags: [], images: { edges: [] }, ...patch },
});
test("placeholder vendor Brand never creates a real brand or masks an explicit brand", async () => {
  const { resolveBrand } = await server.ssrLoadModule("/src/lib/taxonomy.ts");
  const { mergeVendorBrands } = await server.ssrLoadModule("/src/lib/brandDirectory.ts");
  assert.equal(
    resolveBrand(product("Travel backpack", { vendor: "Brand", vendorSlug: "brand" })),
    null,
  );
  assert.deepEqual(
    resolveBrand(product("Travel backpack", { vendor: "Brand", tags: ["brand: BANGE"] })),
    { slug: "bange", label: "BANGE" },
  );
  assert.deepEqual(
    mergeVendorBrands([], ["Brand", "unknown", "BANGE"]).map((x) => x.slug),
    ["bange"],
  );
});
test("used phones excludes headphones, compatibility accessories and unused stock", async () => {
  const { isUsedPhone } = await server.ssrLoadModule("/src/lib/usedPhones.ts");
  for (const title of [
    "Used headphones",
    "Unused Samsung phone",
    "Refurbished iPhone case",
    "Used Xiaomi charger",
  ])
    assert.equal(isUsedPhone(product(title)), false, title);
  for (const title of ["Used Samsung Galaxy S24", "Refurbished iPhone 16", "هاتف مستعمل"])
    assert.equal(isUsedPhone(product(title)), true, title);
  assert.equal(
    isUsedPhone(product("Galaxy S24", { tags: ["condition:used"], productType: "Smartphone" })),
    true,
  );
});
test("warranty is a CMS policy with a dedicated public page mapping", async () => {
  const { POLICY_PAGES } = await server.ssrLoadModule("/src/lib/infoPages.ts");
  assert.equal(POLICY_PAGES.warranty, "warrantyPolicy");
});
test("policy route loader transfers its snapshot to first client render", async () => {
  for (const path of ["shipping", "returns", "warranty", "privacy", "terms"]) {
    const { Route } = await server.ssrLoadModule(`/src/routes/${path}.tsx`);
    const policies = {
      shippingPolicy: { title: "Shipping", body: "<p>Published terms</p>", url: "" },
    };
    const result = await Route.options.loader({
      context: { queryClient: { ensureQueryData: async () => policies } },
    });
    assert.deepEqual(result, policies, path);
  }
});
test("lightweight navigation counts used phones without loading images or variants", async () => {
  const { fixtureResponse } = await import("./helpers/storefront-fixture-fetch.mjs");
  const originalFetch = globalThis.fetch;
  let includeUsedPhone = false;
  const requested = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    requested.push(url.pathname);
    const response = fixtureResponse(input, init);
    assert.ok(response, `Unexpected request: ${url}`);
    if (includeUsedPhone && url.pathname.endsWith("/store_products")) {
      const rows = await response.json();
      rows[0].tags = ["condition:used"];
      return Response.json(rows);
    }
    return response;
  };
  try {
    const { fetchNavigationCatalogFacets } = await server.ssrLoadModule("/src/lib/nativeStore.ts");
    assert.equal((await fetchNavigationCatalogFacets()).usedPhoneCount, 0);
    includeUsedPhone = true;
    assert.equal((await fetchNavigationCatalogFacets()).usedPhoneCount, 1);
    assert.equal(
      requested.some((path) => /images|variants/.test(path)),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
