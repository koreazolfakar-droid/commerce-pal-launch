const API_BASE = (import.meta.env.VITE_SPACE_CALL_API_URL || "https://spacecallapp.store").replace(/\/+$/, "");
const SESSION_KEY = "spacecall_admin_api_key";
export const PREVIEW_MODE = import.meta.env.VITE_PREVIEW_MODE === "true";

export type HealthResponse = {
  ok: true;
  service: string;
  timestamp: string;
  config: {
    dashboardOriginConfigured: boolean;
    apiKeyConfigured: boolean;
    shopifyAdminConfigured: boolean;
    shopifyDomain: string;
    storeName: string;
  };
};

export type AdminVariant = {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: string;
  inventoryQuantity: number | null;
};

export type AdminProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  productType: string;
  updatedAt: string;
  totalInventory: number | null;
  variants: { nodes: AdminVariant[] };
  minPrice: number | null;
  maxPrice: number | null;
  variantsCount: number;
};

export type ProductsResponse = {
  ok: true;
  products: AdminProduct[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

const PREVIEW_PRODUCTS: AdminProduct[] = [
  {
    id: "preview-iphone-17-pro",
    title: "iPhone 17 Pro",
    handle: "iphone-17-pro",
    status: "ACTIVE",
    vendor: "Apple",
    productType: "Smartphones",
    updatedAt: new Date().toISOString(),
    totalInventory: 18,
    variants: { nodes: [{ id: "v1", title: "256GB", sku: "SC-IP17P-256", barcode: null, price: "1299.00", inventoryQuantity: 11 }, { id: "v2", title: "512GB", sku: "SC-IP17P-512", barcode: null, price: "1499.00", inventoryQuantity: 7 }] },
    minPrice: 1299,
    maxPrice: 1499,
    variantsCount: 2,
  },
  {
    id: "preview-galaxy-s26-ultra",
    title: "Samsung Galaxy S26 Ultra",
    handle: "galaxy-s26-ultra",
    status: "ACTIVE",
    vendor: "Samsung",
    productType: "Smartphones",
    updatedAt: new Date().toISOString(),
    totalInventory: 9,
    variants: { nodes: [{ id: "v3", title: "256GB", sku: "SC-S26U-256", barcode: null, price: "1199.00", inventoryQuantity: 9 }] },
    minPrice: 1199,
    maxPrice: 1199,
    variantsCount: 1,
  },
  {
    id: "preview-xiaomi-16-ultra",
    title: "Xiaomi 16 Ultra",
    handle: "xiaomi-16-ultra",
    status: "ACTIVE",
    vendor: "Xiaomi",
    productType: "Smartphones",
    updatedAt: new Date().toISOString(),
    totalInventory: 4,
    variants: { nodes: [{ id: "v4", title: "512GB", sku: "SC-X16U-512", barcode: null, price: "949.00", inventoryQuantity: 4 }] },
    minPrice: 949,
    maxPrice: 949,
    variantsCount: 1,
  },
  {
    id: "preview-poco-f8-pro",
    title: "POCO F8 Pro",
    handle: "poco-f8-pro",
    status: "ACTIVE",
    vendor: "POCO",
    productType: "Smartphones",
    updatedAt: new Date().toISOString(),
    totalInventory: 25,
    variants: { nodes: [{ id: "v5", title: "256GB", sku: "SC-F8P-256", barcode: null, price: "579.00", inventoryQuantity: 25 }] },
    minPrice: 579,
    maxPrice: 579,
    variantsCount: 1,
  },
  {
    id: "preview-ipad-pro",
    title: "iPad Pro 13-inch",
    handle: "ipad-pro-13",
    status: "ACTIVE",
    vendor: "Apple",
    productType: "Tablets",
    updatedAt: new Date().toISOString(),
    totalInventory: 6,
    variants: { nodes: [{ id: "v6", title: "256GB Wi-Fi", sku: "SC-IPADP13", barcode: null, price: "1099.00", inventoryQuantity: 6 }] },
    minPrice: 1099,
    maxPrice: 1099,
    variantsCount: 1,
  },
  {
    id: "preview-watch-ultra",
    title: "Apple Watch Ultra 3",
    handle: "apple-watch-ultra-3",
    status: "ACTIVE",
    vendor: "Apple",
    productType: "Smartwatches",
    updatedAt: new Date().toISOString(),
    totalInventory: 3,
    variants: { nodes: [{ id: "v7", title: "49mm", sku: "SC-AWU3", barcode: null, price: "799.00", inventoryQuantity: 3 }] },
    minPrice: 799,
    maxPrice: 799,
    variantsCount: 1,
  },
  {
    id: "preview-airpods-pro",
    title: "AirPods Pro",
    handle: "airpods-pro",
    status: "ACTIVE",
    vendor: "Apple",
    productType: "Audio",
    updatedAt: new Date().toISOString(),
    totalInventory: 31,
    variants: { nodes: [{ id: "v8", title: "USB-C", sku: "SC-APP-USBC", barcode: null, price: "249.00", inventoryQuantity: 31 }] },
    minPrice: 249,
    maxPrice: 249,
    variantsCount: 1,
  },
  {
    id: "preview-ps5-pro",
    title: "PlayStation 5 Pro",
    handle: "playstation-5-pro",
    status: "DRAFT",
    vendor: "Sony",
    productType: "Gaming",
    updatedAt: new Date().toISOString(),
    totalInventory: 0,
    variants: { nodes: [{ id: "v9", title: "2TB", sku: "SC-PS5PRO", barcode: null, price: "699.00", inventoryQuantity: 0 }] },
    minPrice: 699,
    maxPrice: 699,
    variantsCount: 1,
  },
];

const PREVIEW_HEALTH: HealthResponse = {
  ok: true,
  service: "spacecall-admin-preview",
  timestamp: new Date().toISOString(),
  config: {
    dashboardOriginConfigured: true,
    apiKeyConfigured: true,
    shopifyAdminConfigured: true,
    shopifyDomain: "preview.myshopify.com",
    storeName: "Space Call Preview",
  },
};

export function getStoredApiKey() {
  if (PREVIEW_MODE) return sessionStorage.getItem(SESSION_KEY) || "spacecall-preview";
  return sessionStorage.getItem(SESSION_KEY) || "";
}

export function storeApiKey(value: string) {
  sessionStorage.setItem(SESSION_KEY, value.trim());
}

export function clearApiKey() {
  sessionStorage.removeItem(SESSION_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const key = getStoredApiKey();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${key}`,
      ...(init?.headers || {}),
    },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `API request failed (${response.status})`;
    throw new AdminApiError(message, response.status);
  }

  return payload as T;
}

export function checkHealth() {
  if (PREVIEW_MODE) return Promise.resolve(PREVIEW_HEALTH);
  return request<HealthResponse>("/api/admin/health");
}

export function fetchProducts(first = 50, after?: string | null) {
  if (PREVIEW_MODE) {
    return Promise.resolve<ProductsResponse>({
      ok: true,
      products: PREVIEW_PRODUCTS.slice(0, Math.max(1, Math.min(first, PREVIEW_PRODUCTS.length))),
      pageInfo: { hasNextPage: false, endCursor: null },
    });
  }

  const params = new URLSearchParams({ first: String(first) });
  if (after) params.set("after", after);
  return request<ProductsResponse>(`/api/admin/products?${params.toString()}`);
}

export { API_BASE };
