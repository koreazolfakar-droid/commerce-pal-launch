import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getDashboardRole } from "@/dashboard/data/catalog";

type CustomerRow = Tables<"store_customers">;
type OrderRow = Tables<"store_orders">;

export type DashboardCustomerFilter = "all" | "vip" | "blocked";

export type DashboardCustomerListItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  tags: string[];
  isVip: boolean;
  isBlocked: boolean;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
};

export type DashboardCustomerStats = {
  total: number;
  vip: number;
  blocked: number;
  averageLifetimeValue: number;
};

export type DashboardCustomerListResult = {
  customers: DashboardCustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  stats: DashboardCustomerStats;
};

export type DashboardCustomerOrder = {
  id: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
};

export type DashboardCustomerDetail = DashboardCustomerListItem & {
  defaultAddress: string | null;
  internalNotes: string | null;
  updatedAt: string;
  orders: DashboardCustomerOrder[];
};

export type DashboardCustomerInput = {
  name: string;
  email: string;
  city: string;
  defaultAddress: string;
  tags: string[];
  isVip: boolean;
  isBlocked: boolean;
  internalNotes: string;
};

export type DashboardCustomerCreateInput = DashboardCustomerInput & {
  phone: string;
};

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff() {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
  return role;
}

function mapCustomer(row: CustomerRow): DashboardCustomerListItem {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    tags: row.tags ?? [],
    isVip: row.is_vip,
    isBlocked: row.is_blocked,
    totalOrders: row.total_orders,
    totalSpent: Number(row.total_spent) || 0,
    lastOrderAt: row.last_order_at,
    createdAt: row.created_at,
  };
}

async function countCustomers(filter?: DashboardCustomerFilter) {
  let query = supabase.from("store_customers").select("id", { count: "exact", head: true });
  if (filter === "vip") query = query.eq("is_vip", true);
  if (filter === "blocked") query = query.eq("is_blocked", true);
  const { count, error } = await query;
  throwIfError(error, "Counting customers failed");
  return count ?? 0;
}

async function loadCustomerStats(): Promise<DashboardCustomerStats> {
  const [total, vip, blocked, spendResult] = await Promise.all([
    countCustomers("all"),
    countCustomers("vip"),
    countCustomers("blocked"),
    supabase.from("store_customers").select("total_spent"),
  ]);
  throwIfError(spendResult.error, "Loading customer lifetime value failed");
  const spends = (spendResult.data ?? []).map((row) => Number(row.total_spent) || 0);
  const averageLifetimeValue =
    spends.length > 0 ? spends.reduce((sum, value) => sum + value, 0) / spends.length : 0;
  return {
    total,
    vip,
    blocked,
    averageLifetimeValue: Number(averageLifetimeValue.toFixed(2)),
  };
}

export async function listDashboardCustomers(input?: {
  search?: string;
  filter?: DashboardCustomerFilter;
  page?: number;
  pageSize?: number;
}): Promise<DashboardCustomerListResult> {
  await requireDashboardStaff();

  const page = Math.max(1, Math.trunc(input?.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(input?.pageSize ?? 20)));
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const search = input?.search?.trim() ?? "";
  const filter = input?.filter ?? "all";

  let query = supabase
    .from("store_customers")
    .select("*", { count: "exact" })
    .order("last_order_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(start, end);

  if (filter === "vip") query = query.eq("is_vip", true);
  if (filter === "blocked") query = query.eq("is_blocked", true);

  if (search) {
    const safe = search.replace(/[%_,()]/g, " ").trim();
    if (safe) {
      query = query.or(
        `name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%,city.ilike.%${safe}%`,
      );
    }
  }

  const [result, stats] = await Promise.all([query, loadCustomerStats()]);
  throwIfError(result.error, "Loading customers failed");

  return {
    customers: ((result.data ?? []) as CustomerRow[]).map(mapCustomer),
    total: result.count ?? 0,
    page,
    pageSize,
    stats,
  };
}

export async function getDashboardCustomer(id: string): Promise<DashboardCustomerDetail | null> {
  await requireDashboardStaff();

  const { data, error } = await supabase.from("store_customers").select("*").eq("id", id).maybeSingle();
  throwIfError(error, "Loading customer failed");
  if (!data) return null;

  const { data: orders, error: ordersError } = await supabase.rpc("get_store_customer_orders", {
    p_customer_id: id,
    p_limit: 50,
  });
  throwIfError(ordersError, "Loading customer orders failed");

  const row = data as CustomerRow;
  return {
    ...mapCustomer(row),
    defaultAddress: row.default_address,
    internalNotes: row.internal_notes,
    updatedAt: row.updated_at,
    orders: ((orders ?? []) as OrderRow[]).map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      total: Number(order.total) || 0,
      currency: order.currency,
      createdAt: order.created_at,
    })),
  };
}

export async function createDashboardCustomer(
  input: DashboardCustomerCreateInput,
): Promise<DashboardCustomerDetail | null> {
  await requireDashboardStaff();
  const { data, error } = await supabase.rpc("create_store_customer", {
    p_name: input.name,
    p_phone: input.phone,
    p_email: input.email || null,
    p_city: input.city || null,
    p_default_address: input.defaultAddress || null,
    p_tags: input.tags,
    p_is_vip: input.isVip,
    p_is_blocked: input.isBlocked,
    p_internal_notes: input.internalNotes || null,
  });
  throwIfError(error, "Creating customer failed");
  const row = data as CustomerRow | null;
  return row ? getDashboardCustomer(row.id) : null;
}

export async function updateDashboardCustomer(
  id: string,
  input: DashboardCustomerInput,
): Promise<DashboardCustomerDetail | null> {
  await requireDashboardStaff();
  const { error } = await supabase.rpc("update_store_customer_profile", {
    p_customer_id: id,
    p_name: input.name,
    p_email: input.email || null,
    p_city: input.city || null,
    p_default_address: input.defaultAddress || null,
    p_tags: input.tags,
    p_is_vip: input.isVip,
    p_is_blocked: input.isBlocked,
    p_internal_notes: input.internalNotes || null,
  });
  throwIfError(error, "Updating customer failed");
  return getDashboardCustomer(id);
}
