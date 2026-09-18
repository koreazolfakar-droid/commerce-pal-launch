import type { Product } from "@/dashboard/mock/data";
import { readCatalogProducts, saveCatalogProducts } from "@/dashboard/mock/catalog";

export type CatalogBrand = {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  featured: boolean;
  order: number;
  logo?: string;
  coverImage?: string;
  website?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt?: string;
  updatedAt?: string;
};

type StoredBrand = Partial<CatalogBrand> & {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  active?: unknown;
  featured?: unknown;
  order?: unknown;
};

const BRAND_STORAGE_KEY = "spacecall-brands";

export function normalizeBrandSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createUniqueBrandSlug(value: string, brands: CatalogBrand[], excludeId?: string) {
  const base = normalizeBrandSlug(value) || "brand";
  const used = new Set(
    brands.filter((brand) => brand.id !== excludeId).map((brand) => brand.slug.toLowerCase()),
  );

  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function normalizeStoredBrand(value: StoredBrand, index: number): CatalogBrand {
  const fallbackName =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : `Brand ${index + 1}`;
  const rawSlug = typeof value.slug === "string" && value.slug.trim() ? value.slug : fallbackName;
  const rawOrder = typeof value.order === "number" ? value.order : Number(value.order);

  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : `brand-migrated-${index + 1}`,
    name: fallbackName,
    slug: normalizeBrandSlug(rawSlug) || `brand-${index + 1}`,
    description: typeof value.description === "string" ? value.description : "",
    active: typeof value.active === "boolean" ? value.active : true,
    featured: typeof value.featured === "boolean" ? value.featured : false,
    order: Number.isFinite(rawOrder) && rawOrder > 0 ? Math.floor(rawOrder) : index + 1,
    logo: typeof value.logo === "string" && value.logo.trim() ? value.logo : undefined,
    coverImage:
      typeof value.coverImage === "string" && value.coverImage.trim()
        ? value.coverImage
        : undefined,
    website: typeof value.website === "string" && value.website.trim() ? value.website : undefined,
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

export function normalizeBrands(values: StoredBrand[]) {
  const usedIds = new Set<string>();
  const usedSlugs = new Set<string>();

  return values.map((value, index) => {
    const normalized = normalizeStoredBrand(value, index);

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

export const seedBrands: CatalogBrand[] = [
  {
    id: "apple",
    name: "Apple",
    slug: "apple",
    description: "iPhone, iPad, Apple Watch, AirPods, Mac, and Apple accessories.",
    active: true,
    featured: true,
    order: 1,
    website: "https://www.apple.com",
  },
  {
    id: "samsung",
    name: "Samsung",
    slug: "samsung",
    description: "Galaxy smartphones, tablets, wearables, audio, and mobile accessories.",
    active: true,
    featured: true,
    order: 2,
    website: "https://www.samsung.com",
  },
  {
    id: "xiaomi",
    name: "Xiaomi",
    slug: "xiaomi",
    description: "Smartphones, tablets, wearables, smart devices, and accessories.",
    active: true,
    featured: true,
    order: 3,
    website: "https://www.mi.com",
  },
  {
    id: "anker",
    name: "Anker",
    slug: "anker",
    description: "Charging, power, cables, hubs, and everyday mobile accessories.",
    active: true,
    featured: true,
    order: 4,
    website: "https://www.anker.com",
  },
  {
    id: "spigen",
    name: "Spigen",
    slug: "spigen",
    description: "Cases, protection, MagSafe accessories, and device essentials.",
    active: true,
    featured: false,
    order: 5,
    website: "https://www.spigen.com",
  },
  {
    id: "sony",
    name: "Sony",
    slug: "sony",
    description: "Premium headphones, audio products, gaming, and entertainment devices.",
    active: true,
    featured: false,
    order: 6,
    website: "https://www.sony.com",
  },
];

export function readBrands(): CatalogBrand[] {
  if (typeof localStorage === "undefined") return seedBrands;

  try {
    const parsed = JSON.parse(localStorage.getItem(BRAND_STORAGE_KEY) || "null");
    if (!Array.isArray(parsed)) return seedBrands;

    const normalized = normalizeBrands(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return seedBrands;
  }
}

export function saveBrands(brands: CatalogBrand[]) {
  const normalized = normalizeBrands(brands);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function productBelongsToBrand(product: Product, brand: CatalogBrand) {
  const productBrand = product.brand.trim().toLowerCase();
  return (
    productBrand === brand.name.toLowerCase() ||
    productBrand === brand.id.toLowerCase() ||
    productBrand === brand.slug.toLowerCase()
  );
}

export function getProductsForBrand(products: Product[], brand: CatalogBrand) {
  return products.filter((product) => productBelongsToBrand(product, brand));
}

export function getBrandProductCount(products: Product[], brand: CatalogBrand) {
  return getProductsForBrand(products, brand).length;
}

export function countProductsAssignedToValidBrands(products: Product[], brands: CatalogBrand[]) {
  return products.filter((product) => brands.some((brand) => productBelongsToBrand(product, brand)))
    .length;
}

export function assignProductsToBrand(
  products: Product[],
  productIds: string[],
  brandName: string,
) {
  const ids = new Set(productIds);
  return products.map((product) =>
    ids.has(product.id) ? { ...product, brand: brandName } : product,
  );
}

export function moveBrandProducts(
  products: Product[],
  fromBrand: CatalogBrand,
  destinationBrandName: string,
) {
  return products.map((product) =>
    productBelongsToBrand(product, fromBrand)
      ? { ...product, brand: destinationBrandName }
      : product,
  );
}

export function persistBrandSnapshot(brands: CatalogBrand[], products: Product[]) {
  const savedBrands = saveBrands(brands);
  const savedProducts = saveCatalogProducts(products);
  return { brands: savedBrands, products: savedProducts };
}

export function readBrandCatalogProducts() {
  return readCatalogProducts();
}
