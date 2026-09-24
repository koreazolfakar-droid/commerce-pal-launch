/**
 * Temporary compatibility facade for storefront modules that still use the old
 * Shopify-oriented type names.
 *
 * Runtime commerce is Supabase-native. New code must import StoreProduct,
 * StoreProductNode and StoreCollection from "@/lib/storeTypes" directly.
 */
export type {
  StoreProductNode as ShopifyProductNode,
  StoreProduct as ShopifyProduct,
  StoreCollection as ShopifyCollection,
} from "@/lib/storeTypes";

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
