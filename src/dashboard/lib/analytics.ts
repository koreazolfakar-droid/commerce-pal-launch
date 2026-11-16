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
