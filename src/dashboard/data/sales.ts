import { getDashboardRole } from "@/dashboard/data/catalog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type SaleRow = Tables<"store_sales">;

export type DashboardSale = {
  id: string;
  orderId: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  paymentStatus: string;
  currency: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
  completedAt: string;
};

export type DashboardSalesResult = {
  sales: DashboardSale[];
  total: number;
  page: number;
  pageSize: number;
};

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function requireDashboardStaff() {
  const role = await getDashboardRole();
  if (!role) throw new Error("Dashboard authentication is required.");
}

export async function listDashboardSales(input?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<DashboardSalesResult> {
  await requireDashboardStaff();

  const page = Math.max(1, Math.trunc(input?.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(input?.pageSize ?? 10)));
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const search = input?.search?.trim() ?? "";

  let query = supabase
    .from("store_sales")
    .select(
      "id,order_id,order_number,customer_name,customer_phone,payment_method,payment_status,currency,subtotal,shipping_total,discount_total,total,completed_at",
      { count: "exact" },
    )
    .order("completed_at", { ascending: false })
    .range(start, end);

  if (search) {
    if (/^\d+$/.test(search)) {
      query = query.eq("order_number", Number(search));
    } else {
      const safe = search.replace(/[%_,()]/g, " ").trim();
      if (safe) {
        query = query.or(`customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%`);
      }
    }
  }

  const { data, count, error } = await query;
  throwIfError(error, "Loading sales failed");

  const rows = (data ?? []) as SaleRow[];
  return {
    total: count ?? 0,
    page,
    pageSize,
    sales: rows.map((sale) => ({
      id: sale.id,
      orderId: sale.order_id,
      orderNumber: sale.order_number,
      customerName: sale.customer_name,
      customerPhone: sale.customer_phone,
      paymentMethod: sale.payment_method,
      paymentStatus: sale.payment_status,
      currency: sale.currency,
      subtotal: Number(sale.subtotal) || 0,
      shippingTotal: Number(sale.shipping_total) || 0,
      discountTotal: Number(sale.discount_total) || 0,
      total: Number(sale.total) || 0,
      completedAt: sale.completed_at,
    })),
  };
}
