/** Literal operations are explicitly allowed by the server-side Shopify gateway. */
export const SHOWCASE_COLLECTIONS_QUERY = `
  query ShowcaseCollections {
    collections(first: 50, sortKey: TITLE) {
      nodes {
        handle title description image { url altText }
        sortOrder: metafield(namespace: "custom", key: "sort_order") { value }
        products(first: 20) { nodes { id } }
      }
    }
  }
`;

export const SHOP_POLICIES_QUERY = `
  query ShopPolicies {
    shop {
      privacyPolicy { title body url }
      refundPolicy { title body url }
      termsOfService { title body url }
      shippingPolicy { title body url }
    }
  }
`;
