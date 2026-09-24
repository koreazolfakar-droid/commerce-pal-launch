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

import { isMerchandisingCollection } from "@/lib/homeMerchandising";

import {
  productCollectionHandles,
  productPrice,
  productInStock,
  productDiscountPercent,
} from "@/lib/productPricing";
import type { StoreCollection, StoreProduct } from "@/lib/storeTypes";
import { STORE_NAME } from "@/lib/storeConfig";

export interface CategoryDefinition {
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Lowercase keywords matched against product type, tags, collections and title. */
  keywords: string[];
}

/**
 * Category dictionary. It maps *keywords* to sections — never individual
 * products — so any new catalog product resolves automatically.
 */
export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    slug: "smartphones",
    label: "Smartphones",
    icon: Smartphone,
    keywords: [
      "هاتف",
      "هواتف",
      "هاتف ذكي",
      "هواتف ذكية",
      "smartphone",
      "phone",
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
    keywords: [
      "تابلت",
      "جهاز لوحي",
      "أجهزة لوحية",
      "tablet",
      "ipad",
      "galaxy tab",
      "pad",
      "matepad",
      "tab s",
    ],
  },
  {
    slug: "laptops",
    label: "Laptops",
    icon: Laptop,
    keywords: [
      "لابتوب",
      "حاسوب محمول",
      "كمبيوتر محمول",
      "laptop",
      "macbook",
      "notebook",
      "chromebook",
      "ultrabook",
      "gaming laptop",
    ],
  },
  {
    slug: "smartwatches",
    label: "Smartwatches",
    icon: Watch,
    keywords: [
      "ساعة ذكية",
      "ساعات ذكية",
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
      "سماعة",
      "سماعات",
      "سماعات أذن",
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
    keywords: [
      "سبيكر",
      "مكبر صوت",
      "مكبرات صوت",
      "speaker",
      "soundbar",
      "audio",
      "boombox",
      "microphone",
      "hi-fi",
      "subwoofer",
    ],
  },
  {
    slug: "chargers",
    label: "Chargers",
    icon: Plug,
    keywords: [
      "شاحن",
      "شواحن",
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
    keywords: ["كابل", "كيبل", "كابلات", "cable", "cord", "charging cable", "lightning cable"],
  },
  {
    slug: "power-banks",
    label: "Power Banks",
    icon: Battery,
    keywords: [
      "باور بانك",
      "بطارية متنقلة",
      "power bank",
      "powerbank",
      "portable charger",
      "battery pack",
    ],
  },
  {
    slug: "cases",
    label: "Cases & Protection",
    icon: Shield,
    keywords: [
      "كفر",
      "غطاء",
      "حماية",
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
  {
    slug: "apple",
    label: "Apple",
    keywords: ["apple", "iphone", "ipad", "airpods", "macbook", "magsafe", "imac"],
  },
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
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
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
    const escaped = keyword
      .trim()
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:e?s)?(?:[^\\p{L}\\p{N}]|$)`, "u");
    KEYWORD_REGEX_CACHE.set(keyword, regex);
  }
  return regex.test(text);
}

function matchesAny(text: string, definition: CategoryDefinition) {
  return definition.keywords.some((keyword) => matchesKeyword(text, keyword));
}

const CATEGORY_ORDER = new Map(
  CATEGORY_DEFINITIONS.map((definition, index) => [definition.slug, index]),
);

function sortByHierarchy(categories: Iterable<CategoryDefinition>) {
  return [...categories].sort(
    (a, b) => (CATEGORY_ORDER.get(a.slug) ?? 99) - (CATEGORY_ORDER.get(b.slug) ?? 99),
  );
}

/** Known names are stable; new explicit product types/tags also get real category routes. */
function explicitCategory(value: string): CategoryDefinition {
  const slug = slugify(value);
  return (
    CATEGORY_DEFINITIONS.find(
      (item) =>
        item.slug === slug ||
        slugify(item.label) === slug ||
        item.keywords.some((keyword) => slugify(keyword) === slug),
    ) ?? { slug, label: value.trim(), icon: Package, keywords: [] }
  );
}

/** Specific accessories win over device compatibility words in an otherwise untyped title. */
function inferredCategory(text: string): CategoryDefinition | undefined {
  const matches = CATEGORY_DEFINITIONS.filter((item) => matchesAny(text.toLowerCase(), item));
  const priority = [
    "cases",
    "power-banks",
    "computer-accessories",
    "headphones",
    "audio",
    "cables",
    "chargers",
    "accessories",
    "smartwatches",
    "wearables",
    "laptops",
    "tablets",
    "monitors",
    "tv-displays",
    "cameras",
    "smartphones",
    "gaming",
  ];
  return priority.map((slug) => matches.find((item) => item.slug === slug)).find(Boolean);
}

/**
 * Explicit category tags > product type > exact category collection > title.
 * Brand campaigns, compatibility tags and variant option names are not categories.
 */
export function resolveCategories(product: StoreProduct): CategoryDefinition[] {
  const node = product.node;
  const explicit = new Map<string, CategoryDefinition>();
  for (const tag of node.tags ?? []) {
    const match = /^(?:category|cat|section):\s*(.+)$/i.exec(tag.trim());
    if (match?.[1]) {
      const category = explicitCategory(match[1]);
      if (category.slug) explicit.set(category.slug, category);
    }
  }
  if (explicit.size) return sortByHierarchy(explicit.values());

  const type = node.productType?.trim();
  if (
    type &&
    !["accessories", "accessory", "electronics", "إكسسوارات", "اكسسوارات"].includes(
      type.toLowerCase(),
    )
  ) {
    const exact = explicitCategory(type);
    const category = exact.keywords.length ? exact : (inferredCategory(type) ?? exact);
    return category.slug ? [category] : [];
  }

  const collectionCategories = new Map<string, CategoryDefinition>();
  for (const { node: collection } of node.collections?.edges ?? []) {
    const definition = collection.handle.startsWith("category-")
      ? explicitCategory(collection.handle.slice("category-".length))
      : CATEGORY_DEFINITIONS.find((item) => item.slug === collection.handle);
    if (definition?.slug) collectionCategories.set(definition.slug, definition);
  }
  if (collectionCategories.size) return sortByHierarchy(collectionCategories.values());

  const inferred = inferredCategory(node.title);
  if (inferred) return [inferred];
  if (type) return [explicitCategory(type)];
  return [];
}

/** Primary (most specific) category, used for related products and breadcrumbs. */
export function primaryCategory(product: StoreProduct): CategoryDefinition | null {
  const categories = resolveCategories(product);
  if (categories.length === 0) return null;
  const generic = new Set(["accessories"]);
  return categories.find((category) => !generic.has(category.slug)) ?? categories[0] ?? null;
}

export interface BrandRef {
  slug: string;
  label: string;
}

const GENERIC_VENDORS = new Set([
  STORE_NAME.toLowerCase(),
  STORE_NAME.toLowerCase().replace(/\s+/g, ""),
  "default",
  "generic",
  "unknown",
]);

/** Merchant brand tags and exact vendor identities win; compatibility mentions never override them. */
export function resolveBrand(
  product: StoreProduct,
  genericVendors: Set<string> = new Set(),
): BrandRef | null {
  const identity = (value: string): BrandRef | null => {
    const slug = slugify(value);
    if (!slug) return null;
    const known = BRAND_KEYWORDS.find(
      (brand) => brand.slug === slug || slugify(brand.label) === slug,
    );
    return known ? { slug: known.slug, label: known.label } : { slug, label: value.trim() };
  };
  for (const tag of product.node.tags ?? []) {
    const match = /^(?:brand|vendor|make):\s*(.+)$/i.exec(tag.trim());
    if (match?.[1] && identity(match[1])) return identity(match[1]);
  }
  const vendor = product.node.vendor?.trim() ?? "";
  if (
    vendor &&
    !GENERIC_VENDORS.has(vendor.toLowerCase()) &&
    !genericVendors.has(vendor.toLowerCase())
  )
    return identity(vendor);

  // Only a leading brand/product family is evidence; "Case for iPhone" is not Apple.
  const title = product.node.title.trim().toLowerCase();
  const category = primaryCategory(product)?.slug;
  // Device-family inference is unsafe for compatibility accessories (e.g. "iPhone case").
  const allowFamily = [
    "smartphones",
    "tablets",
    "laptops",
    "headphones",
    "smartwatches",
    "audio",
  ].includes(category ?? "");
  const known = BRAND_KEYWORDS.find((brand) =>
    [brand.label.toLowerCase(), ...(allowFamily ? brand.keywords : [])].some(
      (keyword) =>
        title.startsWith(keyword) && matchesKeyword(title.slice(0, keyword.length + 1), keyword),
    ),
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
  products: StoreProduct[];
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
 * Builds the whole dynamic taxonomy from live catalog products.
 * Nothing here is hardcoded per product: sections exist only when products
 * resolve into them, so new catalog products appear without code changes.
 */
export function buildCatalogIndex(products: StoreProduct[]): CatalogIndex {
  const categoryCounts = new Map<string, { definition: CategoryDefinition; count: number }>();
  const brandCounts = new Map<string, { brand: BrandRef; count: number }>();
  const categoryOf = new Map<string, string[]>();
  const brandOf = new Map<string, BrandRef | null>();

  let priceMin = Number.POSITIVE_INFINITY;
  let priceMax = 0;
  let inStockCount = 0;
  let onSaleCount = 0;
  let currency = "USD";
  let currencyInitialized = false;

  for (const product of products) {
    const categories = resolveCategories(product);
    categoryOf.set(
      product.node.handle,
      categories.map((category) => category.slug),
    );
    for (const category of categories) {
      const entry = categoryCounts.get(category.slug);
      if (entry) entry.count += 1;
      else categoryCounts.set(category.slug, { definition: category, count: 1 });
    }

    const brand = resolveBrand(product);
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
    if (productDiscountPercent(product) !== null) onSaleCount += 1;
    const productCurrency = product.node.priceRange.minVariantPrice.currencyCode;
    if (!currencyInitialized && productCurrency) {
      currency = productCurrency;
      currencyInitialized = true;
    }
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
export function displayCollections(collections: StoreCollection[]) {
  return collections.filter(
    (collection) =>
      !/^(frontpage|all)$/i.test(collection.handle) &&
      !isMerchandisingCollection(collection.handle),
  );
}
