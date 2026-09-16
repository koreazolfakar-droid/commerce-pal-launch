// Compatibility facade for the storefront.
//
// Existing UI can keep importing `@/lib/shopify` for product types, pricing
// helpers and low-level Shopify utilities, while all public catalogue reads are
// resolved through the hybrid Space Call + Shopify layer.
export * from "./shopify";

export {
  fetchAllProductsByVendor,
  fetchBestSellingProducts,
  fetchBrandVendors,
  fetchCatalogProducts,
  fetchCollectionByHandle,
  fetchCollections,
  fetchProductByHandle,
  fetchProductRecommendations,
  fetchProducts,
  fetchProductsByHandles,
  fetchProductsByVendor,
  searchStorefront,
} from "./hybridStore";
