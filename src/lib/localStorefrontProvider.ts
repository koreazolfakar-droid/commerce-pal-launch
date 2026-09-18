import type { StoreCollection, StoreProduct } from "@/lib/storefrontTypes";

const image = (url: string, altText: string) => ({ edges: [{ node: { url, altText } }] });

function makeProduct(input: {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  type: string;
  price: number;
  compareAt?: number;
  sku: string;
  imageUrl: string;
  collections: string[];
  createdAt: string;
  tags?: string[];
}): StoreProduct {
  const money = { amount: input.price.toFixed(2), currencyCode: "USD" };
  const compareAt = input.compareAt
    ? { amount: input.compareAt.toFixed(2), currencyCode: "USD" }
    : null;
  const collectionEdges = input.collections.map((handle) => ({
    node: { handle, title: handle.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) },
  }));

  return {
    node: {
      id: input.id,
      title: input.title,
      description: `${input.title} test product for the standalone Space Call staging storefront.`,
      descriptionHtml: `<p>${input.title} test product for the standalone Space Call staging storefront.</p>`,
      handle: input.handle,
      vendor: input.vendor,
      productType: input.type,
      availableForSale: true,
      createdAt: input.createdAt,
      tags: input.tags ?? [],
      priceRange: { minVariantPrice: money },
      ...(input.compareAt && compareAt
        ? { compareAtPriceRange: { minVariantPrice: compareAt } }
        : {}),
      images: image(input.imageUrl, input.title),
      collections: { edges: collectionEdges },
      variants: {
        edges: [
          {
            node: {
              id: `${input.id}-variant-default`,
              title: "Default",
              price: money,
              compareAtPrice: compareAt,
              availableForSale: true,
              sku: input.sku,
              barcode: null,
              weight: null,
              weightUnit: null,
              image: { url: input.imageUrl, altText: input.title },
              selectedOptions: [{ name: "Color", value: "Default" }],
            },
          },
        ],
      },
      options: [{ name: "Color", values: ["Default"] }],
    },
  };
}

