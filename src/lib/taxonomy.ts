import {
  Battery,
  Cable,
  Cpu,
  Gamepad2,
  Headphones,
  Keyboard,
  Laptop,
  Monitor,
  Plug,
  Package,
  Camera,
  Shield,
  Smartphone,
  Speaker,
  Tablet,
  Tv,
  Watch,
  type LucideIcon,
} from "lucide-react";

import {
  productCollectionHandles,
  productPrice,
  productInStock,
  type ShopifyCollection,
  type ShopifyProduct,
} from "@/lib/shopify";

export interface CategoryDefinition {
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Lowercase keywords matched against product type, tags, collections and title. */
  keywords: string[];
}

/**
 * Category dictionary. It maps *keywords* to sections — never individual
 * products — so any new Shopify product resolves automatically.
 */
export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    slug: "smartphones",
    label: "Smartphones",
    icon: Smartphone,
    keywords: [
      "smartphone",
      "smart phone",
      "phone",
      "mobile",
      "iphone",
      "galaxy s",
      "galaxy z",
      "galaxy a",
      "galaxy note",
      "pixel",
      "redmi",
      "poco",
      "reno",
      "nord",
    ],
  },
  {
    slug: "tablets",
    label: "Tablets",
    icon: Tablet,
    keywords: ["tablet", "ipad", "galaxy tab", "pad ", "matepad", "tab s"],
  },
  {
    slug: "laptops",
    label: "Laptops",
    icon: Laptop,
    keywords: ["laptop", "macbook", "notebook", "chromebook", "ultrabook", "gaming laptop"],
  },
  {
    slug: "smartwatches",
    label: "Smartwatches",
    icon: Watch,
    keywords: [
      "smartwatch",
      "smart watch",
      "watch",
      "apple watch",
      "galaxy watch",
      "band",
      "fitness tracker",
    ],
  },
  {
    slug: "headphones",
    label: "Headphones & Earbuds",
    icon: Headphones,
    keywords: [
      "headphone",
      "headphones",
      "earbud",
      "earbuds",
      "earphone",
      "airpods",
      "buds",
      "headset",
      "tws",
      "in-ear",
      "over-ear",
    ],
  },
  {
    slug: "audio",
    label: "Audio & Speakers",
    icon: Speaker,
    keywords: ["speaker", "soundbar", "audio", "boombox", "microphone", "hi-fi", "subwoofer"],
  },
  {
    slug: "chargers",
    label: "Chargers",
    icon: Plug,
    keywords: [
      "charger",
      "charging",
      "adapter",
      "wall plug",
      "gan",
      "magsafe",
      "wireless charger",
      "charging pad",
      "dock",
    ],
  },
  {
    slug: "cables",
    label: "Cables",
    icon: Cable,
    keywords: ["cable", "cord", "usb-c", "usb c", "lightning cable", "hdmi", "aux", "adaptor cable"],
  },
  {
    slug: "power-banks",
    label: "Power Banks",
    icon: Battery,
    keywords: ["power bank", "powerbank", "portable charger", "mah", "battery pack"],
  },
  {
    slug: "cases",
    label: "Cases & Protection",
    icon: Shield,
    keywords: [
      "case",
      "cases",
      "cover",
      "screen protector",
      "tempered glass",
      "bumper",
      "protection",
      "sleeve",
    ],
  },
  {
    slug: "wearables",
    label: "Wearables",
    icon: Cpu,
    keywords: ["wearable", "smart ring", "smart glasses", "vr", "ar glasses"],
  },
  {
    slug: "cameras",
    label: "Cameras",
    icon: Camera,
    keywords: ["camera", "gopro", "action cam", "webcam", "drone", "gimbal", "lens"],
  },
  {
    slug: "tv-displays",
    label: "TV & Displays",
    icon: Tv,
    keywords: ["tv", "television", "projector", "display"],
  },
  {
    slug: "monitors",
    label: "Monitors",
    icon: Monitor,
    keywords: ["monitor", "gaming monitor", "curved screen"],
  },
  {
    slug: "gaming",
    label: "Gaming",
    icon: Gamepad2,
    keywords: ["gaming", "console", "playstation", "xbox", "nintendo", "controller", "gamepad"],
  },
  {
    slug: "computer-accessories",
    label: "Keyboards & Mice",
    icon: Keyboard,
    keywords: ["keyboard", "mouse", "trackpad", "hub", "ssd", "flash drive", "memory card"],
  },
  {
    slug: "accessories",
    label: "Accessories",
    icon: Package,
    keywords: [
      "accessory",
      "accessories",
      "holder",
      "mount",
      "stand",
      "grip",
      "stylus",
      "pen",
      "strap",
      "bag",
      "tripod",
      "car mount",
      "ring light",
    ],
  },
];

