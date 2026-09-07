import {
  Battery,
  BriefcaseBusiness,
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
      "mobile phone",
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
    keywords: ["tablet", "ipad", "galaxy tab", "pad", "matepad", "tab s"],
  },
  {
    slug: "laptops",
    label: "Laptops",
    icon: Laptop,
    keywords: ["laptop", "macbook", "notebook", "chromebook", "ultrabook", "gaming laptop"],
  },
  {
    slug: "bags",
    label: "Bags",
    icon: BriefcaseBusiness,
    keywords: [
      "bag",
      "bags",
      "backpack",
      "laptop bag",
      "sling bag",
      "messenger bag",
      "briefcase",
      "travel bag",
      "pouch",
    ],
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
      "smart band",
      "mi band",
      "fitness tracker",
      "fitness band",
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
      "wall charger",
      "car charger",
      "power adapter",
      "adapter",
      "wall plug",
      "gan",
      "magsafe",
      "wireless charger",
      "charging pad",
      "charging dock",
      "dock",
    ],
  },
  {
    slug: "cables",
    label: "Cables",
    icon: Cable,
    keywords: ["cable", "cord", "charging cable", "usb-c", "usb c", "lightning cable", "hdmi", "aux"],
  },
  {
    slug: "power-banks",
    label: "Power Banks",
    icon: Battery,
    keywords: ["power bank", "powerbank", "portable charger", "battery pack"],
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
  { slug: "redmi", label: "Redmi", keywords: ["redmi"] },
  { slug: "poco", label: "POCO", keywords: ["poco"] },
  { slug: "xiaomi", label: "Xiaomi", keywords: ["xiaomi", "mi"] },
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
  { slug: "hp", label: "HP", keywords: ["hp", "hewlett"] },
  { slug: "dell", label: "Dell", keywords: ["dell", "alienware"] },
  { slug: "logitech", label: "Logitech", keywords: ["logitech"] },
  { slug: "spigen", label: "Spigen", keywords: ["spigen"] },
  { slug: "nokia", label: "Nokia", keywords: ["nokia"] },
  { slug: "motorola", label: "Motorola", keywords: ["motorola", "moto"] },
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

const KEYWORD_REGEX_CACHE = new Map<string, RegExp>();

/**
 * Whole-word keyword matching with plural tolerance ("laptop" ⇢ "laptops").
 * Substring matching is intentionally banned here: it made "phone" match
 * "headphones" and a "Laptop" tag put power banks inside the Laptops category.
 */
function matchesKeyword(text: string, keyword: string) {
  let regex = KEYWORD_REGEX_CACHE.get(keyword);
  if (!regex) {
    const escaped = keyword.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:e?s)?(?:[^a-z0-9]|$)`);
    KEYWORD_REGEX_CACHE.set(keyword, regex);
  }
  return regex.test(text);
}

function matchesAny(text: string, definition: CategoryDefinition) {
  return definition.keywords.some((keyword) => matchesKeyword(text, keyword));
}

const CATEGORY_ORDER = new Map(CATEGORY_DEFINITIONS.map((definition, index) => [definition.slug, index]));

function sortByHierarchy(categories: Iterable<CategoryDefinition>) {
  return [...categories].sort(
    (a, b) => (CATEGORY_ORDER.get(a.slug) ?? 99) - (CATEGORY_ORDER.get(b.slug) ?? 99),
  );
}

/**
 * Resolves the categories a product belongs to using *tiered* signals — the
 * first tier that produces a match wins, so a weak signal (a stray word in the
 * tags) can never override a strong one (the Shopify product type):
 *   1. explicit `category:` tags   (the merchant said so)
 *   2. product type               (authoritative Shopify field)
 *   3. collection titles/handles
 *   4. product title
 *   5. tags + option names
 */
export function resolveCategories(product: ShopifyProduct): CategoryDefinition[] {
  const node = product.node;
  const bySlug = new Map(CATEGORY_DEFINITIONS.map((definition) => [definition.slug, definition]));
  const resolved = new Map<string, CategoryDefinition>();

  for (const tag of node.tags ?? []) {
    const [key, value] = tag.split(":");
    if (key && value && ["category", "cat", "section"].includes(key.trim().toLowerCase())) {
      const definition = bySlug.get(slugify(value));
      if (definition) resolved.set(definition.slug, definition);
    }
  }
  if (resolved.size > 0) return sortByHierarchy(resolved.values());

  const type = (node.productType ?? "").toLowerCase();
  if (type) {
    for (const definition of CATEGORY_DEFINITIONS) {
      if (matchesAny(type, definition)) resolved.set(definition.slug, definition);
    }
    if (resolved.size > 0) return sortByHierarchy(resolved.values());
  }

  const collectionText = (node.collections?.edges ?? [])
    .map((edge) => `${edge.node.title} ${edge.node.handle}`)
    .join(" ")
    .toLowerCase();
  if (collectionText) {
    for (const definition of CATEGORY_DEFINITIONS) {
      if (
        collectionText.includes(definition.slug) ||
        matchesKeyword(collectionText, definition.slug.replace(/-/g, " ")) ||
        matchesAny(collectionText, definition)
      ) {
        resolved.set(definition.slug, definition);
      }
    }
    if (resolved.size > 0) return sortByHierarchy(resolved.values());
  }

  const title = node.title.toLowerCase();
  for (const definition of CATEGORY_DEFINITIONS) {
    if (matchesAny(title, definition)) resolved.set(definition.slug, definition);
  }
  if (resolved.size > 0) return sortByHierarchy(resolved.values());

  const rest = [
    (node.tags ?? []).join(" "),
    node.options.map((option) => `${option.name} ${option.values.join(" ")}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  for (const definition of CATEGORY_DEFINITIONS) {
    if (matchesAny(rest, definition)) resolved.set(definition.slug, definition);
  }
  return sortByHierarchy(resolved.values());
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
    .sort(
      (a, b) =>
        (CATEGORY_ORDER.get(a.slug) ?? 99) - (CATEGORY_ORDER.get(b.slug) ?? 99) ||
        b.count - a.count,
    );

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
