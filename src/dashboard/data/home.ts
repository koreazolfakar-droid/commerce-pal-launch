import { getDashboardRole } from "@/dashboard/data/catalog";
import { looseSupabase } from "@/integrations/supabase/looseClient";

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = asRecord(entry);
    return row ? [row] : [];
  });
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function mapSnapshot(raw: unknown): DashboardHomeSnapshot {
  const row = asRecord(raw);
  if (!row) throw new Error("Dashboard snapshot returned an invalid payload.");

  const periodStart = stringValue(row.periodStart);
  const periodEnd = stringValue(row.periodEnd);
  if (!periodStart || !periodEnd) {
    throw new Error("Dashboard snapshot is missing its reporting period.");
  }

  return {
    periodStart,
    periodEnd,
    totalSales: numberValue(row.totalSales),
    ordersLast30Days: numberValue(row.ordersLast30Days),
    customerCount: numberValue(row.customerCount),
    productCount: numberValue(row.productCount),
    activeProductCount: numberValue(row.activeProductCount),
    totalUnits: numberValue(row.totalUnits),
    lowStockVariants: numberValue(row.lowStockVariants),
    outOfStockVariants: numberValue(row.outOfStockVariants),
    visibleBrandCount: numberValue(row.visibleBrandCount),
    recentOrders: asArray(row.recentOrders).map((order) => ({
      id: stringValue(order.id),
      orderNumber: stringValue(order.orderNumber),
      customer: stringValue(order.customer),
      total: numberValue(order.total),
      currency: stringValue(order.currency) || "USD",
      status: stringValue(order.status),
      paymentStatus: stringValue(order.paymentStatus),
      createdAt: stringValue(order.createdAt),
    })),
    trend: asArray(row.trend).map((point) => ({
      date: stringValue(point.date),
      label: stringValue(point.label),
      revenue: numberValue(point.revenue),
      orders: numberValue(point.orders),
    })),
    topProducts: asArray(row.topProducts).map((product) => ({
      productId:
        typeof product.productId === "string" && product.productId
          ? product.productId
          : null,
      title: stringValue(product.title),
      quantity: numberValue(product.quantity),
      revenue: numberValue(product.revenue),
    })),
    topBrands: asArray(row.topBrands).map((brand) => ({
      brandId: stringValue(brand.brandId),
      name: stringValue(brand.name),
      revenue: numberValue(brand.revenue),
      share: numberValue(brand.share),
    })),
  };
}

export async function loadDashboardHomeSnapshot(): Promise<DashboardHomeSnapshot> {
  await requireDashboardStaff();

  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  start.setUTCHours(0, 0, 0, 0);

  const { data, error } = await looseSupabase.rpc("get_dashboard_home_snapshot", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });
  throwIfError(error, "Loading dashboard home snapshot failed");

  return mapSnapshot(data);
}
