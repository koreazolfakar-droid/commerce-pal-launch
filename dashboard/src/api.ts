const API_BASE = (import.meta.env.VITE_SPACE_CALL_API_URL || "https://spacecallapp.store").replace(/\/+$/, "");
const SESSION_KEY = "spacecall_admin_api_key";

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

export function getStoredApiKey() {
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
  return request<HealthResponse>("/api/admin/health");
}

export function fetchProducts(first = 50, after?: string | null) {
  const params = new URLSearchParams({ first: String(first) });
  if (after) params.set("after", after);
  return request<ProductsResponse>(`/api/admin/products?${params.toString()}`);
}

export { API_BASE };
