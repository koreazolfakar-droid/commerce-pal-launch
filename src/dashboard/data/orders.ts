import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getDashboardRole } from "@/dashboard/data/catalog";

type OrderRow = Tables<"store_orders">;
type OrderItemRow = Tables<"store_order_items">;
type ProductImageRow = Tables<"store_product_images">;

export type DashboardOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type DashboardPaymentStatus =
  | "unpaid"
  | "paid"
  | "refunded"
  | "partially_refunded";

export type DashboardOrderListItem = {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  itemSummary: string;
  itemCount: number;
  total: number;
  currency: string;
  paymentStatus: DashboardPaymentStatus;
  paymentMethod: string;
  status: DashboardOrderStatus;
  createdAt: string;
};

export type DashboardOrderItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options: unknown;
  imageUrl: string;
};

export type DashboardOrderDetail = {
  id: string;
  orderNumber: number;
  status: DashboardOrderStatus;
  paymentStatus: DashboardPaymentStatus;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string | null;
  city: string | null;
  notes: string | null;
  customerReference: string | null;
  currency: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
  source: string;
  createdAt: string;
  updatedAt: string;
  items: DashboardOrderItem[];
};

export type DashboardOrderStats = {
  all: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

export type DashboardOrdersResult = {
  orders: DashboardOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  stats: DashboardOrderStats;
};

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff() {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function statusFromRow(value: string): DashboardOrderStatus {
  if (
    value === "pending" ||
    value === "confirmed" ||
    value === "processing" ||
    value === "shipped" ||
    value === "delivered" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "pending";
}

function paymentFromRow(value: string): DashboardPaymentStatus {
  if (
    value === "unpaid" ||
    value === "paid" ||
    value === "refunded" ||
    value === "partially_refunded"
  ) {
    return value;
  }
  return "unpaid";
}

async function countOrders(status?: DashboardOrderStatus) {
  let query = supabase.from("store_orders").select("id", { count: "exact", head: true });
  if (status) query = query.eq("status", status);
  const { count, error } = await query;
  throwIfError(error, `Counting ${status ?? "all"} orders failed`);
  return count ?? 0;
}

async function loadOrderStats(): Promise<DashboardOrderStats> {
  const [all, pending, confirmed, processing, shipped, delivered, cancelled] = await Promise.all([
    countOrders(),
    countOrders("pending"),
    countOrders("confirmed"),
    countOrders("processing"),
    countOrders("shipped"),
    countOrders("delivered"),
    countOrders("cancelled"),
  ]);
  return { all, pending, confirmed, processing, shipped, delivered, cancelled };
}

export async function listDashboardOrders(input?: {
  search?: string;
  status?: "all" | DashboardOrderStatus;
  page?: number;
  pageSize?: number;
}): Promise<DashboardOrdersResult> {
  await requireDashboardStaff();

  const page = Math.max(1, Math.trunc(input?.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(input?.pageSize ?? 10)));
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const search = input?.search?.trim() ?? "";
  const status = input?.status ?? "all";

  let query = supabase
    .from("store_orders")
    .select(
      "id,order_number,status,payment_status,payment_method,customer_name,customer_phone,customer_email,total,currency,created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(start, end);

  if (status !== "all") query = query.eq("status", status);

  if (search) {
    if (/^\d+$/.test(search)) {
      query = query.eq("order_number", Number(search));
    } else {
      const safe = search.replace(/[%_,()]/g, " ").trim();
      if (safe) {
        query = query.or(
          `customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%,customer_email.ilike.%${safe}%`,
        );
      }
    }
  }

  const [orderResult, stats] = await Promise.all([query, loadOrderStats()]);
  throwIfError(orderResult.error, "Loading orders failed");

  const rows = (orderResult.data ?? []) as Pick<
    OrderRow,
    | "id"
    | "order_number"
    | "status"
    | "payment_status"
    | "payment_method"
    | "customer_name"
    | "customer_phone"
    | "customer_email"
    | "total"
    | "currency"
    | "created_at"
  >[];

  const orderIds = rows.map((row) => row.id);
  let items: Pick<OrderItemRow, "order_id" | "title" | "quantity">[] = [];
  if (orderIds.length) {
    const itemResult = await supabase
      .from("store_order_items")
      .select("order_id,title,quantity")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });
    throwIfError(itemResult.error, "Loading order item summaries failed");
    items = itemResult.data ?? [];
  }

  const itemsByOrder = new Map<string, Pick<OrderItemRow, "order_id" | "title" | "quantity">[]>();
  for (const item of items) {
    const current = itemsByOrder.get(item.order_id) ?? [];
    current.push(item);
    itemsByOrder.set(item.order_id, current);
  }

  return {
    total: orderResult.count ?? 0,
    page,
    pageSize,
    stats,
    orders: rows.map((row) => {
      const orderItems = itemsByOrder.get(row.id) ?? [];
      const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const preview = orderItems
        .slice(0, 2)
        .map((item) => (item.quantity > 1 ? `${item.title} ×${item.quantity}` : item.title))
        .join(", ");
      return {
        id: row.id,
        orderNumber: row.order_number,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        customerEmail: row.customer_email,
        itemSummary:
          preview + (orderItems.length > 2 ? ` +${orderItems.length - 2} more` : ""),
        itemCount,
        total: Number(row.total) || 0,
        currency: row.currency,
        paymentStatus: paymentFromRow(row.payment_status),
        paymentMethod: row.payment_method,
        status: statusFromRow(row.status),
        createdAt: row.created_at,
      };
    }),
  };
}

export async function getDashboardOrder(id: string): Promise<DashboardOrderDetail | null> {
  await requireDashboardStaff();

  const [orderResult, itemResult] = await Promise.all([
    supabase.from("store_orders").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("store_order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  throwIfError(orderResult.error, "Loading order failed");
  throwIfError(itemResult.error, "Loading order items failed");
  if (!orderResult.data) return null;

  const order = orderResult.data as OrderRow;
  const items = (itemResult.data ?? []) as OrderItemRow[];

  const productIds = [...new Set(items.map((item) => item.product_id).filter(Boolean))] as string[];
  const imageByProduct = new Map<string, string>();

  if (productIds.length) {
    const imageResult = await supabase
      .from("store_product_images")
      .select("*")
      .in("product_id", productIds)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });
    throwIfError(imageResult.error, "Loading order product images failed");

    for (const image of (imageResult.data ?? []) as ProductImageRow[]) {
      if (!imageByProduct.has(image.product_id)) imageByProduct.set(image.product_id, image.url);
    }
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: statusFromRow(order.status),
    paymentStatus: paymentFromRow(order.payment_status),
    paymentMethod: order.payment_method,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email,
    deliveryAddress: order.delivery_address,
    city: order.city,
    notes: order.notes,
    customerReference: order.customer_reference,
    currency: order.currency,
    subtotal: Number(order.subtotal) || 0,
    shippingTotal: Number(order.shipping_total) || 0,
    discountTotal: Number(order.discount_total) || 0,
    total: Number(order.total) || 0,
    source: order.source,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      variantId: item.variant_id,
      title: item.title,
      variantTitle: item.variant_title,
      sku: item.sku,
      unitPrice: Number(item.unit_price) || 0,
      quantity: item.quantity,
      lineTotal: Number(item.line_total) || 0,
      options: item.options,
      imageUrl: item.product_id ? imageByProduct.get(item.product_id) ?? "" : "",
    })),
  };
}

export async function updateDashboardOrderStatus(
  id: string,
  status: DashboardOrderStatus,
): Promise<DashboardOrderDetail | null> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("update_store_order_status", {
    p_order_id: id,
    p_status: status,
  });
  throwIfError(error, "Updating order status failed");
  return getDashboardOrder(id);
}

export async function updateDashboardOrderPaymentStatus(
  id: string,
  paymentStatus: DashboardPaymentStatus,
): Promise<DashboardOrderDetail | null> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("update_store_order_payment_status", {
    p_order_id: id,
    p_payment_status: paymentStatus,
  });
  throwIfError(error, "Updating order payment status failed");
  return getDashboardOrder(id);
}

export function nextOrderStatus(status: DashboardOrderStatus): DashboardOrderStatus | null {
  if (status === "pending") return "confirmed";
  if (status === "confirmed") return "processing";
  if (status === "processing") return "shipped";
  if (status === "shipped") return "delivered";
  return null;
}

export function orderStatusLabel(status: DashboardOrderStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function paymentStatusLabel(status: DashboardPaymentStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
