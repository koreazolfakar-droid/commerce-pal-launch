/** Test-only Shopify transport. Preload in the Node dev/test server, never the client. */
import { randomUUID } from "node:crypto";

process.env.SHOPIFY_STOREFRONT_TOKEN = "space-cell-local-fixture-only";
const originalFetch = globalThis.fetch;
const pageInfo = { hasNextPage: false, endCursor: null };
const image = (label, color) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect x="190" y="55" width="220" height="490" rx="38" fill="${color}"/><rect x="204" y="70" width="192" height="460" rx="28" fill="#172333"/><circle cx="235" cy="108" r="17" fill="#a7adbc"/><circle cx="235" cy="152" r="17" fill="#a7adbc"/><text x="300" y="320" fill="white" text-anchor="middle" font-family="sans-serif" font-size="24">${label}</text></svg>`)}`;
const vendors = ["Samsung", "Apple", "Xiaomi", "Samsung", "POCO", "Apple", "Spigen", "Kobo", "نور"];
export const products = Array.from({ length: 9 }, (_, i) => {
  const money = { amount: String(499 + i * 50), currencyCode: "USD" };
  const images = {
    edges: ["Front", "Back", "Side"].map((label) => ({
      node: {
        url: image(label, i % 2 ? "#779cae" : "#9c9390"),
        altText: `Fixture phone ${label}`,
      },
    })),
  };
  const compareAtPrice = i < 2 ? { amount: String(599 + i * 50), currencyCode: "USD" } : null;
  return {
    node: {
      id: `gid://shopify/Product/${i + 1}`,
      handle: `fixture-phone-${i + 1}`,
      title:
        i === 0
          ? "Samsung Fixture Phone 512GB with a long product title"
          : i === 6
            ? "Spigen case for Apple iPhone"
            : i === 7
              ? "Kobo Clara Reader"
              : i === 8
                ? "نور مصباح ذكي"
                : `${vendors[i]} Fixture Phone ${i + 1}`,
      vendor: vendors[i],
      createdAt: `2026-08-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
      productType:
        i === 6 ? "Phone Cases" : i === 7 ? "E-Readers" : i === 8 ? "إضاءة ذكية" : "Smartphone",
      tags: ["smartphone"],
      availableForSale: true,
      description: "Local test product for layout and shopping flow verification.",
      descriptionHtml: "<p>Local test product for layout and shopping flow verification.</p>",
      priceRange: { minVariantPrice: money },
      compareAtPriceRange: { minVariantPrice: compareAtPrice ?? money },
      images,
      collections: {
        edges: [
          { node: { handle: "mixed-collection", title: "Mixed collection" } },
          ...(i === 0 || i === 3 ? [{ node: { handle: "samsung", title: "Samsung" } }] : []),
        ],
      },
      options: [{ name: "Storage", values: ["256GB", "512GB"] }],
      variants: {
        edges: ["256GB", "512GB"].map((storage, v) => ({
          node: {
            id: `gid://shopify/ProductVariant/${i * 10 + v + 1}`,
            title: storage,
            availableForSale: true,
            price: { ...money, amount: String(Number(money.amount) + v * 100) },
            compareAtPrice: compareAtPrice
              ? { ...compareAtPrice, amount: String(Number(compareAtPrice.amount) + v * 100) }
              : null,
            selectedOptions: [{ name: "Storage", value: storage }],
            image: images.edges[v].node,
            sku: `FIXTURE-${i}-${v}`,
          },
        })),
      },
    },
  };
});
export const collections = ["samsung", "phone-bundle", "showcase-alpha", "showcase-zeta"].map(
  (handle, i) => ({
    id: `gid://shopify/Collection/${i + 1}`,
    handle,
    title:
      handle === "showcase-alpha"
        ? "Alpha showcase"
        : handle === "showcase-zeta"
          ? "Zeta showcase"
          : handle,
    description: "Shop this curated collection of phones.",
    image: products[i].node.images.edges[0].node,
    sortOrder: { value: handle === "showcase-zeta" ? "1" : "2" },
  }),
);
collections.push(
  ...[
    "homepage-hero",
    "hero-brand-apple",
    "hero-brand-samsung",
    "hero-brand-xiaomi",
    "hero-category-cases",
    "hero-category-e-readers",
    "mixed-collection",
  ].map((handle, i) => ({
    id: `gid://shopify/Collection/hero-${i}`,
    handle,
    title:
      handle === "homepage-hero"
        ? "Technology, chosen for you"
        : handle === "mixed-collection"
          ? "Mixed collection"
          : `Merchant campaign ${handle}`,
    description: "Campaign artwork and copy managed in Shopify.",
    image: { ...products[i].node.images.edges[0].node, altText: `Merchant artwork ${handle}` },
  })),
);

