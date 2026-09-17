import { supabase } from "@/integrations/supabase/client";
import type {
  BrandPerformance,
  DashboardDateRange,
  DashboardOrder,
  DashboardOverview,
  DashboardTrend,
  InventorySummary,
  OrdersTrend,
  ProductPerformance,
  RevenueData,
} from "@/dashboard/types/dashboard";

type OrderRow = {
  id: string;
  order_number: number;
  status: DashboardOrder["status"];
  customer_name: string;
  customer_phone: string;
  currency: string;
  total: number | string;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  title: string;
  unit_price: number | string;
  quantity: number;
  line_total: number | string;
  created_at: string;
};

type ProductRow = {
  id: string;
  title: string;
  brand_id: string | null;
  base_price: number | string;
  stock_quantity: number;
  status: string;
  created_at: string;
};

type VariantRow = {
  id: string;
  product_id: string;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
};

type ImageRow = {
  product_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
};

type BrandRow = {
  id: string;
  name: string;
  logo_url: string | null;
};

type CustomerRow = {
  id: string;
  created_at: string;
};

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

function isBetween(date: string, start: Date, end: Date) {
  const time = new Date(date).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function trend(current: number, previous: number): DashboardTrend {
  if (!previous && !current) return { value: 0, direction: "neutral" };
  if (!previous) return { value: null, direction: current > 0 ? "up" : "neutral" };
  const value = ((current - previous) / Math.abs(previous)) * 100;
  return {
    value,
    direction: value > 0 ? "up" : value < 0 ? "down" : "neutral",
  };
}

function enumerateDays(start: Date, end: Date) {
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(toDateOnly(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

function percentage(count: number, total: number) {
  if (!total) return 0;
  return (count / total) * 100;
}

export function getDefaultDashboardRange(): DashboardDateRange {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return { start: toDateOnly(start), end: toDateOnly(end) };
}

export async function getDashboardOverview(
  range: DashboardDateRange = getDefaultDashboardRange(),
): Promise<DashboardOverview> {
  const currentStart = startOfDay(range.start);
  const currentEnd = endOfDay(range.end);
  const periodMs = Math.max(86_400_000, currentEnd.getTime() - currentStart.getTime() + 1);
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - periodMs + 1);

  const [ordersResult, orderItemsResult, productsResult, variantsResult, imagesResult, brandsResult, customersResult] =
    await Promise.all([
      supabase
        .from("store_orders" as never)
        .select("id,order_number,status,customer_name,customer_phone,currency,total,created_at")
        .gte("created_at", previousStart.toISOString())
        .lte("created_at", currentEnd.toISOString()),
      supabase
        .from("store_order_items" as never)
        .select("id,order_id,product_id,title,unit_price,quantity,line_total,created_at")
        .gte("created_at", previousStart.toISOString())
        .lte("created_at", currentEnd.toISOString()),
      supabase
        .from("store_products" as never)
        .select("id,title,brand_id,base_price,stock_quantity,status,created_at"),
      supabase
        .from("store_product_variants" as never)
        .select("id,product_id,stock_quantity,track_inventory,is_active"),
      supabase
        .from("store_product_images" as never)
        .select("product_id,url,is_primary,sort_order")
        .order("sort_order", { ascending: true }),
      supabase.from("cms_brands" as never).select("id,name,logo_url"),
      supabase.from("store_customers" as never).select("id,created_at"),
    ]);

  const firstError = [
    ordersResult.error,
    orderItemsResult.error,
    productsResult.error,
    variantsResult.error,
    imagesResult.error,
    brandsResult.error,
    customersResult.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  const orders = (ordersResult.data ?? []) as OrderRow[];
  const orderItems = (orderItemsResult.data ?? []) as OrderItemRow[];
  const products = (productsResult.data ?? []) as ProductRow[];
  const variants = (variantsResult.data ?? []) as VariantRow[];
  const images = (imagesResult.data ?? []) as ImageRow[];
  const brands = (brandsResult.data ?? []) as BrandRow[];
  const customers = (customersResult.data ?? []) as CustomerRow[];

  const currentOrders = orders.filter((order) => isBetween(order.created_at, currentStart, currentEnd));
  const previousOrders = orders.filter((order) => isBetween(order.created_at, previousStart, previousEnd));
  const currentActiveOrders = currentOrders.filter((order) => order.status !== "cancelled");
  const previousActiveOrders = previousOrders.filter((order) => order.status !== "cancelled");
  const currentRevenue = currentActiveOrders.reduce((sum, order) => sum + numeric(order.total), 0);
  const previousRevenue = previousActiveOrders.reduce((sum, order) => sum + numeric(order.total), 0);
  const currency = currentActiveOrders[0]?.currency ?? previousActiveOrders[0]?.currency ?? "USD";

  const currentCustomers = customers.filter((customer) => isBetween(customer.created_at, currentStart, currentEnd)).length;
  const previousCustomers = customers.filter((customer) => isBetween(customer.created_at, previousStart, previousEnd)).length;
  const currentProducts = products.filter((product) => isBetween(product.created_at, currentStart, currentEnd)).length;
  const previousProducts = products.filter((product) => isBetween(product.created_at, previousStart, previousEnd)).length;

  const activeVariants = variants.filter((variant) => variant.is_active && variant.track_inventory);
  const inStock = activeVariants.filter((variant) => variant.stock_quantity > 5).length;
  const lowStock = activeVariants.filter((variant) => variant.stock_quantity > 0 && variant.stock_quantity <= 5).length;
  const outOfStock = activeVariants.filter((variant) => variant.stock_quantity <= 0).length;
  const inventoryTotal = activeVariants.length;

  const customerOrderCounts = new Map<string, number>();
  for (const order of currentActiveOrders) {
    const key = order.customer_phone || order.customer_name;
    customerOrderCounts.set(key, (customerOrderCounts.get(key) ?? 0) + 1);
  }
  const uniqueCurrentCustomers = customerOrderCounts.size;
  const returningCustomers = [...customerOrderCounts.values()].filter((count) => count > 1).length;

  const days = enumerateDays(currentStart, currentEnd);
  const revenueByDay = new Map<string, number>();
  const ordersByDay = new Map<string, number>();
  for (const order of currentActiveOrders) {
    const key = order.created_at.slice(0, 10);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + numeric(order.total));
    ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1);
  }
  const revenue: RevenueData[] = days.map((date) => ({
    date,
    label: dayLabel(date),
    revenue: revenueByDay.get(date) ?? 0,
  }));
  const orderTrend: OrdersTrend[] = days.map((date) => ({
    date,
    label: dayLabel(date),
    orders: ordersByDay.get(date) ?? 0,
  }));

  const currentOrderIds = new Set(currentOrders.map((order) => order.id));
  const currentItems = orderItems.filter((item) => currentOrderIds.has(item.order_id));
  const firstItemByOrder = new Map<string, OrderItemRow>();
  for (const item of currentItems) {
    if (!firstItemByOrder.has(item.order_id)) firstItemByOrder.set(item.order_id, item);
  }

  const recentOrders: DashboardOrder[] = [...currentOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customer: order.customer_name,
      customerPhone: order.customer_phone,
      item: firstItemByOrder.get(order.id)?.title ?? "Order",
      total: numeric(order.total),
      currency: order.currency,
      status: order.status,
      date: order.created_at,
    }));

  const imageByProduct = new Map<string, string>();
  for (const image of images) {
    const existing = imageByProduct.has(image.product_id);
    if (!existing || image.is_primary) imageByProduct.set(image.product_id, image.url);
  }
  const productById = new Map(products.map((product) => [product.id, product]));
  const productPerformance = new Map<string, ProductPerformance>();
  for (const item of currentItems) {
    const key = item.product_id ?? `title:${item.title}`;
    const existing = productPerformance.get(key) ?? {
      id: key,
      name: item.title,
      unitsSold: 0,
      revenue: 0,
      price: numeric(item.unit_price),
      imageUrl: item.product_id ? imageByProduct.get(item.product_id) ?? null : null,
    };
    existing.unitsSold += item.quantity;
    existing.revenue += numeric(item.line_total);
    productPerformance.set(key, existing);
  }
  const topProducts = [...productPerformance.values()]
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
    .slice(0, 5);

  const brandById = new Map(brands.map((brand) => [brand.id, brand]));
  const brandRevenue = new Map<string, number>();
  let brandedRevenue = 0;
  for (const item of currentItems) {
    if (!item.product_id) continue;
    const product = productById.get(item.product_id);
    if (!product?.brand_id) continue;
    const amount = numeric(item.line_total);
    brandRevenue.set(product.brand_id, (brandRevenue.get(product.brand_id) ?? 0) + amount);
    brandedRevenue += amount;
  }
  const topBrands: BrandPerformance[] = [...brandRevenue.entries()]
    .map(([brandId, amount]) => {
      const brand = brandById.get(brandId);
      return {
        id: brandId,
        name: brand?.name ?? "Brand",
        logoUrl: brand?.logo_url ?? null,
        share: brandedRevenue ? (amount / brandedRevenue) * 100 : 0,
      };
    })
    .sort((a, b) => b.share - a.share)
    .slice(0, 5);

  const inventory: InventorySummary[] = [
    { key: "in_stock", count: inStock, percentage: percentage(inStock, inventoryTotal) },
    { key: "low_stock", count: lowStock, percentage: percentage(lowStock, inventoryTotal) },
    { key: "out_of_stock", count: outOfStock, percentage: percentage(outOfStock, inventoryTotal) },
    { key: "on_order", count: 0, percentage: 0 },
  ];

  return {
    stats: {
      revenue: currentRevenue,
      orders: currentOrders.length,
      customers: customers.length,
      products: products.filter((product) => product.status !== "archived").length,
      conversionRate: null,
      averageOrderValue: currentActiveOrders.length ? currentRevenue / currentActiveOrders.length : 0,
      returningCustomerRate: uniqueCurrentCustomers ? (returningCustomers / uniqueCurrentCustomers) * 100 : 0,
      lowStockAlerts: lowStock,
      revenueTrend: trend(currentRevenue, previousRevenue),
      ordersTrend: trend(currentOrders.length, previousOrders.length),
      customersTrend: trend(currentCustomers, previousCustomers),
      productsTrend: trend(currentProducts, previousProducts),
    },
    currency,
    revenue,
    orderTrend,
    recentOrders,
    topProducts,
    topBrands,
    inventory,
    dateRange: range,
  };
}

export async function getRecentOrders(range?: DashboardDateRange) {
  return (await getDashboardOverview(range)).recentOrders;
}

export async function getTopSellingProducts(range?: DashboardDateRange) {
  return (await getDashboardOverview(range)).topProducts;
}

export async function getInventorySummary(range?: DashboardDateRange) {
  return (await getDashboardOverview(range)).inventory;
}
