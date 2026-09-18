/**
 * Provider-neutral storefront data boundary.
 *
 * Query consumers depend on this module instead of a commerce platform SDK.
 * During staging it uses the local provider. The next migration step swaps this
 * provider for the Space Call Dashboard/Supabase backend without changing UI.
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
} from "./localStorefrontProvider";

export type { StoreCollection, StoreProduct, StoreProductNode } from "./storefrontTypes";
