import { cdnImage } from "@/lib/image";
import { productInStock, type ShopifyProduct } from "@/lib/shopify";
import { SITE_URL as CONFIG_SITE_URL, STORE_NAME, storeUrl } from "@/lib/storeConfig";

export const SITE_URL = CONFIG_SITE_URL;
export const SITE_NAME = STORE_NAME;

export function absoluteUrl(path = "/") {
  return storeUrl(path);
}

export function canonicalLink(path: string) {
  return { rel: "canonical", href: absoluteUrl(path) };
}

export function jsonLd(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function itemListJsonLd(
  name: string,
  products: ShopifyProduct[],
  pathForProduct: (product: ShopifyProduct) => string = (product) =>
    `/product/${product.node.handle}`,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 100).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.node.title,
      url: absoluteUrl(pathForProduct(product)),
    })),
  };
}

function gtinJsonLd(barcode?: string | null): Record<string, string> {
  const digits = barcode?.replace(/\D/g, "") ?? "";
  if (digits.length === 8) return { gtin8: digits };
  if (digits.length === 12) return { gtin12: digits };
  if (digits.length === 13) return { gtin13: digits };
  if (digits.length === 14) return { gtin14: digits };
  return {};
}

export function productJsonLd(product: ShopifyProduct) {
  const node = product.node;
  const variant = node.variants.edges[0]?.node;
  const price = variant?.price ?? node.priceRange.minVariantPrice;
  const image = node.images.edges[0]?.node.url;
  const sku = variant?.sku || undefined;
  const brand = node.vendor?.trim() || undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: node.title,
    description: node.description || undefined,
    image: image ? [cdnImage(image, 1200)] : undefined,
    sku,
    ...gtinJsonLd(variant?.barcode),
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    url: absoluteUrl(`/product/${node.handle}`),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${node.handle}`),
      priceCurrency: price.currencyCode,
      price: price.amount,
      availability: productInStock(product)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: STORE_NAME,
        url: CONFIG_SITE_URL,
        logo: absoluteUrl("/logo.png"),
        areaServed: {
          "@type": "Country",
          name: "Lebanon",
        },
      },
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
  };
}