/** Known brand keywords. Vendor data wins when it is meaningful. */
const BRAND_KEYWORDS: Array<{ slug: string; label: string; keywords: string[] }> = [
  { slug: "apple", label: "Apple", keywords: ["apple", "iphone", "ipad", "airpods", "macbook", "magsafe", "imac"] },
  { slug: "samsung", label: "Samsung", keywords: ["samsung", "galaxy"] },
  { slug: "xiaomi", label: "Xiaomi", keywords: ["xiaomi", "redmi", "poco", "mi "] },
  { slug: "google", label: "Google", keywords: ["google", "pixel"] },
  { slug: "oneplus", label: "OnePlus", keywords: ["oneplus", "one plus", "nord"] },
  { slug: "huawei", label: "Huawei", keywords: ["huawei", "matepad", "matebook"] },
  { slug: "honor", label: "Honor", keywords: ["honor"] },
  { slug: "oppo", label: "Oppo", keywords: ["oppo", "reno"] },
  { slug: "realme", label: "Realme", keywords: ["realme"] },
  { slug: "vivo", label: "Vivo", keywords: ["vivo"] },
  { slug: "nothing", label: "Nothing", keywords: ["nothing phone", "nothing ear"] },
  { slug: "anker", label: "Anker", keywords: ["anker", "soundcore"] },
  { slug: "baseus", label: "Baseus", keywords: ["baseus"] },
  { slug: "ugreen", label: "UGREEN", keywords: ["ugreen"] },
  { slug: "belkin", label: "Belkin", keywords: ["belkin"] },
  { slug: "jbl", label: "JBL", keywords: ["jbl"] },
  { slug: "sony", label: "Sony", keywords: ["sony", "wh-1000", "playstation"] },
  { slug: "bose", label: "Bose", keywords: ["bose"] },
  { slug: "beats", label: "Beats", keywords: ["beats"] },
  { slug: "jvc", label: "JVC", keywords: ["jvc"] },
  { slug: "lenovo", label: "Lenovo", keywords: ["lenovo", "thinkpad"] },
  { slug: "asus", label: "Asus", keywords: ["asus", "rog", "zenbook"] },
  { slug: "hp", label: "HP", keywords: ["hp ", "hewlett"] },
  { slug: "dell", label: "Dell", keywords: ["dell", "alienware"] },
  { slug: "logitech", label: "Logitech", keywords: ["logitech"] },
  { slug: "spigen", label: "Spigen", keywords: ["spigen"] },
  { slug: "nokia", label: "Nokia", keywords: ["nokia"] },
  { slug: "motorola", label: "Motorola", keywords: ["motorola", "moto "] },
  { slug: "tecno", label: "Tecno", keywords: ["tecno"] },
  { slug: "infinix", label: "Infinix", keywords: ["infinix"] },
];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function haystack(product: ShopifyProduct) {
  const node = product.node;
  return [
    node.title,
    node.productType ?? "",
    node.vendor ?? "",
    (node.tags ?? []).join(" "),
    (node.collections?.edges ?? []).map((edge) => `${edge.node.title} ${edge.node.handle}`).join(" "),
    node.options.map((option) => `${option.name} ${option.values.join(" ")}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function matchesKeyword(text: string, keyword: string) {
  return text.includes(keyword.toLowerCase());
}

/**
 * Resolves every category a product belongs to, in signal priority order:
 * explicit `category:` tags → product type → collections → keywords.
 */
export function resolveCategories(product: ShopifyProduct): CategoryDefinition[] {
  const node = product.node;
  const explicit = new Set<string>();

  for (const tag of node.tags ?? []) {
    const [key, value] = tag.split(":");
    if (key && value && ["category", "cat", "section"].includes(key.trim().toLowerCase())) {
      explicit.add(slugify(value));
    }
  }

  const bySlug = new Map(CATEGORY_DEFINITIONS.map((definition) => [definition.slug, definition]));
  const resolved = new Map<string, CategoryDefinition>();

  for (const slug of explicit) {
    const definition = bySlug.get(slug);
    if (definition) resolved.set(slug, definition);
  }

  const type = (node.productType ?? "").toLowerCase();
  const collectionText = productCollectionHandles(product).join(" ").toLowerCase();
  const text = haystack(product);

  for (const definition of CATEGORY_DEFINITIONS) {
    if (resolved.has(definition.slug)) continue;
    const typeMatch = type && definition.keywords.some((keyword) => matchesKeyword(type, keyword));
    const collectionMatch =
      collectionText &&
      (collectionText.includes(definition.slug) ||
        definition.keywords.some((keyword) => matchesKeyword(collectionText, keyword)));
    const keywordMatch = definition.keywords.some((keyword) => matchesKeyword(text, keyword));
    if (typeMatch || collectionMatch || keywordMatch) resolved.set(definition.slug, definition);
  }

  return [...resolved.values()];
}

/** Primary (most specific) category, used for related products and breadcrumbs. */
export function primaryCategory(product: ShopifyProduct): CategoryDefinition | null {
  const categories = resolveCategories(product);
  if (categories.length === 0) return null;
  const generic = new Set(["accessories"]);
  return categories.find((category) => !generic.has(category.slug)) ?? categories[0] ?? null;
}

export interface BrandRef {
  slug: string;
  label: string;
}

/**
 * Resolves a brand from `brand:` tags → known brand keywords → vendor.
 * `genericVendors` are vendor names that carry no brand meaning (e.g. the shop
 * name applied to every product), detected from catalog statistics.
 */
export function resolveBrand(
  product: ShopifyProduct,
  genericVendors: Set<string> = new Set(),
): BrandRef | null {
  const node = product.node;

  for (const tag of node.tags ?? []) {
    const [key, value] = tag.split(":");
    if (key && value && ["brand", "vendor", "make"].includes(key.trim().toLowerCase())) {
      const known = BRAND_KEYWORDS.find((brand) => brand.slug === slugify(value));
      return known ? { slug: known.slug, label: known.label } : { slug: slugify(value), label: value.trim() };
    }
  }

  const vendor = (node.vendor ?? "").trim();
  const vendorLower = vendor.toLowerCase();
  const vendorIsGeneric = !vendor || genericVendors.has(vendorLower);

  if (!vendorIsGeneric) {
    const known = BRAND_KEYWORDS.find((brand) =>
      brand.keywords.some((keyword) => matchesKeyword(vendorLower, keyword)),
    );
    return known ? { slug: known.slug, label: known.label } : { slug: slugify(vendor), label: vendor };
  }

  const text = `${node.title} ${(node.tags ?? []).join(" ")}`.toLowerCase();
  const known = BRAND_KEYWORDS.find((brand) =>
    brand.keywords.some((keyword) => matchesKeyword(text, keyword)),
  );
  return known ? { slug: known.slug, label: known.label } : null;
}

export interface CatalogFacet {
  slug: string;
  label: string;
  count: number;
  icon?: LucideIcon;
}

export interface CatalogIndex {
  products: ShopifyProduct[];
  /** Categories present in the catalog, most populated first. */
  categories: CatalogFacet[];
  /** Brands present in the catalog, most populated first. */
  brands: CatalogFacet[];
  categoryOf: Map<string, string[]>;
  brandOf: Map<string, BrandRef | null>;
  priceMin: number;
  priceMax: number;
  currency: string;
  inStockCount: number;
  onSaleCount: number;
}

/**
 * Builds the whole dynamic taxonomy from live Shopify products.
 * Nothing here is hardcoded per product: sections exist only when products
 * resolve into them, so new Shopify products appear without code changes.
 */
export function buildCatalogIndex(products: ShopifyProduct[]): CatalogIndex {
  const vendorCounts = new Map<string, number>();
  for (const product of products) {
    const vendor = (product.node.vendor ?? "").trim().toLowerCase();
    if (!vendor) continue;
    vendorCounts.set(vendor, (vendorCounts.get(vendor) ?? 0) + 1);
  }

  // A vendor applied to (almost) the entire catalog is the shop name, not a brand.
  const genericVendors = new Set<string>();
  if (products.length >= 3) {
    for (const [vendor, count] of vendorCounts) {
      const known = BRAND_KEYWORDS.some((brand) =>
        brand.keywords.some((keyword) => matchesKeyword(vendor, keyword)),
      );
      if (!known && count / products.length >= 0.8) genericVendors.add(vendor);
    }
  }

  const categoryCounts = new Map<string, { definition: CategoryDefinition; count: number }>();
  const brandCounts = new Map<string, { brand: BrandRef; count: number }>();
  const categoryOf = new Map<string, string[]>();
  const brandOf = new Map<string, BrandRef | null>();

  let priceMin = Number.POSITIVE_INFINITY;
  let priceMax = 0;
  let inStockCount = 0;
  let onSaleCount = 0;
  let currency = "USD";

  for (const product of products) {
    const categories = resolveCategories(product);
    categoryOf.set(product.node.handle, categories.map((category) => category.slug));
    for (const category of categories) {
      const entry = categoryCounts.get(category.slug);
      if (entry) entry.count += 1;
      else categoryCounts.set(category.slug, { definition: category, count: 1 });
    }

    const brand = resolveBrand(product, genericVendors);
    brandOf.set(product.node.handle, brand);
    if (brand) {
      const entry = brandCounts.get(brand.slug);
      if (entry) entry.count += 1;
      else brandCounts.set(brand.slug, { brand, count: 1 });
    }

    const price = productPrice(product);
    if (price > 0) {
      priceMin = Math.min(priceMin, price);
      priceMax = Math.max(priceMax, price);
    }
    if (productInStock(product)) inStockCount += 1;
    const compareAt = product.node.variants.edges[0]?.node.compareAtPrice?.amount;
    if (compareAt && parseFloat(compareAt) > price) onSaleCount += 1;
    currency = product.node.priceRange.minVariantPrice.currencyCode || currency;
  }

  const categories = [...categoryCounts.values()]
    .map(({ definition, count }) => ({
      slug: definition.slug,
      label: definition.label,
      icon: definition.icon,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const brands = [...brandCounts.values()]
    .map(({ brand, count }) => ({ slug: brand.slug, label: brand.label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    products,
    categories,
    brands,
    categoryOf,
    brandOf,
    priceMin: isFinite(priceMin) ? Math.floor(priceMin) : 0,
    priceMax: Math.ceil(priceMax),
    currency,
    inStockCount,
    onSaleCount,
  };
}

export function categoryDefinition(slug: string) {
  return CATEGORY_DEFINITIONS.find((definition) => definition.slug === slug) ?? null;
}

export function productsInCategory(index: CatalogIndex, slug: string) {
  return index.products.filter((product) =>
    (index.categoryOf.get(product.node.handle) ?? []).includes(slug),
  );
}

export function productsOfBrand(index: CatalogIndex, slug: string) {
  return index.products.filter((product) => index.brandOf.get(product.node.handle)?.slug === slug);
}

/** Collections worth surfacing: real collections that currently hold products. */
export function displayCollections(collections: ShopifyCollection[]) {
  return collections.filter(
    (collection) => !/^(frontpage|all)$/i.test(collection.handle),
  );
}
