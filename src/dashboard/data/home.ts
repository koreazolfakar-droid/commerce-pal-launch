import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getDashboardRole } from "@/dashboard/data/catalog";

type OrderRow = Pick<
  Tables<"store_orders">,
  "id" | "order_number" | "status" | "payment_status" | "customer_name" | "total" | "currency" | "created_at"
>;
type OrderItemRow = Pick<
  Tables<"store_order_items">,
  "order_id" | "product_id" | "title" | "quantity" | "line_total"
>;
type ProductRow = Pick<
  Tables<"store_products">,
  "id" | "title" | "status" | "brand_id"
>;
type VariantRow = Pick<
  Tables<"store_product_variants">,
  "product_id" | "stock_quantity" | "track_inventory" | "is_active"
>;
type BrandRow = Pick<Tables<"cms_brands">, "id" | "name" | "is_visible">;

export type DashboardHomeOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

export type DashboardHomeTrendPoint = {
  date: string;
  label: string;
  revenue: number;
  orders: number;
};

export type DashboardHomeTopProduct = {
  productId: string | null;
  title: string;
  quantity: number;
  revenue: number;
};

export type DashboardHomeTopBrand = {
  brandId: string;
  name: string;
  revenue: number;
  share: number;
};

export type DashboardHomeSnapshot = {
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  ordersLast30Days: number;
  customerCount: number;
  productCount: number;
  activeProductCount: number;
  totalUnits: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  visibleBrandCount: number;
  recentOrders: DashboardHomeOrder[];
  trend: DashboardHomeTrendPoint[];
  topProducts: DashboardHomeTopProduct[];
  topBrands: DashboardHomeTopBrand[];
};

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff() {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildTrend(start: Date, orders: OrderRow[]): DashboardHomeTrendPoint[] {
  const byDay = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const key = dayKey(new Date(order.created_at));
    const current = byDay.get(key) ?? { revenue: 0, orders: 0 };
    const cancelled = order.status.toLowerCase() === "cancelled";
    const refunded = order.payment_status.toLowerCase() === "refunded";
    current.orders += 1;
    if (!cancelled && !refunded) current.revenue += Number(order.total) || 0;
    byDay.set(key, current);
  }

  const points: DashboardHomeTrendPoint[] = [];
  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const key = dayKey(date);
    const value = byDay.get(key) ?? { revenue: 0, orders: 0 };
    points.push({
      date: key,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      revenue: Number(value.revenue.toFixed(2)),
      orders: value.orders,
    });
  }
  return points;
}

export async function loadDashboardHomeSnapshot(): Promise<DashboardHomeSnapshot> {
  await requireDashboardStaff();

  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  start.setUTCHours(0, 0, 0, 0);

  const [
    productResult,
    variantResult,
    brandResult,
    customerCountResult,
    periodOrdersResult,
    recentOrdersResult,
  ] = await Promise.all([
    supabase
      .from("store_products")
      .select("id,title,status,brand_id"),
    supabase
      .from("store_product_variants")
      .select("product_id,stock_quantity,track_inventory,is_active"),
    supabase
      .from("cms_brands")
      .select("id,name,is_visible"),
    supabase
      .from("store_customers")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("store_orders")
      .select("id,order_number,status,payment_status,customer_name,total,currency,created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("store_orders")
      .select("id,order_number,status,payment_status,customer_name,total,currency,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  throwIfError(productResult.error, "Loading dashboard products failed");
  throwIfError(variantResult.error, "Loading dashboard inventory failed");
  throwIfError(brandResult.error, "Loading dashboard brands failed");
  throwIfError(customerCountResult.error, "Loading dashboard customers failed");
  throwIfError(periodOrdersResult.error, "Loading dashboard orders failed");
  throwIfError(recentOrdersResult.error, "Loading recent orders failed");

  const products = (productResult.data ?? []) as ProductRow[];
  const variants = (variantResult.data ?? []) as VariantRow[];
  const brands = (brandResult.data ?? []) as BrandRow[];
  const periodOrders = (periodOrdersResult.data ?? []) as OrderRow[];
  const recentOrders = (recentOrdersResult.data ?? []) as OrderRow[];

  const orderIds = periodOrders.map((order) => order.id);
  let orderItems: OrderItemRow[] = [];
  if (orderIds.length) {
    const { data, error } = await supabase
      .from("store_order_items")
      .select("order_id,product_id,title,quantity,line_total")
      .in("order_id", orderIds);
    throwIfError(error, "Loading dashboard order items failed");
    orderItems = (data ?? []) as OrderItemRow[];
  }

  const brandById = new Map(brands.map((brand) => [brand.id, brand]));
  const productById = new Map(products.map((product) => [product.id, product]));

  const topProductsByKey = new Map<string, DashboardHomeTopProduct>();
  const brandRevenue = new Map<string, number>();

  for (const item of orderItems) {
    const key = item.product_id ?? `title:${item.title}`;
    const current = topProductsByKey.get(key) ?? {
      productId: item.product_id,
      title: item.title,
      quantity: 0,
      revenue: 0,
    };
    current.quantity += item.quantity;
    current.revenue += Number(item.line_total) || 0;
    topProductsByKey.set(key, current);

    if (item.product_id) {
      const product = productById.get(item.product_id);
      if (product?.brand_id) {
        brandRevenue.set(
          product.brand_id,
          (brandRevenue.get(product.brand_id) ?? 0) + (Number(item.line_total) || 0),
        );
      }
    }
  }

  const topProducts = [...topProductsByKey.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5)
    .map((item) => ({ ...item, revenue: Number(item.revenue.toFixed(2)) }));

  const brandRevenueTotal = [...brandRevenue.values()].reduce((sum, value) => sum + value, 0);
  const topBrands = [...brandRevenue.entries()]
    .map(([brandId, revenue]) => ({
      brandId,
      name: brandById.get(brandId)?.name ?? "Unknown brand",
      revenue: Number(revenue.toFixed(2)),
      share: brandRevenueTotal > 0 ? Number(((revenue / brandRevenueTotal) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const trackedVariants = variants.filter((variant) => variant.track_inventory && variant.is_active);
  const totalSales = periodOrders.reduce((sum, order) => {
    const cancelled = order.status.toLowerCase() === "cancelled";
    const refunded = order.payment_status.toLowerCase() === "refunded";
    return cancelled || refunded ? sum : sum + (Number(order.total) || 0);
  }, 0);

  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    totalSales: Number(totalSales.toFixed(2)),
    ordersLast30Days: periodOrders.length,
    customerCount: customerCountResult.count ?? 0,
    productCount: products.length,
    activeProductCount: products.filter((product) => product.status === "active").length,
    totalUnits: trackedVariants.reduce((sum, variant) => sum + variant.stock_quantity, 0),
    lowStockVariants: trackedVariants.filter(
      (variant) => variant.stock_quantity > 0 && variant.stock_quantity <= 10,
    ).length,
    outOfStockVariants: trackedVariants.filter((variant) => variant.stock_quantity <= 0).length,
    visibleBrandCount: brands.filter((brand) => brand.is_visible).length,
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: String(order.order_number),
      customer: order.customer_name,
      total: Number(order.total) || 0,
      currency: order.currency,
      status: order.status,
      paymentStatus: order.payment_status,
      createdAt: order.created_at,
    })),
    trend: buildTrend(start, periodOrders),
    topProducts,
    topBrands,
  };
}
