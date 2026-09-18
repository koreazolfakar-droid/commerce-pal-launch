/**
 * Provider-neutral storefront read boundary.
 *
 * The UI must depend on this module (or provider-neutral domain types) for
 * catalogue reads. The current no-Shopify staging adapter still lives in
 * shopify.ts only as a temporary compatibility implementation; it performs
 * zero Shopify network requests and can be replaced by the Space Call
 * Dashboard/Supabase provider without changing query consumers.
 */
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
} from "./shopify";

export type {
  ShopifyCollection as StoreCollection,
  ShopifyProduct as StoreProduct,
  ShopifyProductNode as StoreProductNode,
} from "./shopify";
