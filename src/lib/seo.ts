import { cdnImage } from "@/lib/image";
import { productInStock, productPrimaryVariant } from "@/lib/productPricing";
import type { StoreProduct } from "@/lib/storeTypes";
import { isUsedPhone } from "@/lib/usedPhones";
import { SITE_URL as CONFIG_SITE_URL, STORE_CONFIG, STORE_NAME, storeUrl } from "@/lib/storeConfig";

export const SITE_URL = CONFIG_SITE_URL;
export const SITE_NAME = STORE_NAME;
// PNG is more widely supported by social crawlers than SVG for Open Graph previews.
export const DEFAULT_OG_IMAGE = storeUrl("/logo.png");

export function absoluteUrl(path = "/") {
  return storeUrl(path);
}

export function canonicalUrl(path: string, override?: string | null) {
  const fallback = absoluteUrl(path);
  const candidate = override?.trim();
  if (!candidate) return fallback;

  try {
    const site = new URL(SITE_URL);
    const resolved = new URL(candidate, `${SITE_URL}/`);
    if (resolved.origin !== site.origin) return fallback;

    resolved.search = "";
    resolved.hash = "";
    resolved.pathname = resolved.pathname === "/" ? "/" : resolved.pathname.replace(/\/+$/, "");
    return resolved.toString();
  } catch {
    return fallback;
  }
}

export function canonicalLink(path: string, override?: string | null) {
  return { rel: "canonical", href: canonicalUrl(path, override) };
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

export function productMetaDescription(product: StoreProduct) {
  const node = product.node;
  const brand = node.vendor?.trim();
  const type = node.productType?.trim();
  const fallback = `Shop ${node.title}${brand ? ` by ${brand}` : ""} in Lebanon at ${SITE_NAME}. View price, availability, specifications, delivery and warranty information.`;

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
  locale = "en_LB",
  alternateLocale = "ar_LB",
  url,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "product";
  imageWidth?: number;
  imageHeight?: number;
  locale?: "en_LB" | "ar_LB";
  alternateLocale?: "en_LB" | "ar_LB";
  url?: string;
}) {
  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:url", content: url ?? absoluteUrl(path) },
    { property: "og:image", content: image },
    ...(imageWidth ? [{ property: "og:image:width", content: String(imageWidth) }] : []),
    ...(imageHeight ? [{ property: "og:image:height", content: String(imageHeight) }] : []),
    { property: "og:image:alt", content: title },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: locale },
    ...(alternateLocale !== locale
      ? [{ property: "og:locale:alternate", content: alternateLocale }]
      : []),
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

function productItemCondition(product: StoreProduct) {
  const node = product.node;
  const text = [
    node.title,
    node.productType,
    ...(node.tags ?? []),
    ...(node.collections?.edges ?? []).flatMap((edge) => [edge.node.handle, edge.node.title]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/refurbished|renewed|مجدد|مجددة/.test(text)) {
    return "https://schema.org/RefurbishedCondition";
  }
  if (isUsedPhone(product)) return "https://schema.org/UsedCondition";
  return "https://schema.org/NewCondition";
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
  };
}

export function itemListJsonLd(
  name: string,
  products: StoreProduct[],
  pathForProduct: (product: StoreProduct) => string = (product) =>
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

export function productJsonLd(product: StoreProduct) {
  const node = product.node;
  const variant = productPrimaryVariant(product) ?? node.variants.edges[0]?.node;
  const price = variant?.price ?? node.priceRange.minVariantPrice;
  const images = node.images.edges.slice(0, 10).map((entry) => cdnImage(entry.node.url, 1200));
  const sku = variant?.sku || undefined;
  const brand = node.vendor?.trim() || undefined;
  const activePrice = Number(price.amount);
  const hasValidMerchantPrice =
    Number.isFinite(activePrice) &&
    activePrice > 0 &&
    /^[A-Z]{3}$/.test(price.currencyCode);
  const compareAt = variant?.compareAtPrice;
  const compareAtPrice = compareAt ? Number(compareAt.amount) : NaN;
  const compareAtCurrency = compareAt?.currencyCode ?? price.currencyCode;
  const hasStrikethroughPrice =
    Number.isFinite(activePrice) &&
    Number.isFinite(compareAtPrice) &&
    compareAtPrice > activePrice &&
    compareAt?.currencyCode === price.currencyCode;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${absoluteUrl(`/product/${node.handle}`)}#product`,
    name: node.title,
    description: productMetaDescription(product),
    image: images.length ? images : undefined,
    sku,
    ...gtinJsonLd(variant?.barcode),
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    category: node.productType?.trim() || undefined,
    ...(variant?.selectedOptions?.length
      ? {
          additionalProperty: variant.selectedOptions.map((option) => ({
            "@type": "PropertyValue",
            name: option.name,
            value: option.value,
          })),
        }
      : {}),
    url: absoluteUrl(`/product/${node.handle}`),
    mainEntityOfPage: absoluteUrl(`/product/${node.handle}`),
    offers: hasValidMerchantPrice
      ? {
          "@type": "Offer",
          url: absoluteUrl(`/product/${node.handle}`),
          priceCurrency: price.currencyCode,
          price: activePrice,
          ...(hasStrikethroughPrice
            ? {
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  priceType: "https://schema.org/StrikethroughPrice",
                  price: compareAtPrice,
                  priceCurrency: compareAtCurrency,
                },
              }
            : {}),
          availability: productInStock(product)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: productItemCondition(product),
          areaServed: {
            "@type": "Country",
            name: "Lebanon",
          },
          seller: { "@id": `${SITE_URL}/#organization` },
        }
      : undefined,
  };
}
