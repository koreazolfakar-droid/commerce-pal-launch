import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Box, Package, ShoppingBag, UserRound, UsersRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";
import { formatPrice } from "@/lib/productPricing";

export const Route = createFileRoute("/dashboard/")({ component: DashboardOverview });

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
};

type Product = { id: string; title: string; featured_image: string | null };

type Stats = {
  revenue: number;
  currency: string;
  orders: Order[];
  products: Product[];
  productCount: number;
  customerCount: number;
  lowStock: number;
};

async function loadDashboard(): Promise<Stats> {
  const [ordersResult, productsResult, productCountResult, customersResult, lowStockResult] =
    await Promise.all([
      supabase
        .from("store_orders" as never)
        .select("id,order_number,customer_name,status,payment_status,total,currency,created_at")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase.from("store_products" as never).select("id,title,featured_image").limit(4),
      supabase.from("store_products" as never).select("id", { count: "exact", head: true }),
      supabase.from("store_customers" as never).select("id", { count: "exact", head: true }),
      supabase
        .from("store_product_variants" as never)
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("track_inventory", true)
        .lte("stock_quantity", 5),
    ]);

  const orders = (ordersResult.data ?? []) as Order[];
  const revenue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  return {
    revenue,
    currency: orders[0]?.currency || "USD",
    orders,
    products: (productsResult.data ?? []) as Product[],
    productCount: productCountResult.count ?? 0,
    customerCount: customersResult.count ?? 0,
    lowStock: lowStockResult.count ?? 0,
  };
}

const panel =
  "rounded-[14px] border border-border/60 bg-card shadow-[0_4px_22px_rgb(15_23_42/0.035)] dark:shadow-none";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

function MiniAvatar({ name }: { name: string }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
      {(name || "S").slice(0, 1).toUpperCase()}
    </span>
  );
}

