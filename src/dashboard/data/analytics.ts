import { z } from "zod";
import { looseSupabase } from "@/integrations/supabase/looseClient";
import { analyticsErrorMessage } from "@/dashboard/lib/analyticsErrors";
import { getDashboardRole } from "@/dashboard/data/catalog";
import type { AnalyticsRange } from "@/dashboard/lib/analytics";

const number = z.number().finite();
const metrics = z.object({
  grossSales: number,
  netSales: number,
  orders: number,
  paidOrders: number,
  aov: number,
});
const product = z.object({
  productId: z.string(),
  title: z.string(),
  sku: z.string(),
  image: z.string(),
  units: number,
  orders: number,
  revenue: number,
  stock: number.nullable(),
  previousUnits: number.nullable(),
});
const snapshot = z.object({
  recentOrders: z.array(
    z.object({
      id: z.string(),
      orderNumber: z.string(),
      customer: z.string(),
      total: number,
      currency: z.string(),
      status: z.string(),
      paymentStatus: z.string(),
      createdAt: z.string(),
    }),
  ),
  topBrands: z.array(
    z.object({ brandId: z.string(), name: z.string(), revenue: number, share: number.nullable() }),
  ),
  periodStart: z.string(),
  periodEnd: z.string(),
  previousStart: z.string().nullable(),
  previousEnd: z.string().nullable(),
  currency: z.string(),
  currencies: z.array(z.string()),
  current: metrics,
  previous: metrics.nullable(),
  catalog: z.object({
    customers: number,
    products: number,
    totalUnits: number,
    lowStock: number,
    criticalStock: number,
    outOfStock: number,
    visibleBrands: number,
  }),
  trend: z.array(
    z.object({
      date: z.string(),
      previousDate: z.string(),
      revenue: number,
      orders: number,
      previousRevenue: number.nullable(),
      previousOrders: number.nullable(),
    }),
  ),
  products: z.object({
    topSelling: z.array(product),
    lowestPerforming: z.array(product),
    highestRevenue: z.array(product),
    restock: z.array(product),
  }),
});
const alerts = z.object({
  total: number,
  page: number,
  pageSize: number,
  items: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string(),
      title: z.string(),
      sku: z.string(),
      variant: z.string().nullable(),
      stock: number,
      threshold: number,
      status: z.enum(["out", "critical", "low"]),
      image: z.string(),
    }),
  ),
});
export type AnalyticsSnapshot = z.infer<typeof snapshot>;
export type PerformanceProduct = z.infer<typeof product>;
export type InventoryAlerts = z.infer<typeof alerts>;
export type AlertStatus = "all" | "out" | "critical" | "low";
export type AlertSort = "severity" | "stock-asc" | "stock-desc" | "name";

async function read<T>(
  name: string,
  args: Record<string, unknown>,
  schema: z.ZodType<T>,
  signal: AbortSignal,
) {
  if (!(await getDashboardRole())) throw new Error("Dashboard authentication is required.");
  const { data, error } = await looseSupabase.rpc(name, args).abortSignal(signal);
  if (error) throw new Error(analyticsErrorMessage(error));
  const result = schema.safeParse(data);
  if (!result.success)
    throw new Error("Analytics returned an invalid response. Refresh and try again.");
  return result.data;
}
export function loadAnalyticsSnapshot(
  range: AnalyticsRange,
  compare: boolean,
  currency: string,
  signal: AbortSignal,
) {
  return read(
    "get_dashboard_analytics_snapshot",
    { p_start: range.start, p_end: range.end, p_compare: compare, p_currency: currency },
    snapshot,
    signal,
  );
}
export function loadInventoryAlerts(
  input: { search: string; status: AlertStatus; sort: AlertSort; page: number },
  signal: AbortSignal,
) {
  return read(
    "get_dashboard_inventory_alerts",
    {
      p_search: input.search,
      p_status: input.status,
      p_sort: input.sort,
      p_page: input.page,
      p_page_size: 8,
    },
    alerts,
    signal,
  );
}
