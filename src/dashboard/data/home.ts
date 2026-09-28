import { looseSupabase } from "@/integrations/supabase/looseClient";
import { getDashboardRole } from "@/dashboard/data/catalog";

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

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function array(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(object) : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function normalizeSnapshot(value: unknown): DashboardHomeSnapshot {
  const row = object(value);

  return {
    periodStart: text(row.periodStart),
    periodEnd: text(row.periodEnd),
    totalSales: number(row.totalSales),
    ordersLast30Days: number(row.ordersLast30Days),
    customerCount: number(row.customerCount),
    productCount: number(row.productCount),
    activeProductCount: number(row.activeProductCount),
    totalUnits: number(row.totalUnits),
    lowStockVariants: number(row.lowStockVariants),
    outOfStockVariants: number(row.outOfStockVariants),
    visibleBrandCount: number(row.visibleBrandCount),
    recentOrders: array(row.recentOrders).map((item) => ({
      id: text(item.id),
      orderNumber: text(item.orderNumber),
      customer: text(item.customer),
      total: number(item.total),
      currency: text(item.currency) || "USD",
      status: text(item.status),
      paymentStatus: text(item.paymentStatus),
      createdAt: text(item.createdAt),
    })),
    trend: array(row.trend).map((item) => ({
      date: text(item.date),
      label: text(item.label),
      revenue: number(item.revenue),
      orders: number(item.orders),
    })),
    topProducts: array(row.topProducts).map((item) => ({
      productId: nullableText(item.productId),
      title: text(item.title),
      quantity: number(item.quantity),
      revenue: number(item.revenue),
    })),
    topBrands: array(row.topBrands).map((item) => ({
      brandId: text(item.brandId),
      name: text(item.name),
      revenue: number(item.revenue),
      share: number(item.share),
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

  const snapshot = normalizeSnapshot(data);
  if (!snapshot.periodStart || !snapshot.periodEnd) {
    throw new Error("Loading dashboard home snapshot failed: invalid server response.");
  }

  return snapshot;
}
