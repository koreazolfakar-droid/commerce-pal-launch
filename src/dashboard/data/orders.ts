import { rpcArgs } from "@/dashboard/lib/rpcArgs";
import { supabase } from "@/integrations/supabase/client";
import { looseSupabase } from "@/integrations/supabase/looseClient";
import type { Tables } from "@/integrations/supabase/types";
import { getDashboardRole } from "@/dashboard/data/catalog";

type OrderRow = Tables<"store_orders"> & {
  public_order_number: string;
  delivery_type: string | null;
  delivery_location: string | null;
  version: number;
  completed_at: string | null;
};
type OrderItemRow = Tables<"store_order_items">;
type ProductImageRow = Tables<"store_product_images">;

export type DashboardOrderStatus =
  | "new"
  | "confirmed"
  | "processing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "done"
  | "cancelled";

export type DashboardDeliveryType = "pending" | "paid" | "free";

export type DashboardPaymentStatus =
  | "unpaid"
  | "paid"
  | "refunded"
  | "partially_refunded";

export type DashboardOrdersSort =
  | "newest"
  | "oldest"
  | "total_high"
  | "total_low";

export type DashboardOrderListItem = {
  id: string;
  orderNumber: number;
  publicOrderNumber: string;
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
  publicOrderNumber: string;
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
  deliveryType: DashboardDeliveryType;
  deliveryLocation: unknown;
  version: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: DashboardOrderItem[];
};

export type DashboardOrderStats = {
  all: number;
  new: number;
  confirmed: number;
  processing: number;
  ready: number;
  outForDelivery: number;
  delivered: number;
  done: number;
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
  let role = await getDashboardRole();
  if (role) return role;

  // Mobile browsers can suspend a dashboard tab long enough for its access
  // token to expire. Refresh the existing tab-scoped session once before
  // failing closed. Database RLS/RPC staff + MFA checks remain authoritative.
  try {
    const {
      data: { session },
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (!refreshError && session) {
      role = await getDashboardRole();
      if (role) return role;
    }
  } catch {
    // Invalid/blocked refresh tokens are authentication failures, not order errors.
  }

  throw new Error("Dashboard authentication is required.");
}

function statusFromRow(value: string): DashboardOrderStatus {
  if (
    value === "new" ||
    value === "confirmed" ||
    value === "processing" ||
    value === "ready" ||
    value === "out_for_delivery" ||
    value === "delivered" ||
    value === "done" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "new";
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
  const [all, fresh, confirmed, processing, ready, outForDelivery, delivered, done, cancelled] =
    await Promise.all([
      countOrders(),
      countOrders("new"),
      countOrders("confirmed"),
      countOrders("processing"),
      countOrders("ready"),
      countOrders("out_for_delivery"),
      countOrders("delivered"),
      countOrders("done"),
      countOrders("cancelled"),
    ]);
  return { all, new: fresh, confirmed, processing, ready, outForDelivery, delivered, done, cancelled };
}

export async function listDashboardOrders(input?: {
  search?: string;
  status?: "all" | DashboardOrderStatus;
  paymentStatus?: "all" | DashboardPaymentStatus;
  sort?: DashboardOrdersSort;
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
  const paymentStatus = input?.paymentStatus ?? "all";
  const sort = input?.sort ?? "newest";

  let query = supabase
    .from("store_orders")
    .select(
      "id,order_number,public_order_number,status,payment_status,payment_method,customer_name,customer_phone,customer_email,total,currency,created_at",
      { count: "exact" },
    );

  if (status !== "all") query = query.eq("status", status);
  if (paymentStatus !== "all") query = query.eq("payment_status", paymentStatus);

  if (search) {
    if (/^\d+$/.test(search)) {
      query = query.eq("order_number", Number(search));
    } else if (/^\d{5}-\d{5}$/.test(search)) {
      query = query.eq("public_order_number", search);
    } else {
      const safe = search.replace(/[%_,()]/g, " ").trim();
      if (safe) {
        query = query.or(
          `public_order_number.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%,customer_email.ilike.%${safe}%`,
        );
      }
    }
  }

  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "total_high") {
    query = query
      .order("total", { ascending: false })
      .order("created_at", { ascending: false });
  } else if (sort === "total_low") {
    query = query
      .order("total", { ascending: true })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(start, end);

  const [orderResult, stats] = await Promise.all([query, loadOrderStats()]);
  throwIfError(orderResult.error, "Loading orders failed");

  const rows = (orderResult.data ?? []) as Pick<
    OrderRow,
    | "id"
    | "order_number"
    | "public_order_number"
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
        publicOrderNumber: row.public_order_number,
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
    publicOrderNumber: order.public_order_number,
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
    deliveryType:
      order.delivery_type === "paid" || order.delivery_type === "free" ? order.delivery_type : "pending",
    deliveryLocation: order.delivery_location,
    version: order.version,
    completedAt: order.completed_at,
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
  expectedVersion: number,
): Promise<DashboardOrderDetail | null> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("update_store_order_status", rpcArgs({
    p_order_id: id,
    p_status: status,
    p_expected_version: expectedVersion,
  }));
  throwIfError(error, "Updating order status failed");
  return getDashboardOrder(id);
}

export async function updateDashboardOrderPaymentStatus(
  id: string,
  paymentStatus: DashboardPaymentStatus,
  expectedVersion: number,
): Promise<DashboardOrderDetail | null> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("update_store_order_payment_status", rpcArgs({
    p_order_id: id,
    p_payment_status: paymentStatus,
    p_expected_version: expectedVersion,
  }));
  throwIfError(error, "Updating order payment status failed");
  return getDashboardOrder(id);
}

export async function updateDashboardOrderDelivery(
  id: string,
  deliveryType: Exclude<DashboardDeliveryType, "pending">,
  shippingTotal: number,
  expectedVersion: number,
): Promise<DashboardOrderDetail | null> {
  await requireDashboardStaff();
  const { error } = await looseSupabase.rpc("update_store_order_delivery", rpcArgs({
    p_order_id: id,
    p_delivery_type: deliveryType,
    p_shipping_total: deliveryType === "free" ? 0 : shippingTotal,
    p_expected_version: expectedVersion,
  }));
  throwIfError(error, "Updating order delivery failed");
  return getDashboardOrder(id);
}

export function nextOrderStatus(status: DashboardOrderStatus): DashboardOrderStatus | null {
  if (status === "new") return "confirmed";
  if (status === "confirmed") return "processing";
  if (status === "processing") return "ready";
  if (status === "ready") return "out_for_delivery";
  if (status === "out_for_delivery") return "delivered";
  if (status === "delivered") return "done";
  return null;
}

export function orderStatusLabel(status: DashboardOrderStatus) {
  if (status === "out_for_delivery") return "Out for delivery";
  if (status === "done") return "Done";
  if (status === "new") return "New";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function paymentStatusLabel(status: DashboardPaymentStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
