import { cdnImage } from "@/lib/image";
import type { ShopifyProduct } from "@/lib/shopify";
import { SITE_URL as CONFIG_SITE_URL, STORE_CONFIG, STORE_NAME, storeUrl } from "@/lib/storeConfig";

export const SITE_URL = CONFIG_SITE_URL;
export const SITE_NAME = STORE_NAME;
// PNG is more widely supported by social crawlers than SVG for Open Graph previews.
export const DEFAULT_OG_IMAGE = storeUrl("/logo.png");

export function absoluteUrl(path = "/") {
  return storeUrl(path);
}

export function canonicalLink(path: string) {
  return { rel: "canonical", href: absoluteUrl(path) };
}

export function languageAlternateLinks({
  path,
  arabicPath = "/ar",
}: {
  path: string;
  arabicPath?: string;
}) {
  return [
    { rel: "alternate", hrefLang: "en-LB", href: absoluteUrl(path) },
    { rel: "alternate", hrefLang: "ar-LB", href: absoluteUrl(arabicPath) },
    { rel: "alternate", hrefLang: "x-default", href: absoluteUrl(path) },
  ];
}

export function jsonLd(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

export function cleanMetaDescription(
  value: string | null | undefined,
  fallback: string,
  maxLength = 155,
) {
  const plain = (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  const source = plain || fallback;
  if (source.length <= maxLength) return source;
  const clipped = source.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const safe = lastSpace > Math.floor(maxLength * 0.72) ? clipped.slice(0, lastSpace) : clipped;
  return `${safe.replace(/[\s,;:.-]+$/g, "")}…`;
}

type ShopifySeoMetadata = {
  seo?: {
    title?: string | null;
    description?: string | null;
  } | null;
};

function productSeo(product: ShopifyProduct) {
  return (product.node as ShopifyProduct["node"] & ShopifySeoMetadata).seo;
}

export function productSeoTitle(product: ShopifyProduct) {
  return productSeo(product)?.title?.replace(/\s+/g, " ").trim() || product.node.title;
}

export function productMetaDescription(product: ShopifyProduct) {
  const node = product.node;
  const brand = node.vendor?.trim();
  const type = node.productType?.trim();
  const fallback = `Shop ${node.title}${brand ? ` by ${brand}` : ""} in Lebanon at ${SITE_NAME}. View price, availability, specifications, delivery and warranty information.`;
  const merchantSeoDescription = productSeo(product)?.description?.trim();

  // Shopify's dedicated SEO description is merchant-authored specifically for
  // search snippets, so it takes priority over the general product body copy.
  if (merchantSeoDescription) {
    return cleanMetaDescription(merchantSeoDescription, fallback);
  }

  // Very short merchant descriptions are not useful snippets. Use a complete,
  // purchase-oriented fallback instead of cutting a sentence mid-way.
  const source = (node.description ?? "").replace(/\s+/g, " ").trim();
  if (source.length < 90) return cleanMetaDescription(fallback, fallback);

  const contextual = `${source}${type ? ` ${type}.` : ""}`;
  return cleanMetaDescription(contextual, fallback);
}

export function socialMeta({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  imageWidth,
  imageHeight,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "product";
  imageWidth?: number;
  imageHeight?: number;
}) {
  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:url", content: absoluteUrl(path) },
    { property: "og:image", content: image },
    ...(imageWidth ? [{ property: "og:image:width", content: String(imageWidth) }] : []),
    ...(imageHeight ? [{ property: "og:image:height", content: String(imageHeight) }] : []),
    { property: "og:image:alt", content: title },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "en_LB" },
    { property: "og:locale:alternate", content: "ar_LB" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
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

export function organizationJsonLd() {
  const sameAs = [
    STORE_CONFIG.socialInstagram,
    STORE_CONFIG.socialFacebook,
    STORE_CONFIG.socialX,
    STORE_CONFIG.socialYoutube,
  ].filter(Boolean);
  const telephone = STORE_CONFIG.whatsappNumber ? `+${STORE_CONFIG.whatsappNumber}` : undefined;
  const detailedAddress =
    STORE_CONFIG.invoiceAddress && STORE_CONFIG.invoiceAddress.toLowerCase() !== "lebanon"
      ? STORE_CONFIG.invoiceAddress
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: ["Space Call Lebanon", "SpaceCall"],
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: DEFAULT_OG_IMAGE,
    },
    image: DEFAULT_OG_IMAGE,
    description: `${SITE_NAME} is an electronics store in Lebanon for smartphones, tablets, laptops, audio, wearables and accessories.`,
    address: {
      "@type": "PostalAddress",
      addressCountry: "LB",
      ...(detailedAddress ? { streetAddress: detailedAddress } : {}),
    },
    areaServed: {
      "@type": "Country",
      name: "Lebanon",
    },
    ...(telephone
      ? {
          telephone,
          contactPoint: [
            {
              "@type": "ContactPoint",
              telephone,
              contactType: "customer service",
              areaServed: "LB",
              availableLanguage: ["en", "ar"],
            },
          ],
        }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: "Space Call Lebanon",
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: ["en-LB", "ar-LB"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
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
  const variants = node.variants.edges.map((entry) => entry.node);
  const primaryVariant = variants[0];
  const images = node.images.edges.slice(0, 10).map((entry) => cdnImage(entry.node.url, 1200));
  const sku = primaryVariant?.sku || undefined;
  const brand = node.vendor?.trim() || undefined;
  const productUrl = absoluteUrl(`/product/${node.handle}`);
  const offers = variants.map((variant) => ({
    "@type": "Offer",
    url: productUrl,
    priceCurrency: variant.price.currencyCode,
    price: variant.price.amount,
    availability: variant.availableForSale
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": `${SITE_URL}/#organization` },
    areaServed: {
      "@type": "Country",
      name: "Lebanon",
    },
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: node.title,
    description: productMetaDescription(product),
    image: images.length ? images : undefined,
    sku,
    mpn: sku,
    ...gtinJsonLd(primaryVariant?.barcode),
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    category: node.productType?.trim() || undefined,
    url: productUrl,
    mainEntityOfPage: productUrl,
    offers: offers.length ? offers : undefined,
  };
}
