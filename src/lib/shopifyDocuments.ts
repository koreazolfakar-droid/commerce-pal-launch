const MONEY = `amount currencyCode`;
const IMAGE = `url altText`;
const COLLECTION_IMAGE = `url altText width height`;
const VARIANT = `
  id title availableForSale
  price { ${MONEY} }
  compareAtPrice { ${MONEY} }
  image { ${IMAGE} }
  selectedOptions { name value }
`;

/** Lightweight product shape used by cards, rails, search and taxonomy. */
export const PRODUCT_LIST_FIELDS = `
  id title handle vendor productType availableForSale createdAt tags
  priceRange { minVariantPrice { ${MONEY} } }
  compareAtPriceRange { minVariantPrice { ${MONEY} } }
  images(first: 1) { edges { node { ${IMAGE} } } }
  collections(first: 8) { edges { node { handle title } } }
  variants(first: 1) { edges { node { ${VARIANT} } } }
`;

/** Rich shape fetched only for a single product detail page. */
export const PRODUCT_DETAIL_FIELDS = `
  id title description descriptionHtml handle vendor productType availableForSale createdAt updatedAt tags
  priceRange { minVariantPrice { ${MONEY} } }
  compareAtPriceRange { minVariantPrice { ${MONEY} } }
  images(first: 20) { edges { node { ${IMAGE} } } }
  collections(first: 20) { edges { node { handle title } } }
  variants(first: 100) {
    edges { node { ${VARIANT} sku barcode weight weightUnit } }
  }
  options { name values }
`;

export const COLLECTION_FIELDS = `
  # merchandising-cache-v3-2026-09-13
  id handle title description updatedAt image { ${COLLECTION_IMAGE} }
`;

export const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
      pageInfo { hasNextPage endCursor }
      edges { node { ${PRODUCT_LIST_FIELDS} } }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `
  query GetProduct($handle: String!) {
    product(handle: $handle) { ${PRODUCT_DETAIL_FIELDS} }
  }
`;

export const COLLECTIONS_QUERY = `
  query GetCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after, sortKey: TITLE) {
      pageInfo { hasNextPage endCursor }
      edges { node { ${COLLECTION_FIELDS} } }
    }
  }
`;

export const COLLECTION_BY_HANDLE_QUERY = `
  query GetCollection($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      ${COLLECTION_FIELDS}
      products(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges { node { ${PRODUCT_LIST_FIELDS} } }
      }
    }
  }
`;

export const PRODUCT_RECOMMENDATIONS_QUERY = `
  query GetRecommendations($handle: String!) {
    productRecommendations(productHandle: $handle) { ${PRODUCT_LIST_FIELDS} }
  }
`;

export const SHOP_QUERY = `query Shop { shop { name description } }`;

export const CART_FIELDS = `
  id totalQuantity checkoutUrl
  cost {
    subtotalAmount { ${MONEY} }
    totalAmount { ${MONEY} }
  }
  lines(first: 100) {
    edges {
      node {
        id quantity
        cost { totalAmount { ${MONEY} } }
        merchandise {
          ... on ProductVariant {
            ${VARIANT}
            product {
              id title handle vendor productType availableForSale tags
              priceRange { minVariantPrice { ${MONEY} } }
              compareAtPriceRange { minVariantPrice { ${MONEY} } }
              images(first: 2) { edges { node { ${IMAGE} } } }
            }
          }
        }
      }
    }
  }
`;

export const CART_QUERY = `query Cart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`;
export const CART_CREATE_MUTATION = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) { cart { ${CART_FIELDS} } userErrors { field message } }
  }
`;
export const CART_LINES_ADD_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;
export const CART_LINES_UPDATE_MUTATION = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;
export const CART_LINES_REMOVE_MUTATION = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;