const policy = (title, handle) => ({
  title,
  url: `https://dj6qeq-j9.myshopify.com/policies/${handle}`,
  body: `<h1>${title}</h1><p>Fixture policy content from Shopify.</p><script>window.policyUnsafe=true</script><a href="javascript:alert(1)" onclick="alert(1)">Unsafe link</a>`,
});
const carts = new Map();
function cartPayload(id) {
  const cart = carts.get(id);
  if (!cart) return null;
  return {
    id,
    checkoutUrl: `https://dj6qeq-j9.myshopify.com/checkouts/fixture-${id.split("/").at(-1)}`,
    totalQuantity: cart.reduce((sum, line) => sum + line.quantity, 0),
    cost: {
      subtotalAmount: {
        amount: String(
          cart.reduce(
            (sum, line) => sum + Number(line.merchandise.price.amount) * line.quantity,
            0,
          ),
        ),
        currencyCode: "USD",
      },
      totalAmount: {
        amount: String(
          cart.reduce(
            (sum, line) => sum + Number(line.merchandise.price.amount) * line.quantity,
            0,
          ),
        ),
        currencyCode: "USD",
      },
    },
    lines: { edges: cart.map((node) => ({ node })) },
  };
}
function merchandiseFor(id) {
  for (const { node: product } of products) {
    const variant = product.variants.edges.find((edge) => edge.node.id === id)?.node;
    if (variant) return { ...variant, product };
  }
  throw new Error(`Unknown fixture variant: ${id}`);
}
export const fixtureRequests = [];
globalThis.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
  );
  if (url.hostname !== "dj6qeq-j9.myshopify.com") return originalFetch(input, init);
  if (!url.pathname.endsWith("/graphql.json"))
    throw new Error("Fixture refuses non-GraphQL Shopify requests");
  const { query, variables = {} } = JSON.parse(init.body);
  const operation = query.match(/(?:query|mutation)\s+(\w+)/)?.[1];
  fixtureRequests.push(operation);
  let data;
  if (operation === "GetProducts") {
    const sorted =
      variables.sortKey === "CREATED_AT"
        ? [...products].sort(
            (a, b) =>
              (variables.reverse ? -1 : 1) * a.node.createdAt.localeCompare(b.node.createdAt),
          )
        : variables.sortKey === "BEST_SELLING"
          ? [products[3], products[0], ...products.filter((_, i) => i !== 0 && i !== 3)]
          : products;
    data = { products: { edges: sorted.slice(0, variables.first ?? 250), pageInfo } };
  } else if (operation === "GetProduct")
    data = { product: products.find((p) => p.node.handle === variables.handle)?.node ?? null };
  else if (operation === "GetCollections")
    data = {
      collections: {
        edges: collections
          .filter(
            (c) =>
              process.env.SPACE_CELL_FIXTURE_FALLBACK !== "1" ||
              !/^(hero-|homepage-hero)/.test(c.handle),
          )
          .map((node) => ({ node })),
        pageInfo,
      },
    };
  else if (operation === "GetCollection") {
    const collection = collections.find(
      (c) =>
        c.handle === variables.handle &&
        (process.env.SPACE_CELL_FIXTURE_FALLBACK !== "1" ||
          !/^(hero-|homepage-hero)/.test(c.handle)),
    );
    data = {
      collection: collection
        ? {
            ...collection,
            products: {
              edges:
                collection.handle === "mixed-collection"
                  ? products
                  : collection.handle === "samsung"
                    ? products.filter((p) => p.node.vendor === "Samsung")
                    : products.slice(0, 3),
              pageInfo,
            },
          }
        : null,
    };
  } else if (operation === "GetRecommendations")
    data = {
      productRecommendations: products
        .filter((p) => p.node.handle !== variables.handle)
        .slice(0, 2)
        .map((p) => p.node),
    };
  else if (operation === "ShowcaseCollections")
    data = {
      collections:
        process.env.SPACE_CELL_FIXTURE_FALLBACK === "1"
          ? { nodes: [] }
          : {
              nodes: collections
                .filter((collection) => collection.handle.startsWith("showcase-"))
                .map((collection) => ({
                  ...collection,
                  products: { nodes: products.slice(0, 3).map(({ node }) => ({ id: node.id })) },
                })),
            },
    };
  else if (operation === "CollectionProductCount")
    data = {
      collection: {
        products: {
          nodes: (variables.after ? products.slice(2, 3) : products.slice(0, 2)).map((p) => ({
            id: p.node.id,
          })),
          pageInfo: variables.after
            ? pageInfo
            : { hasNextPage: true, endCursor: "products-page-2" },
        },
      },
    };
  else if (operation === "ShopPolicies")
    data = {
      shop:
        process.env.SPACE_CELL_FIXTURE_FALLBACK === "1"
          ? {}
          : {
              privacyPolicy: policy("Privacy policy", "privacy-policy"),
              refundPolicy: policy("Refund policy", "refund-policy"),
              termsOfService: policy("Terms of service", "terms-of-service"),
              shippingPolicy: policy("Shipping policy", "shipping-policy"),
            },
    };
  else if (operation === "Shop")
    data = { shop: { name: "Space Call", description: "Local test store" } };
  else if (operation === "CartCreate") {
    const id = `gid://shopify/Cart/${randomUUID()}`;
    carts.set(
      id,
      variables.input.lines.map((line) => ({
        id: `gid://shopify/CartLine/${randomUUID()}`,
        quantity: line.quantity,
        merchandise: merchandiseFor(line.merchandiseId),
      })),
    );
    data = { cartCreate: { cart: cartPayload(id), userErrors: [] } };
  } else if (operation === "Cart") data = { cart: cartPayload(variables.id) };
  else if (["CartLinesAdd", "CartLinesUpdate", "CartLinesRemove"].includes(operation)) {
    const lines = carts.get(variables.cartId);
    if (!lines)
      data = {
        [{
          CartLinesAdd: "cartLinesAdd",
          CartLinesUpdate: "cartLinesUpdate",
          CartLinesRemove: "cartLinesRemove",
        }[operation]]: {
          cart: null,
          userErrors: [{ field: ["cartId"], message: "Cart not found" }],
        },
      };
    else {
      if (operation === "CartLinesAdd")
        for (const line of variables.lines)
          lines.push({
            id: `gid://shopify/CartLine/${randomUUID()}`,
            quantity: line.quantity,
            merchandise: merchandiseFor(line.merchandiseId),
          });
      if (operation === "CartLinesUpdate")
        for (const update of variables.lines) {
          const line = lines.find((l) => l.id === update.id);
          if (line) line.quantity = update.quantity;
        }
      if (operation === "CartLinesRemove")
        carts.set(
          variables.cartId,
          lines.filter((line) => !variables.lineIds.includes(line.id)),
        );
      const payloadKey = {
        CartLinesAdd: "cartLinesAdd",
        CartLinesUpdate: "cartLinesUpdate",
        CartLinesRemove: "cartLinesRemove",
      }[operation];
      data = { [payloadKey]: { cart: cartPayload(variables.cartId), userErrors: [] } };
    }
  } else throw new Error(`Unhandled fixture operation: ${operation}`);
  return Response.json({ data });
};
