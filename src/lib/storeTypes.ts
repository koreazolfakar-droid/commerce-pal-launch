/**
 * Canonical Space Call storefront data shapes.
 *
 * These types describe the Supabase-native commerce model consumed by the UI.
 * They intentionally carry no Shopify runtime dependency.
 */
export interface StoreProductNode {
  id: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  handle: string;
  vendor?: string;
  productType?: string;
  availableForSale?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  compareAtPriceRange?: { minVariantPrice: { amount: string; currencyCode: string } };
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  collections?: { edges: Array<{ node: { handle: string; title: string } }> };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: { amount: string; currencyCode: string };
        compareAtPrice?: { amount: string; currencyCode: string } | null;
        availableForSale: boolean;
        trackInventory?: boolean;
        allowBackorder?: boolean;
        stockQuantity?: number;
        sku?: string | null;
        barcode?: string | null;
        weight?: number | null;
        weightUnit?: string | null;
        image?: { url: string; altText: string | null } | null;
        selectedOptions: Array<{ name: string; value: string }>;
      };
    }>;
  };
  options: Array<{ name: string; values: string[] }>;
}

export interface StoreProduct {
  node: StoreProductNode;
}

export interface StoreCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: { url: string; altText: string | null } | null;
}
