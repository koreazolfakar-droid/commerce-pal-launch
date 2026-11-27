import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  resolve: { alias: { "@": new URL("../src", import.meta.url).pathname } },
});
test.after(() => server.close());

test("CMS content survives Workers' supported cache modes during SSR", async () => {
  const { fetchCmsSnapshot } = await server.ssrLoadModule("/src/lib/cms.ts");
  const originalFetch = globalThis.fetch;
  const settings = { warranty_policy_body: "<p>Published warranty</p>", delivery_fee: 2 };
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/functions\/v1\/public-cms$/);
    // Workers accepts omitted cache, no-store and no-cache; unlike browser/Node
    // fetch, it throws for an explicit default mode before making the request.
    if (init?.cache && !["no-store", "no-cache"].includes(init.cache)) {
      throw new TypeError(`Unsupported cache mode: ${init.cache}`);
    }
    return Response.json({
      settings,
      heroSlides: [],
      sections: [],
      navigation: [],
      brands: [],
      seoPages: [],
    });
  };
  try {
    assert.deepEqual((await fetchCmsSnapshot()).settings, settings);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
