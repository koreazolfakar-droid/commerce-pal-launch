import type {
  ShopifyAnalyticsPoint,
  ShopifyAnalyticsSnapshot,
  ShopifyCustomerPoint,
  ShopifySessionPoint,
  ShopifyTopProductMetric,
} from "@/dashboard/types/shopifyAnalytics";

const ADMIN_API_VERSION = "2026-07";
const DEFAULT_SHOP_DOMAIN = "dj6qeq-j9.myshopify.com";
const CACHE_TTL_MS = 60_000;

const SHOPIFYQL_DOCUMENT = `
  query SpaceCallDashboardAnalytics($shopifyql: String!) {
    shop {
      currencyCode
    }
    shopifyqlQuery(query: $shopifyql) {
      parseErrors
      tableData {
        columns {
          name
          displayName
          dataType
        }
        rows
      }
    }
  }
`;

type TableColumn = { name: string; displayName: string; dataType: string };
type TablePayload = { columns: TableColumn[]; rows: unknown };
type ShopifyQlPayload = {
  shop?: { currencyCode?: string };
  shopifyqlQuery?: { parseErrors?: string[]; tableData?: TablePayload | null };
};

type GraphqlResponse = {
  data?: ShopifyQlPayload;
  errors?: Array<{ message?: string }>;
};

type CachedValue = { expiresAt: number; value: ShopifyAnalyticsSnapshot };
const cache = new Map<string, CachedValue>();

