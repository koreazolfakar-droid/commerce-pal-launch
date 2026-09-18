import { products as seedProducts, type Product } from "@/dashboard/mock/data";

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  active: boolean;
  order: number;
  featured: boolean;
  image?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt?: string;
  updatedAt?: string;
};

type StoredCategory = Partial<CatalogCategory> & {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  icon?: unknown;
  description?: unknown;
  active?: unknown;
  order?: unknown;
  featured?: unknown;
};

const CATEGORY_STORAGE_KEY = "spacecall-categories";
const PRODUCT_STORAGE_KEY = "spacecall-products";

export function normalizeCategorySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createUniqueCategorySlug(
  value: string,
  categories: CatalogCategory[],
  excludeId?: string,
) {
  const base = normalizeCategorySlug(value) || "category";
  const used = new Set(
    categories
      .filter((category) => category.id !== excludeId)
      .map((category) => category.slug.toLowerCase()),
  );

  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function normalizeStoredCategory(value: StoredCategory, index: number): CatalogCategory {
  const fallbackName =
    typeof value.name === "string" && value.name.trim()
      ? value.name.trim()
      : `Category ${index + 1}`;
  const rawSlug = typeof value.slug === "string" && value.slug.trim() ? value.slug : fallbackName;
  const rawOrder = typeof value.order === "number" ? value.order : Number(value.order);

  return {
    id:
      typeof value.id === "string" && value.id.trim() ? value.id : `category-migrated-${index + 1}`,
    name: fallbackName,
    slug: normalizeCategorySlug(rawSlug) || `category-${index + 1}`,
    icon: typeof value.icon === "string" && value.icon.trim() ? value.icon : "LayoutGrid",
    description: typeof value.description === "string" ? value.description : "",
    active: typeof value.active === "boolean" ? value.active : true,
    order: Number.isFinite(rawOrder) && rawOrder > 0 ? Math.floor(rawOrder) : index + 1,
    featured: typeof value.featured === "boolean" ? value.featured : false,
    image: typeof value.image === "string" && value.image.trim() ? value.image : undefined,
    seoTitle:
      typeof value.seoTitle === "string" && value.seoTitle.trim() ? value.seoTitle : undefined,
    seoDescription:
      typeof value.seoDescription === "string" && value.seoDescription.trim()
        ? value.seoDescription
        : undefined,
    createdAt: typeof value.createdAt === "string" && value.createdAt ? value.createdAt : undefined,
    updatedAt: typeof value.updatedAt === "string" && value.updatedAt ? value.updatedAt : undefined,
  };
}

export function normalizeCategories(values: StoredCategory[]) {
  const usedIds = new Set<string>();
  const usedSlugs = new Set<string>();

  return values.map((value, index) => {
    const normalized = normalizeStoredCategory(value, index);

    let id = normalized.id;
    let idSuffix = 2;
    while (usedIds.has(id)) {
      id = `${normalized.id}-${idSuffix}`;
      idSuffix += 1;
    }
    usedIds.add(id);

    let slug = normalized.slug;
    let slugSuffix = 2;
    while (usedSlugs.has(slug.toLowerCase())) {
      slug = `${normalized.slug}-${slugSuffix}`;
      slugSuffix += 1;
    }
    usedSlugs.add(slug.toLowerCase());

    return { ...normalized, id, slug };
  });
}

export const seedCategories: CatalogCategory[] = [
  {
    id: "smartphones",
    name: "Smartphones",
    slug: "smartphones",
    icon: "Smartphone",
    description: "iPhone, Galaxy, Xiaomi, Pixel, and more.",
    active: true,
    order: 1,
    featured: true,
  },
  {
    id: "tablets",
    name: "Tablets",
    slug: "tablets",
    icon: "Tablet",
    description: "Portable displays for work, study, and entertainment.",
    active: true,
    order: 2,
    featured: true,
  },
  {
    id: "smartwatches",
    name: "Smartwatches",
    slug: "smartwatches",
    icon: "Watch",
    description: "Connected watches, fitness tracking, and wearables.",
    active: true,
    order: 3,
    featured: true,
  },
  {
    id: "audio",
    name: "Audio",
    slug: "audio",
    icon: "Headphones",
    description: "Earbuds, headphones, speakers, and premium sound.",
    active: true,
    order: 4,
    featured: true,
  },
  {
    id: "chargers-cables",
    name: "Chargers & Cables",
    slug: "chargers-cables",
    icon: "BatteryCharging",
    description: "Fast charging, power adapters, cables, and hubs.",
    active: true,
    order: 5,
    featured: false,
  },
  {
    id: "accessories",
    name: "Accessories",
    slug: "accessories",
    icon: "Cable",
    description: "Cases, protection, mounts, and everyday essentials.",
    active: true,
    order: 6,
    featured: false,
  },
  {
    id: "gaming",
    name: "Gaming",
    slug: "gaming",
    icon: "Gamepad2",
    description: "Consoles, controllers, gaming audio, and accessories.",
    active: true,
    order: 7,
    featured: false,
  },
  {
    id: "laptops",
    name: "Laptops",
    slug: "laptops",
    icon: "Laptop",
    description: "Portable computers for work, study, and creators.",
    active: true,
    order: 8,
    featured: false,
  },
  {
    id: "deals",
    name: "Deals",
    slug: "deals",
    icon: "BadgePercent",
    description: "Limited offers and Space Call promotional picks.",
    active: true,
    order: 9,
    featured: true,
  },
];

export function readCategories(): CatalogCategory[] {
  if (typeof localStorage === "undefined") return seedCategories;

  try {
    const parsed = JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY) || "null");
    if (!Array.isArray(parsed)) return seedCategories;

    const normalized = normalizeCategories(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return seedCategories;
  }
}

