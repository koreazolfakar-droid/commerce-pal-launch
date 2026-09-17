export type DashboardRole = "owner" | "admin" | "store_manager" | "inventory_manager" | "employee";

export type TrendDirection = "up" | "down" | "neutral";

export type DashboardTrend = {
  value: number | null;
  direction: TrendDirection;
};

export type DashboardStats = {
  revenue: number;
  orders: number;
  customers: number;
  products: number;
  conversionRate: number | null;
  averageOrderValue: number;
  returningCustomerRate: number;
  lowStockAlerts: number;
  revenueTrend: DashboardTrend;
  ordersTrend: DashboardTrend;
  customersTrend: DashboardTrend;
  productsTrend: DashboardTrend;
};

export type RevenueData = {
  date: string;
  label: string;
  revenue: number;
};

export type OrdersTrend = {
  date: string;
  label: string;
  orders: number;
};

export type DashboardOrderStatus =
  "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export type DashboardOrder = {
  id: string;
  orderNumber: number;
  customer: string;
  customerPhone: string;
  item: string;
  total: number;
  currency: string;
  status: DashboardOrderStatus;
  date: string;
};

export type ProductPerformance = {
  id: string;
  name: string;
  unitsSold: number;
  revenue: number;
  price: number;
  imageUrl: string | null;
};

export type BrandPerformance = {
  id: string;
  name: string;
  share: number;
  logoUrl: string | null;
};

export type InventoryStatusKey = "in_stock" | "low_stock" | "out_of_stock" | "on_order";

export type InventorySummary = {
  key: InventoryStatusKey;
  count: number;
  percentage: number;
};

export type DashboardDateRange = {
  start: string;
  end: string;
};

export type DashboardOverview = {
  stats: DashboardStats;
  currency: string;
  revenue: RevenueData[];
  orderTrend: OrdersTrend[];
  recentOrders: DashboardOrder[];
  topProducts: ProductPerformance[];
  topBrands: BrandPerformance[];
  inventory: InventorySummary[];
  dateRange: DashboardDateRange;
};
