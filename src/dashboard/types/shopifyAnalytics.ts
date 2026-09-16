export type ShopifyAnalyticsStatus = "ready" | "disabled" | "unconfigured" | "unavailable";

export interface ShopifyAnalyticsPoint {
  date: string;
  orders: number;
  totalSales: number;
  averageOrderValue: number | null;
}

export interface ShopifyCustomerPoint {
  date: string;
  customers: number;
  returningCustomers: number;
  returningCustomerRate: number | null;
}

export interface ShopifySessionPoint {
  date: string;
  sessions: number;
  visitors: number;
  conversionRate: number | null;
}

export interface ShopifyTopProductMetric {
  title: string;
  grossSales: number;
  netSales: number;
  orders: number;
}

export interface ShopifyAnalyticsSnapshot {
  status: ShopifyAnalyticsStatus;
  source: "shopify-admin";
  message?: string;
  currency: string;
  totals: {
    orders: number;
    totalSales: number;
    averageOrderValue: number | null;
    customers: number;
    returningCustomers: number;
    returningCustomerRate: number | null;
    sessions: number;
    visitors: number;
    conversionRate: number | null;
  };
  salesSeries: ShopifyAnalyticsPoint[];
  customerSeries: ShopifyCustomerPoint[];
  sessionSeries: ShopifySessionPoint[];
  topProducts: ShopifyTopProductMetric[];
}
