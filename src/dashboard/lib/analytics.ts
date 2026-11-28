export type AnalyticsPeriod = "7D" | "30D" | "90D" | "12M" | "custom";
export type AnalyticsRange = {
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
};
const DAY = 86_400_000;

export function analyticsRange(
  period: AnalyticsPeriod,
  now = new Date(),
  from = "",
  to = "",
): AnalyticsRange {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let start: number;
  let end = now.getTime();
  if (period === "custom") {
    const parse = (value: string) => {
      const time = Date.parse(`${value}T00:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(time) ||
        new Date(time).toISOString().slice(0, 10) !== value
      )
        throw new Error("Choose valid start and end dates.");
      return time;
    };
    start = parse(from);
    const last = parse(to);
    if (last > today) throw new Error("The end date cannot be in the future.");
    end = Math.min(last + DAY, now.getTime());
    if (last < start) throw new Error("The end date must be on or after the start date.");
  } else if (period === "12M") {
    // First included day is the day after the same date one calendar year ago.
    // UTC overflow intentionally handles Feb 29, producing March 1 in a non-leap year.
    start = Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate());
    if (new Date(start).getUTCMonth() === now.getUTCMonth()) start += DAY;
  } else {
    start = today - (Number.parseInt(period, 10) - 1) * DAY;
  }
  if (!(end > start) || end - start > 366 * DAY)
    throw new Error("Choose a date range of up to 366 days.");
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    previousStart: new Date(start - (end - start)).toISOString(),
    previousEnd: new Date(start).toISOString(),
  };
}

export function percentageChange(
  current: number,
  previous: number | null | undefined,
): number | null {
  if (previous == null || !Number.isFinite(previous) || !Number.isFinite(current)) return null;
  return previous === 0
    ? current === 0
      ? 0
      : null
    : ((current - previous) / Math.abs(previous)) * 100;
}

export function inventoryHref(search: string) {
  return `/dashboard/inventory?search=${encodeURIComponent(search)}&page=1`;
}

export type AnalyticsInterval = "daily" | "sevenDays";
type TrendPoint = {
  date: string;
  previousDate: string;
  revenue: number;
  orders: number;
  previousRevenue: number | null;
  previousOrders: number | null;
};

export type AnalyticsTrendBucket = TrendPoint & { end: string; previousEnd: string | null };

/** Group aligned buckets from the server. A final bucket may cover fewer days. */
export function analyticsTrendBuckets(
  snapshot: { trend: TrendPoint[]; periodEnd: string; previousEnd: string | null },
  interval: AnalyticsInterval,
): AnalyticsTrendBucket[] {
  const size = interval === "daily" ? 1 : 7;
  const buckets: AnalyticsTrendBucket[] = [];
  for (let index = 0; index < snapshot.trend.length; index += size) {
    const group = snapshot.trend.slice(index, index + size);
    const first = group[0];
    const next = snapshot.trend[index + size];
    let revenue = 0;
    let orders = 0;
    let previousRevenue: number | null = null;
    let previousOrders: number | null = null;
    for (const point of group) {
      revenue += point.revenue;
      orders += point.orders;
      if (point.previousRevenue !== null)
        previousRevenue = (previousRevenue ?? 0) + point.previousRevenue;
      if (point.previousOrders !== null)
        previousOrders = (previousOrders ?? 0) + point.previousOrders;
    }
    buckets.push({
      date: first.date,
      end: next?.date ?? snapshot.periodEnd,
      previousDate: first.previousDate,
      previousEnd: snapshot.previousEnd ? (next?.previousDate ?? snapshot.previousEnd) : null,
      revenue: Number(revenue.toFixed(2)),
      orders,
      previousRevenue: previousRevenue === null ? null : Number(previousRevenue.toFixed(2)),
      previousOrders,
    });
  }
  return buckets;
}

export function formatAnalyticsDates(start: string, end: string, format: Intl.DateTimeFormat) {
  const first = new Date(start);
  const last = new Date(Date.parse(end) - 1);
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || last < first)
    return "—";
  return format.formatRange(first, last);
}
