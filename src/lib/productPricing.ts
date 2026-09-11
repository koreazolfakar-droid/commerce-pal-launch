import type { ShopifyProduct } from "@/lib/shopify";

export function formatPrice(amount: string | number, currencyCode: string) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

/** Discount percentage from a price / compare-at pair, or null when there is no saving. */
export function discountPercent(price?: string | null, compareAt?: string | null) {
  const current = price ? parseFloat(price) : NaN;
  const was = compareAt ? parseFloat(compareAt) : NaN;
  if (!isFinite(current) || !isFinite(was) || was <= current || was <= 0) return null;
  return Math.round(((was - current) / was) * 100);
}

/** Short "256GB • Titanium" style summary from a variant's selected options. */
export function variantSummary(options?: Array<{ name: string; value: string }>) {
  if (!options?.length) return "";
  return options
    .filter((option) => option.value && option.value !== "Default Title")
    .map((option) => option.value)
    .join(" • ");
}

/** Cards, quick-add, price filters and discount sorting all describe this same variant. */
export function productPrimaryVariant(product: ShopifyProduct) {
  const variants = product.node.variants.edges.map((edge) => edge.node);
  const available = variants.filter((variant) => variant.availableForSale);
  return [...(available.length ? available : variants)].sort(
    (a, b) => Number(a.price.amount) - Number(b.price.amount),
  )[0];
}

export function productPrice(product: ShopifyProduct) {
  return (
    Number(
      productPrimaryVariant(product)?.price.amount ??
        product.node.priceRange.minVariantPrice.amount,
    ) || 0
  );
}

export function productCurrency(product: ShopifyProduct) {
  return (
    productPrimaryVariant(product)?.price.currencyCode ??
    product.node.priceRange.minVariantPrice.currencyCode
  );
}

export function productCompareAt(product: ShopifyProduct) {
  const variant = productPrimaryVariant(product);
  return variant
    ? (variant.compareAtPrice?.amount ?? null)
    : (product.node.compareAtPriceRange?.minVariantPrice.amount ?? null);
}

export function productDiscountPercent(product: ShopifyProduct) {
  return discountPercent(String(productPrice(product)), productCompareAt(product));
}

export function productInStock(product: ShopifyProduct) {
  const node = product.node;
  if (typeof node.availableForSale === "boolean") return node.availableForSale;
  return node.variants.edges.some((edge) => edge.node.availableForSale);
}

export function productCollectionHandles(product: ShopifyProduct) {
  return (product.node.collections?.edges ?? []).map((edge) => edge.node.handle);
}
