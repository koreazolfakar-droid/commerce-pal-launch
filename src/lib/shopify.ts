/**
 * @deprecated Compatibility shim.
 *
 * New code must import catalogue data from "@/lib/storefrontFacade" and generic
 * domain types from "@/lib/storefrontTypes". This file exists only so the
 * existing UI can migrate incrementally without a risky all-at-once rename.
 * It contains no Shopify client, credential, GraphQL transport or network call.
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
} from "@/lib/storefrontFacade";

export type {
  StoreCollection as ShopifyCollection,
  StoreProduct as ShopifyProduct,
  StoreProductNode as ShopifyProductNode,
} from "@/lib/storefrontTypes";

export {
  formatPrice,
  discountPercent,
  variantSummary,
  productPrimaryVariant,
  productPrice,
  productCurrency,
  productCompareAt,
  productDiscountPercent,
  productInStock,
  productCollectionHandles,
} from "@/lib/productPricing";