const LOCAL_PRODUCTS: StoreProduct[] = [
  makeProduct({ id: "local-iphone-18-pro", title: "iPhone 18 Pro", handle: "iphone-18-pro", vendor: "Apple", type: "Smartphones", price: 1299, compareAt: 1399, sku: "APL-IP18P-256", imageUrl: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=85", collections: ["homepage-hero", "iphone", "featured", "new-arrivals"], createdAt: "2026-09-01T10:00:00Z", tags: ["phone", "apple", "featured"] }),
  makeProduct({ id: "local-iphone-18", title: "iPhone 18", handle: "iphone-18", vendor: "Apple", type: "Smartphones", price: 999, sku: "APL-IP18-128", imageUrl: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=900&q=85", collections: ["iphone", "new-arrivals"], createdAt: "2026-08-28T10:00:00Z", tags: ["phone", "apple"] }),
  makeProduct({ id: "local-galaxy-s26-ultra", title: "Galaxy S26 Ultra", handle: "galaxy-s26-ultra", vendor: "Samsung", type: "Smartphones", price: 1199, compareAt: 1249, sku: "SAM-S26U-256", imageUrl: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85", collections: ["samsung", "featured"], createdAt: "2026-08-20T10:00:00Z", tags: ["phone", "samsung", "featured"] }),
  makeProduct({ id: "local-xiaomi-16-pro", title: "Xiaomi 16 Pro", handle: "xiaomi-16-pro", vendor: "Xiaomi", type: "Smartphones", price: 799, sku: "XIA-16P-256", imageUrl: "https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=900&q=85", collections: ["xiaomi", "featured"], createdAt: "2026-08-12T10:00:00Z", tags: ["phone", "xiaomi"] }),
  makeProduct({ id: "local-airpods-pro", title: "AirPods Pro", handle: "airpods-pro", vendor: "Apple", type: "Headphones", price: 249, sku: "APL-APP-001", imageUrl: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=900&q=85", collections: ["audio", "accessories"], createdAt: "2026-07-20T10:00:00Z", tags: ["audio", "apple"] }),
  makeProduct({ id: "local-watch-ultra", title: "Apple Watch Ultra", handle: "apple-watch-ultra", vendor: "Apple", type: "Smartwatches", price: 799, sku: "APL-WU-001", imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=85", collections: ["wearables", "featured"], createdAt: "2026-07-10T10:00:00Z", tags: ["watch", "apple"] }),
];

const LOCAL_COLLECTIONS: StoreCollection[] = [
  { id: "col-homepage-hero", handle: "homepage-hero", title: "Homepage Hero", description: "Local staging hero collection", image: LOCAL_PRODUCTS[0]!.node.images.edges[0]!.node },
  { id: "col-iphone", handle: "iphone", title: "iPhone", description: "Apple iPhone lineup", image: LOCAL_PRODUCTS[0]!.node.images.edges[0]!.node },
  { id: "col-samsung", handle: "samsung", title: "Samsung", description: "Samsung Galaxy devices", image: LOCAL_PRODUCTS[2]!.node.images.edges[0]!.node },
  { id: "col-xiaomi", handle: "xiaomi", title: "Xiaomi", description: "Xiaomi devices", image: LOCAL_PRODUCTS[3]!.node.images.edges[0]!.node },
  { id: "col-featured", handle: "featured", title: "Featured", description: "Featured devices", image: LOCAL_PRODUCTS[0]!.node.images.edges[0]!.node },
  { id: "col-new", handle: "new-arrivals", title: "New Arrivals", description: "Latest devices", image: LOCAL_PRODUCTS[1]!.node.images.edges[0]!.node },
  { id: "col-showcase-iphone", handle: "showcase-iphone", title: "iPhone Showcase", description: "iPhone campaign section", image: LOCAL_PRODUCTS[0]!.node.images.edges[0]!.node },
];

const byHandle = (handle: string) => LOCAL_PRODUCTS.find((product) => product.node.handle === handle);
const collectionProducts = (handle: string) =>
  LOCAL_PRODUCTS.filter((product) => product.node.collections?.edges.some((edge) => edge.node.handle === handle));

function parseProductQuery(query?: string) {
  if (!query?.trim()) return LOCAL_PRODUCTS;
  const value = query.trim();
  const vendor = /^vendor:"?(.+?)"?$/.exec(value)?.[1]?.replace(/"/g, "").trim();
  if (vendor) return LOCAL_PRODUCTS.filter((product) => product.node.vendor?.toLowerCase() === vendor.toLowerCase());
  const handles = [...value.matchAll(/handle:"?([^"\s]+)"?/g)].map((match) => match[1]);
  if (handles.length) return LOCAL_PRODUCTS.filter((product) => handles.includes(product.node.handle));
  const lowered = value.toLowerCase();
  return LOCAL_PRODUCTS.filter((product) =>
    `${product.node.title} ${product.node.vendor ?? ""} ${product.node.productType ?? ""} ${(product.node.tags ?? []).join(" ")}`
      .toLowerCase()
      .includes(lowered),
  );
}

export async function fetchProducts(
  first = 30,
  query?: string,
  sortKey?: "BEST_SELLING" | "CREATED_AT" | "PRICE" | "TITLE",
  reverse?: boolean,
): Promise<StoreProduct[]> {
  let rows = [...parseProductQuery(query)];
  if (sortKey === "CREATED_AT") rows.sort((a, b) => (a.node.createdAt ?? "").localeCompare(b.node.createdAt ?? ""));
  if (sortKey === "PRICE") rows.sort((a, b) => Number(a.node.priceRange.minVariantPrice.amount) - Number(b.node.priceRange.minVariantPrice.amount));
  if (sortKey === "TITLE") rows.sort((a, b) => a.node.title.localeCompare(b.node.title));
  if (reverse) rows.reverse();
  return rows.slice(0, Math.max(0, first));
}

export async function fetchBestSellingProducts(first = 12) {
  return LOCAL_PRODUCTS.slice(0, first);
}

export async function fetchCatalogProducts(first = 60) {
  return LOCAL_PRODUCTS.slice(0, Math.min(Math.max(first, 1), 100));
}

export async function fetchBrandVendors() {
  return [...new Set(LOCAL_PRODUCTS.map((product) => product.node.vendor).filter(Boolean) as string[])];
}

export async function fetchProductByHandle(handle: string): Promise<StoreProduct | null> {
  return byHandle(handle) ?? null;
}

export async function fetchProductRecommendations(handle: string): Promise<StoreProduct[]> {
  const current = byHandle(handle);
  if (!current) return [];
  return LOCAL_PRODUCTS.filter((product) => product.node.id !== current.node.id).slice(0, 4);
}

export async function fetchCollections(first = 50): Promise<StoreCollection[]> {
  return LOCAL_COLLECTIONS.slice(0, Math.min(Math.max(first, 1), 100));
}

export async function fetchCollectionByHandle(
  handle: string,
  pageSize = 48,
): Promise<{ collection: StoreCollection; products: StoreProduct[] } | null> {
  const collection = LOCAL_COLLECTIONS.find((item) => item.handle === handle);
  if (!collection) return null;
  return { collection, products: collectionProducts(handle).slice(0, pageSize) };
}

export async function searchStorefront(term: string) {
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) return { products: [] as StoreProduct[], collections: [] as StoreCollection[] };
  return {
    products: LOCAL_PRODUCTS.filter((product) => `${product.node.title} ${product.node.vendor ?? ""}`.toLowerCase().includes(trimmed)),
    collections: LOCAL_COLLECTIONS.filter((collection) => `${collection.title} ${collection.description}`.toLowerCase().includes(trimmed)),
  };
}

export function fetchProductsByVendor(vendor: string, first = 8) {
  return Promise.resolve(
    LOCAL_PRODUCTS.filter((product) => product.node.vendor?.toLowerCase() === vendor.trim().toLowerCase()).slice(0, first),
  );
}

export async function fetchAllProductsByVendor(vendor: string) {
  return LOCAL_PRODUCTS.filter((product) => product.node.vendor?.toLowerCase() === vendor.trim().toLowerCase());
}

export function fetchProductsByHandles(handles: string[], first = 20) {
  const wanted = new Set(handles.map((handle) => handle.trim()).filter(Boolean));
  return Promise.resolve(LOCAL_PRODUCTS.filter((product) => wanted.has(product.node.handle)).slice(0, first));
}