function emptySnapshot(
  status: ShopifyAnalyticsSnapshot["status"],
  message: string,
): ShopifyAnalyticsSnapshot {
  return {
    status,
    source: "shopify-admin",
    message,
    currency: "USD",
    totals: {
      orders: 0,
      totalSales: 0,
      averageOrderValue: null,
      customers: 0,
      returningCustomers: 0,
      returningCustomerRate: null,
      sessions: 0,
      visitors: 0,
      conversionRate: null,
    },
    salesSeries: [],
    customerSeries: [],
    sessionSeries: [],
    topProducts: [],
  };
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = numberValue(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function tableRows(table: TablePayload | null | undefined): Array<Record<string, unknown>> {
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) return [];

  return table.rows.flatMap((row) => {
    if (Array.isArray(row)) {
      const next: Record<string, unknown> = {};
      table.columns.forEach((column, index) => {
        next[column.name] = row[index];
      });
      return [next];
    }
    if (row && typeof row === "object") return [row as Record<string, unknown>];
    return [];
  });
}

function adminConfig() {
  const enabled = process.env["SHOPIFY_ADMIN_READS_ENABLED"] === "true";
  const token =
    process.env["SHOPIFY_ADMIN_API_TOKEN"]?.trim() ||
    process.env["SHOPIFY_ADMIN_ACCESS_TOKEN"]?.trim() ||
    "";
  const domain = (
    process.env["SHOPIFY_ADMIN_STORE_DOMAIN"]?.trim() ||
    process.env["VITE_SHOPIFY_STORE_DOMAIN"]?.trim() ||
    DEFAULT_SHOP_DOMAIN
  )
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  const version = process.env["SHOPIFY_ADMIN_API_VERSION"]?.trim() || ADMIN_API_VERSION;

  return { enabled, token, domain, version };
}

async function runShopifyQl(
  config: ReturnType<typeof adminConfig>,
  shopifyql: string,
): Promise<{ rows: Array<Record<string, unknown>>; currency: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);

  try {
    const response = await fetch(`https://${config.domain}/admin/api/${config.version}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.token,
      },
      body: JSON.stringify({ query: SHOPIFYQL_DOCUMENT, variables: { shopifyql } }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Shopify Admin read failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as GraphqlResponse;
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message || "Shopify GraphQL error").join("; "));
    }

    const parseErrors = payload.data?.shopifyqlQuery?.parseErrors ?? [];
    if (parseErrors.length) throw new Error(parseErrors.join("; "));

    return {
      rows: tableRows(payload.data?.shopifyqlQuery?.tableData),
      currency: payload.data?.shop?.currencyCode || "USD",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function quoteDate(value: string) {
  return value.replace(/[^0-9-]/g, "");
}

/**
 * Read-only Shopify Admin analytics. The integration is deliberately disabled
 * unless an explicit server flag and server credential are both configured.
 */
export async function loadShopifyAdminAnalytics(input: {
  start: string;
  end: string;
}): Promise<ShopifyAnalyticsSnapshot> {
  const config = adminConfig();
  if (!config.enabled) {
    return emptySnapshot("disabled", "Shopify Admin dashboard reads are disabled");
  }
  if (!config.token) {
    return emptySnapshot("unconfigured", "Shopify Admin dashboard credential is not configured");
  }

  const start = quoteDate(input.start);
  const end = quoteDate(input.end);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return emptySnapshot("unavailable", "Invalid analytics date range");
  }

  const cacheKey = `${start}:${end}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const range = `SINCE ${start} UNTIL ${end}`;
    const [salesSummary, salesSeries, customerSummary, customerSeries, sessionSummary, sessionSeries, topProducts] =
      await Promise.all([
        runShopifyQl(
          config,
          `FROM sales SHOW orders, total_sales, average_order_value ${range}`,
        ),
        runShopifyQl(
          config,
          `FROM sales SHOW orders, total_sales, average_order_value TIMESERIES day ${range}`,
        ),
        runShopifyQl(
          config,
          `FROM sales SHOW returning_customers, customers, returning_customer_rate ${range}`,
        ),
        runShopifyQl(
          config,
          `FROM sales SHOW returning_customers, customers, returning_customer_rate TIMESERIES day ${range}`,
        ),
        runShopifyQl(
          config,
          `FROM sessions SHOW sessions, online_store_visitors, conversion_rate ${range}`,
        ),
        runShopifyQl(
          config,
          `FROM sessions SHOW sessions, online_store_visitors, conversion_rate TIMESERIES day ${range}`,
        ),
        runShopifyQl(
          config,
          `FROM sales SHOW gross_sales, net_sales, orders GROUP BY product_title ORDER BY gross_sales DESC ${range} LIMIT 5`,
        ),
      ]);

    const salesTotal = salesSummary.rows[0] ?? {};
    const customerTotal = customerSummary.rows[0] ?? {};
    const sessionTotal = sessionSummary.rows[0] ?? {};

    const salesPoints: ShopifyAnalyticsPoint[] = salesSeries.rows.map((row) => ({
      date: String(row["day"] ?? ""),
      orders: numberValue(row["orders"]),
      totalSales: numberValue(row["total_sales"]),
      averageOrderValue: nullableNumber(row["average_order_value"]),
    }));
    const customerPoints: ShopifyCustomerPoint[] = customerSeries.rows.map((row) => ({
      date: String(row["day"] ?? ""),
      customers: numberValue(row["customers"]),
      returningCustomers: numberValue(row["returning_customers"]),
      returningCustomerRate: nullableNumber(row["returning_customer_rate"]),
    }));
    const sessionPoints: ShopifySessionPoint[] = sessionSeries.rows.map((row) => ({
      date: String(row["day"] ?? ""),
      sessions: numberValue(row["sessions"]),
      visitors: numberValue(row["online_store_visitors"]),
      conversionRate: nullableNumber(row["conversion_rate"]),
    }));
    const productMetrics: ShopifyTopProductMetric[] = topProducts.rows.map((row) => ({
      title: String(row["product_title"] ?? "Unknown product"),
      grossSales: numberValue(row["gross_sales"]),
      netSales: numberValue(row["net_sales"]),
      orders: numberValue(row["orders"]),
    }));

    const value: ShopifyAnalyticsSnapshot = {
      status: "ready",
      source: "shopify-admin",
      currency: salesSummary.currency,
      totals: {
        orders: numberValue(salesTotal["orders"]),
        totalSales: numberValue(salesTotal["total_sales"]),
        averageOrderValue: nullableNumber(salesTotal["average_order_value"]),
        customers: numberValue(customerTotal["customers"]),
        returningCustomers: numberValue(customerTotal["returning_customers"]),
        returningCustomerRate: nullableNumber(customerTotal["returning_customer_rate"]),
        sessions: numberValue(sessionTotal["sessions"]),
        visitors: numberValue(sessionTotal["online_store_visitors"]),
        conversionRate: nullableNumber(sessionTotal["conversion_rate"]),
      },
      salesSeries: salesPoints,
      customerSeries: customerPoints,
      sessionSeries: sessionPoints,
      topProducts: productMetrics,
    };

    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  } catch (error) {
    console.error("[dashboard] Shopify Admin analytics read failed", error);
    return emptySnapshot(
      "unavailable",
      error instanceof Error ? error.message : "Shopify Admin analytics is unavailable",
    );
  }
}
