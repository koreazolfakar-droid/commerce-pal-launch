import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  resolve: { alias: { "@": new URL("../src", import.meta.url).pathname } },
});
test.after(() => server.close());

test("image-only hero artwork offers a real shopping link without changing editor previews", async () => {
  const { HeroScene } = await server.ssrLoadModule("/src/components/HeroScene.tsx");
  const slide = { id: "image-only", image_url: "/banner.webp", target_type: "none" };
  const render = (patch = {}, editor) =>
    renderToStaticMarkup(
      createElement(HeroScene, {
        slide: { ...slide, ...patch },
        language: "en",
        editor,
      }),
    );
  assert.match(render(), /href="\/shop"/);
  assert.match(
    render({ target_type: "product", target_value: "test-phone" }),
    /href="\/product\/test-phone"/,
  );
  assert.doesNotMatch(render({ target_type: "url", target_value: "javascript:alert(1)" }), /href=/);
  assert.doesNotMatch(render({}, { mode: "desktop", selected: "content" }), /href=/);
});

test("a failed thumbnail falls back to its original and exhausted sources stop retrying", async () => {
  const { productImageSource } = await server.ssrLoadModule("/src/lib/image.ts");
  assert.equal(typeof productImageSource, "function");
  assert.equal(productImageSource("/thumb.webp", "/original.webp", []), "/thumb.webp");
  assert.equal(
    productImageSource("/thumb.webp", "/original.webp", ["/thumb.webp"]),
    "/original.webp",
  );
  assert.equal(
    productImageSource("/thumb.webp", "/original.webp", ["/thumb.webp", "/original.webp"]),
    undefined,
  );
  assert.equal(productImageSource("/same.webp", "/same.webp", ["/same.webp"]), undefined);
  assert.equal(productImageSource(undefined, "/original.webp", []), "/original.webp");
});

test("search route waits for both catalogue facets and the requested results", async () => {
  const { Route } = await server.ssrLoadModule("/src/routes/search.tsx");
  const releases = [];
  const queries = [];
  const queryClient = {
    ensureQueryData(options) {
      queries.push(options.queryKey);
      return new Promise((resolve) => releases.push(resolve));
    },
  };
  let settled = false;
  const result = Promise.resolve(
    Route.options.loader({ context: { queryClient }, deps: { q: "charger" } }),
  ).then(() => {
    settled = true;
  });
  await Promise.resolve();
  assert.equal(settled, false, "route must not expose a false empty result before data resolves");
  assert.deepEqual(queries, [
    ["supabase", "catalog"],
    ["supabase", "search", "charger"],
  ]);
  releases.forEach((resolve) => resolve({}));
  await result;
  assert.equal(settled, true);
});

test("unloaded brand shelves do not display productless headings", async () => {
  const { BrandShowcase } = await server.ssrLoadModule("/src/components/BrandShowcaseSections.tsx");
  const { buildCatalogIndex } = await server.ssrLoadModule("/src/lib/taxonomy.ts");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(BrandShowcase, {
          catalog: buildCatalogIndex([]),
          collections: [],
          brands: [{ slug: "apple", label: "Apple" }],
          excludedProductIds: new Set(),
        }),
      ),
    );
    assert.doesNotMatch(html, /<h2[^>]*>Apple<\/h2>/);
    assert.match(html, /aria-busy="true"/);
  } finally {
    client.clear();
  }
});