function DashboardOverview() {
  const { text } = useDashboardLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "reference-overview-v2"],
    queryFn: loadDashboard,
    staleTime: 15_000,
    retry: false,
  });

  const orders = data?.orders ?? [];
  const delivered = orders.filter((order) => order.status === "delivered").length;
  const processing = orders.filter((order) =>
    ["confirmed", "processing", "shipped"].includes(order.status),
  ).length;
  const pending = orders.filter((order) => order.status === "pending").length;
  const maxBar = Math.max(...orders.slice(0, 7).map((order) => Number(order.total || 0)), 1);

  return (
    <section className="space-y-5 pb-8">
      <div>
        <h1 className="text-[22px] font-black tracking-tight text-foreground">
          {text("لوحة التحكم", "Dashboard")}
        </h1>
        <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Space Call</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_230px]">
        <div className="space-y-4">
          <article className={`${panel} flex min-h-[210px] flex-col items-center justify-center p-5 text-center`}>
            <div className="grid size-20 place-items-center rounded-full border-[5px] border-primary/10 bg-primary/5 text-primary">
              <UserRound className="size-8" strokeWidth={1.7} />
            </div>
            <h2 className="mt-4 text-sm font-black text-foreground">Space Call Admin</h2>
            <p className="mt-1 text-[10px] font-semibold text-muted-foreground">{text("المدير", "Owner")}</p>
          </article>

          <article className={`${panel} p-4`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-black">{text("عملاء مهمون", "Valuable Customers")}</h2>
              <UsersRound className="size-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center gap-2.5">
                  <MiniAvatar name={order.customer_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold text-foreground">{order.customer_name || text("عميل", "Customer")}</p>
                    <p className="truncate text-[8px] text-muted-foreground">#{order.order_number}</p>
                  </div>
                  <span className="text-[9px] font-black text-foreground">{formatPrice(Number(order.total), order.currency)}</span>
                </div>
              ))}
              {!isLoading && orders.length === 0 ? (
                <p className="py-6 text-center text-[10px] text-muted-foreground">{text("لا توجد بيانات بعد", "No customer data yet")}</p>
              ) : null}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <article className={`${panel} min-h-[270px] p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black">{text("نظرة عامة على المبيعات", "Sales Overview")}</h2>
                <p className="mt-1 text-[9px] text-muted-foreground">{text("آخر الطلبات", "Recent orders")}</p>
              </div>
              <span className="rounded-lg border border-border/60 px-2.5 py-1.5 text-[9px] font-bold text-muted-foreground">{text("مباشر", "Live")}</span>
            </div>
            <div className="mt-7 flex h-[175px] items-end justify-between gap-3 border-b border-border/50 px-2">
              {(isLoading ? Array.from({ length: 7 }) : orders.slice(0, 7)).map((order, index) => {
                const value = order ? Number(order.total || 0) : 0;
                const height = isLoading ? 35 + index * 5 : Math.max(18, (value / maxBar) * 100);
                return (
                  <div key={order ? order.id : index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div className="w-full max-w-10 rounded-t-md bg-primary/85 transition-all" style={{ height: `${height}%` }} />
                    <span className="text-[8px] font-semibold text-muted-foreground">{order ? `#${order.order_number}` : "—"}</span>
                  </div>
                );
              })}
            </div>
          </article>

          <article className={`${panel} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black">{text("المنتجات الأكثر مبيعاً", "Top Selling Products")}</h2>
              <Package className="size-4 text-muted-foreground" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(data?.products ?? []).map((product) => (
                <div key={product.id} className="min-w-0">
                  <div className="aspect-[1.28] overflow-hidden rounded-xl bg-muted/55">
                    {product.featured_image ? (
                      <img src={product.featured_image} alt="" className="size-full object-contain p-2" loading="lazy" />
                    ) : (
                      <div className="grid size-full place-items-center"><Box className="size-6 text-muted-foreground/50" /></div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-[10px] font-black">{product.title}</p>
                  <p className="mt-0.5 text-[8px] text-muted-foreground">Space Call</p>
                </div>
              ))}
              {isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="aspect-[1.28]" />) : null}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <article className={`${panel} min-h-[270px] p-5`}>
            <h2 className="text-sm font-black">{text("إجمالي المبيعات", "Total Sales")}</h2>
            <div className="mt-6 grid place-items-center">
              <div className="relative grid size-36 place-items-center rounded-full bg-[conic-gradient(var(--primary)_0_72%,var(--chart-2)_72%_86%,var(--chart-4)_86%_94%,var(--muted)_94%_100%)]">
                <div className="grid size-[104px] place-items-center rounded-full bg-card text-center">
                  <div>
                    <p className="text-xl font-black">{isLoading ? "—" : formatPrice(data?.revenue ?? 0, data?.currency ?? "USD")}</p>
                    <p className="mt-1 text-[8px] font-semibold text-muted-foreground">{text("مبيعات", "Sales")}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-sm font-black">{delivered}</p><p className="text-[8px] text-muted-foreground">{text("مكتمل", "Done")}</p></div>
              <div><p className="text-sm font-black">{processing}</p><p className="text-[8px] text-muted-foreground">{text("تجهيز", "Process")}</p></div>
              <div><p className="text-sm font-black">{pending}</p><p className="text-[8px] text-muted-foreground">{text("انتظار", "Pending")}</p></div>
            </div>
          </article>

          <article className={`${panel} p-4`}>
            <h2 className="mb-4 text-xs font-black">{text("الطلبات الأخيرة", "Recent Orders")}</h2>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted"><ShoppingBag className="size-3.5" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[9px] font-bold">#{order.order_number}</p><p className="truncate text-[8px] text-muted-foreground">{order.customer_name}</p></div>
                  <span className="text-[9px] font-black">{formatPrice(Number(order.total), order.currency)}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>

      <article className={`${panel} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div><h2 className="text-sm font-black">{text("تقرير المخزون", "Stock Report")}</h2><p className="mt-1 text-[9px] text-muted-foreground">{text("ملخص مباشر لحالة المتجر", "Live store inventory summary")}</p></div>
          <div className="flex gap-2 text-[9px] font-bold">
            <span className="rounded-lg bg-primary/8 px-3 py-1.5 text-primary">{text("المنتجات", "Products")}: {data?.productCount ?? 0}</span>
            <span className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-amber-600">{text("مخزون منخفض", "Low stock")}: {data?.lowStock ?? 0}</span>
            <span className="rounded-lg bg-muted px-3 py-1.5">{text("العملاء", "Customers")}: {data?.customerCount ?? 0}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-start text-[10px]">
            <thead className="bg-muted/25 text-muted-foreground"><tr><th className="px-5 py-3 text-start font-bold">{text("الطلب", "Order")}</th><th className="px-4 py-3 text-start font-bold">{text("العميل", "Customer")}</th><th className="px-4 py-3 text-start font-bold">{text("الحالة", "Status")}</th><th className="px-4 py-3 text-start font-bold">{text("الدفع", "Payment")}</th><th className="px-5 py-3 text-end font-bold">{text("الإجمالي", "Total")}</th></tr></thead>
            <tbody className="divide-y divide-border/50">
              {orders.slice(0, 6).map((order) => (
                <tr key={order.id} className="hover:bg-muted/20"><td className="px-5 py-3 font-black">#{order.order_number}</td><td className="px-4 py-3 font-semibold">{order.customer_name}</td><td className="px-4 py-3"><span className="rounded-full bg-primary/8 px-2 py-1 font-bold text-primary">{order.status}</span></td><td className="px-4 py-3 text-muted-foreground">{order.payment_status}</td><td className="px-5 py-3 text-end font-black">{formatPrice(Number(order.total), order.currency)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
