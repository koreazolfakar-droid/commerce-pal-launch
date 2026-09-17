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
  descriptionHtml: string;
  tags: string[];
  updatedAt: string;
  totalInventory: number | null;
  variants: { nodes: AdminVariant[] };
  minPrice: number | null;
  maxPrice: number | null;
  variantsCount: number;
};

export type ProductWriteInput = {
  id?: string;
  variantId?: string;
  title: string;
  vendor: string;
  productType: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  descriptionHtml: string;
  tags: string[];
  price?: number | null;
  sku: string;
  barcode: string;
};

export type InventoryLocation = {
  id: string;
  name: string;
  isActive: boolean;
};

export type InventoryReceipt = {
  product: string;
  variant: string;
  quantity: number;
  locationId: string;
  reference: string | null;
  createdAt: string;
  referenceDocumentUri: string | null;
};

export type AdminOrderStatus = "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";

export type AdminOrder = {
  id: string;
  name: string;
  customer: string;
  phone: string;
  total: number;
  currencyCode: string;
  payment: string;
  status: AdminOrderStatus;
  financialStatus: string | null;
  fulfillmentStatus: string;
  createdAt: string;
  items: number;
};

export type AdminCustomer = {
  id: string;
  name: string;
  phone: string;
  orders: number;
  totalSpent: number;
  currencyCode: string;
  segment: "VIP" | "RETURNING" | "NEW";
  lastOrder: string;
  updatedAt: string;
};

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export type ProductsResponse = { ok: true; products: AdminProduct[]; pageInfo: PageInfo };
export type ProductMutationResponse = { ok: true; product: AdminProduct };
export type InventoryLocationsResponse = { ok: true; locations: InventoryLocation[] };
export type InventoryReceiveResponse = { ok: true; receipt: InventoryReceipt };
export type OrdersResponse = { ok: true; orders: AdminOrder[]; pageInfo: PageInfo };
export type CustomersResponse = { ok: true; customers: AdminCustomer[]; pageInfo: PageInfo };

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

function paginationParams(first: number, after?: string | null) {
  const params = new URLSearchParams({ first: String(first) });
  if (after) params.set("after", after);
  return params.toString();
}

export function checkHealth() {
  return request<HealthResponse>("/api/admin/health");
}

export function fetchProducts(first = 50, after?: string | null) {
  return request<ProductsResponse>(`/api/admin/products?${paginationParams(first, after)}`);
}

export function createProduct(input: ProductWriteInput) {
  return request<ProductMutationResponse>("/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateProduct(input: ProductWriteInput & { id: string }) {
  return request<ProductMutationResponse>("/api/admin/products", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchInventoryLocations() {
  return request<InventoryLocationsResponse>("/api/admin/inventory");
}

export function receiveInventory(input: {
  variantId: string;
  locationId: string;
  quantity: number;
  reference?: string;
}) {
  return request<InventoryReceiveResponse>("/api/admin/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchOrders(first = 50, after?: string | null) {
  return request<OrdersResponse>(`/api/admin/orders?${paginationParams(first, after)}`);
}

export function fetchCustomers(first = 50, after?: string | null) {
  return request<CustomersResponse>(`/api/admin/customers?${paginationParams(first, after)}`);
}

export { API_BASE };