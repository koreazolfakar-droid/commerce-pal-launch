/**
 * Runtime extension for the shared Shopify fixture.
 *
 * Keep the product/cart fixture in `shopify-fixture.mjs` as the base transport,
 * then handle lightweight Storefront operations added after that fixture was
 * originally written. This module is the preload used by browser + SSR tests.
 */
import { fixtureRequests, products } from "./shopify-fixture.mjs";

const fixtureFetch = globalThis.fetch;
const pageInfo = { hasNextPage: false, endCursor: null };

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
  );

  if (url.hostname === "dj6qeq-j9.myshopify.com" && url.pathname.endsWith("/graphql.json")) {
    const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
    const query = body?.query ?? "";
    const variables = body?.variables ?? {};
    const operation = query.match(/(?:query|mutation)\s+(\w+)/)?.[1];

    if (operation === "GetBrandVendors") {
      fixtureRequests.push(operation);
      return Response.json({
        data: {
          products: {
            edges: products.slice(0, variables.first ?? 250).map(({ node }) => ({
              node: { vendor: node.vendor },
            })),
            pageInfo,
          },
        },
      });
    }
  }

  return fixtureFetch(input, init);
};

export { fixtureRequests, products };