export function saveCategories(categories: CatalogCategory[]) {
  const normalized = normalizeCategories(categories);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function categoryIdForName(name: string, categories = readCategories()) {
  const normalizedName = name.toLowerCase();
  const found = categories.find(
    (category) =>
      category.name.toLowerCase() === normalizedName ||
      category.id.toLowerCase() === normalizedName ||
      category.slug.toLowerCase() === normalizedName,
  );

  return found?.id || normalizeCategorySlug(name);
}

export function readCatalogProducts(): Product[] {
  if (typeof localStorage === "undefined") return seedProducts;

  try {
    const saved = JSON.parse(localStorage.getItem(PRODUCT_STORAGE_KEY) || "null");
    return Array.isArray(saved) ? saved : seedProducts;
  } catch {
    return seedProducts;
  }
}

export function saveCatalogProducts(next: Product[]) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function saveCatalogProduct(product: Product) {
  const current = readCatalogProducts();
  const next = current.some((item) => item.id === product.id)
    ? current.map((item) => (item.id === product.id ? product : item))
    : [...current, product];

  saveCatalogProducts(next);
  return product;
}

export function productBelongsToCategory(product: Product, category: CatalogCategory) {
  const productCategory = product.category.toLowerCase();
  const aliases: Record<string, string[]> = {
    smartphones: ["smartphones", "phones", "mobile phones"],
    tablets: ["tablets", "tablet"],
    smartwatches: ["smartwatches", "watches", "wearables"],
    audio: ["audio", "headphones", "earbuds", "speakers"],
    headphones: ["headphones", "earbuds", "audio"],
    "chargers-cables": ["chargers & cables", "chargers", "charging", "cables", "cable"],
    chargers: ["chargers", "charging", "chargers & cables"],
    accessories: ["accessories"],
    gaming: ["gaming", "games"],
    laptops: ["laptops", "laptop", "notebooks"],
    deals: ["deals", "offers", "sale"],
  };

  return (
    productCategory === category.name.toLowerCase() ||
    productCategory === category.id.toLowerCase() ||
    productCategory === category.slug.toLowerCase() ||
    (aliases[category.id] || []).includes(productCategory)
  );
}

export function getProductsForCategory(products: Product[], category: CatalogCategory) {
  return products.filter((product) => productBelongsToCategory(product, category));
}

export function getCategoryProductCount(products: Product[], category: CatalogCategory) {
  return getProductsForCategory(products, category).length;
}

export function countProductsAssignedToValidCategories(
  products: Product[],
  categories: CatalogCategory[],
) {
  return products.filter((product) =>
    categories.some((category) => productBelongsToCategory(product, category)),
  ).length;
}

export function assignProductsToCategory(
  products: Product[],
  productIds: string[],
  categoryName: string,
) {
  const ids = new Set(productIds);
  return products.map((product) =>
    ids.has(product.id) ? { ...product, category: categoryName } : product,
  );
}

export function moveCategoryProducts(
  products: Product[],
  fromCategory: CatalogCategory,
  destinationCategoryName: string,
) {
  return products.map((product) =>
    productBelongsToCategory(product, fromCategory)
      ? { ...product, category: destinationCategoryName }
      : product,
  );
}

export function persistCatalogSnapshot(categories: CatalogCategory[], products: Product[]) {
  const savedCategories = saveCategories(categories);
  const savedProducts = saveCatalogProducts(products);
  return { categories: savedCategories, products: savedProducts };
}
