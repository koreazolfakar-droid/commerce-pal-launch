import { productCompareAt, productInStock, productPrice, type ShopifyProduct } from "@/lib/shopify";
import type { CatalogIndex } from "@/lib/taxonomy";

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
  { value: "title-asc", label: "Name: A–Z" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export interface ProductFilters {
  q?: string | undefined;
  category?: string[] | undefined;
  brand?: string[] | undefined;
  collection?: string[] | undefined;
  min?: number | undefined;
  max?: number | undefined;
  availability?: "in-stock" | "on-sale" | undefined;
  sort?: SortValue | undefined;
}

const SORT_VALUES = SORT_OPTIONS.map((option) => option.value) as readonly string[];

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const list = value.map(String).filter(Boolean);
    return list.length > 0 ? list : undefined;
  }
  if (typeof value === "string" && value.length > 0) {
    const list = value.split(",").filter(Boolean);
    return list.length > 0 ? list : undefined;
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return isFinite(parsed) ? parsed : undefined;
}

/** Validates the filter/sort search params so they can live in the URL. */
export function parseProductSearch(search: Record<string, unknown>): ProductFilters {
  const availability = String(search["availability"] ?? "");
  const sort = String(search["sort"] ?? "");
  return {
    q: typeof search["q"] === "string" && search["q"].trim() ? String(search["q"]) : undefined,
    category: toStringArray(search["category"]),
    brand: toStringArray(search["brand"]),
    collection: toStringArray(search["collection"]),
    min: toNumber(search["min"]),
    max: toNumber(search["max"]),
    availability: ["in-stock", "on-sale"].includes(availability)
      ? (availability as "in-stock" | "on-sale")
      : undefined,
    sort: SORT_VALUES.includes(sort) ? (sort as SortValue) : undefined,
  };
}

function matchesText(product: ShopifyProduct, term: string) {
  const node = product.node;
  const text = [node.title, node.vendor ?? "", node.productType ?? "", (node.tags ?? []).join(" ")]
    .join(" ")
    .toLowerCase();
  return term
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}

/** Applies the active facets and sort order to a product list. */
export function applyFilters(
  products: ShopifyProduct[],
  index: CatalogIndex,
  filters: ProductFilters,
): ShopifyProduct[] {
  let result = products;

  if (filters.q) result = result.filter((product) => matchesText(product, filters.q as string));

  if (filters.category?.length) {
    result = result.filter((product) => {
      const slugs = index.categoryOf.get(product.node.handle) ?? [];
      return filters.category!.some((slug) => slugs.includes(slug));
    });
  }

  if (filters.brand?.length) {
    result = result.filter((product) => {
      const brand = index.brandOf.get(product.node.handle);
      return brand ? filters.brand!.includes(brand.slug) : false;
    });
  }

  if (filters.collection?.length) {
    result = result.filter((product) => {
      const handles = (product.node.collections?.edges ?? []).map((edge) => edge.node.handle);
      return filters.collection!.some((handle) => handles.includes(handle));
    });
  }

  if (filters.min !== undefined) result = result.filter((product) => productPrice(product) >= filters.min!);
  if (filters.max !== undefined) result = result.filter((product) => productPrice(product) <= filters.max!);

  if (filters.availability === "in-stock") result = result.filter(productInStock);
  if (filters.availability === "on-sale") {
    result = result.filter((product) => {
      const compareAt = productCompareAt(product);
      return compareAt ? parseFloat(compareAt) > productPrice(product) : false;
    });
  }

  const sorted = [...result];
  switch (filters.sort) {
    case "price-asc":
      sorted.sort((a, b) => productPrice(a) - productPrice(b));
      break;
    case "price-desc":
      sorted.sort((a, b) => productPrice(b) - productPrice(a));
      break;
    case "title-asc":
      sorted.sort((a, b) => a.node.title.localeCompare(b.node.title));
      break;
    case "newest":
      sorted.sort(
        (a, b) =>
          new Date(b.node.createdAt ?? 0).getTime() - new Date(a.node.createdAt ?? 0).getTime(),
      );
      break;
    case "discount":
      sorted.sort((a, b) => savingRatio(b) - savingRatio(a));
      break;
    default:
      break;
  }

  return sorted;
}

function savingRatio(product: ShopifyProduct) {
  const price = productPrice(product);
  const compareAt = productCompareAt(product);
  const was = compareAt ? parseFloat(compareAt) : NaN;
  if (!isFinite(was) || was <= price || was <= 0) return 0;
  return (was - price) / was;
}

export function activeFilterCount(filters: ProductFilters) {
  return (
    (filters.category?.length ?? 0) +
    (filters.brand?.length ?? 0) +
    (filters.collection?.length ?? 0) +
    (filters.min !== undefined ? 1 : 0) +
    (filters.max !== undefined ? 1 : 0) +
    (filters.availability ? 1 : 0)
  );
}
