import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Boxes, History, RefreshCw, ShoppingBag, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

type NotificationTarget =
  | "/dashboard/orders"
  | "/dashboard/inventory"
  | "/dashboard/products"
  | "/dashboard/activity";

type DashboardNotification = {
  id: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  target: NotificationTarget;
  createdAt: string | null;
  severity: "info" | "warning" | "critical";
  kind: "order" | "inventory" | "activity";
};

type VariantRow = {
  id: string;
  product_id: string;
  stock_quantity: number;
  is_active: boolean;
  track_inventory: boolean;
};

type ProductRow = { id: string; title: string };
type OrderRow = {
  id: string;
  order_number: number;
  customer_name: string;
  status: string;
  created_at: string;
};
type AuditRow = {
  id: number;
  entity_type: "product" | "variant";
  action: "insert" | "update" | "delete";
  after_data: Record<string, unknown> | null;
  before_data: Record<string, unknown> | null;
  created_at: string;
};

function auditTitle(row: AuditRow) {
  const data = row.after_data ?? row.before_data ?? {};
  const title = data.title;
  if (typeof title === "string" && title.trim()) return title;
  const sku = data.sku;
  if (typeof sku === "string" && sku.trim()) return `SKU ${sku}`;
  return row.entity_type;
}

async function loadNotifications(): Promise<DashboardNotification[]> {
  const [variantsResult, ordersResult, auditResult] = await Promise.all([
    supabase
      .from("store_product_variants" as never)
      .select("id,product_id,stock_quantity,is_active,track_inventory")
      .eq("is_active", true)
      .eq("track_inventory", true)
      .lte("stock_quantity", 5)
      .order("stock_quantity", { ascending: true })
      .limit(8),
    supabase
      .from("store_orders" as never)
      .select("id,order_number,customer_name,status,created_at")
      .in("status", ["pending", "confirmed", "processing"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("store_catalog_audit_log" as never)
      .select("id,entity_type,action,after_data,before_data,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const firstError = [variantsResult.error, ordersResult.error, auditResult.error].find(Boolean);
  if (firstError) throw firstError;

  const variants = (variantsResult.data ?? []) as VariantRow[];
  const productIds = [...new Set(variants.map((row) => row.product_id))];
  let products: ProductRow[] = [];
  if (productIds.length) {
    const { data, error } = await supabase
      .from("store_products" as never)
      .select("id,title")
      .in("id", productIds);
    if (error) throw error;
    products = (data ?? []) as ProductRow[];
  }
  const productNames = new Map(products.map((product) => [product.id, product.title]));

  const notifications: DashboardNotification[] = [];

  for (const row of variants) {
    const name = productNames.get(row.product_id) ?? "Product";
    const out = row.stock_quantity <= 0;
    notifications.push({
      id: `inventory:${row.id}`,
      titleAr: out ? "منتج نافد من المخزون" : "مخزون منخفض",
      titleEn: out ? "Product out of stock" : "Low stock alert",
      bodyAr: `${name} — الكمية ${row.stock_quantity}`,
      bodyEn: `${name} — ${row.stock_quantity} remaining`,
      target: "/dashboard/inventory",
      createdAt: null,
      severity: out ? "critical" : "warning",
      kind: "inventory",
    });
  }

  for (const row of (ordersResult.data ?? []) as OrderRow[]) {
    notifications.push({
      id: `order:${row.id}`,
      titleAr: `طلب #${row.order_number} يحتاج متابعة`,
      titleEn: `Order #${row.order_number} needs attention`,
      bodyAr: `${row.customer_name} — ${row.status}`,
      bodyEn: `${row.customer_name} — ${row.status}`,
      target: "/dashboard/orders",
      createdAt: row.created_at,
      severity: row.status === "pending" ? "warning" : "info",
      kind: "order",
    });
  }

  for (const row of (auditResult.data ?? []) as AuditRow[]) {
    const label = auditTitle(row);
    notifications.push({
      id: `audit:${row.id}`,
      titleAr: row.action === "insert" ? "تمت إضافة عنصر" : row.action === "delete" ? "تم حذف عنصر" : "تم تعديل عنصر",
      titleEn: row.action === "insert" ? "Item created" : row.action === "delete" ? "Item deleted" : "Item updated",
      bodyAr: label,
      bodyEn: label,
      target: "/dashboard/activity",
      createdAt: row.created_at,
      severity: row.action === "delete" ? "warning" : "info",
      kind: "activity",
    });
  }

  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return notifications
    .sort((left, right) => {
      const severity = rank[left.severity] - rank[right.severity];
      if (severity !== 0) return severity;
      return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
    })
    .slice(0, 18);
}

function iconFor(kind: DashboardNotification["kind"]) {
  if (kind === "inventory") return Boxes;
  if (kind === "order") return ShoppingBag;
  return History;
}

function severityClass(severity: DashboardNotification["severity"]) {
  if (severity === "critical") return "bg-rose-500/10 text-rose-600 dark:text-rose-300";
  if (severity === "warning") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

export function DashboardNotifications() {
  const { language, text } = useDashboardLanguage();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ["dashboard", "notifications"],
    queryFn: loadNotifications,
    staleTime: 20_000,
    retry: 1,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const notifications = query.data ?? [];
  const criticalCount = useMemo(
    () => notifications.filter((item) => item.severity !== "info").length,
    [notifications],
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-9 place-items-center rounded-xl border border-border/70 bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label={text("الإشعارات", "Notifications")}
        aria-expanded={open}
        title={text("الإشعارات", "Notifications")}
      >
        <Bell className="size-4" />
        {criticalCount > 0 ? (
          <span className="absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[8px] font-black leading-4 text-white ring-2 ring-background">
            {criticalCount > 9 ? "9+" : criticalCount}
          </span>
        ) : (
          <span className="absolute end-[8px] top-[7px] size-1.5 rounded-full bg-primary ring-2 ring-card" />
        )}
      </button>

      {open ? (
        <div className="absolute end-0 top-[calc(100%+10px)] z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5">
            <div>
              <p className="text-xs font-black">{text("مركز الإشعارات", "Notification Center")}</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                {text("تنبيهات حقيقية من المتجر", "Live store alerts")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label={text("تحديث الإشعارات", "Refresh notifications")}
              >
                <RefreshCw className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label={text("إغلاق", "Close")}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[min(520px,70vh)] overflow-y-auto p-2">
            {query.isLoading ? (
              <div className="space-y-2 p-1">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl bg-muted/60" />
                ))}
              </div>
            ) : query.isError ? (
              <div className="px-4 py-8 text-center">
                <TriangleAlert className="mx-auto size-5 text-amber-500" />
                <p className="mt-2 text-xs font-bold">{text("تعذّر تحميل الإشعارات", "Notifications unavailable")}</p>
                <button
                  type="button"
                  onClick={() => void query.refetch()}
                  className="mt-3 rounded-lg border border-border px-3 py-1.5 text-[10px] font-bold"
                >
                  {text("إعادة المحاولة", "Retry")}
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                {text("لا توجد تنبيهات حالياً.", "No alerts right now.")}
              </div>
            ) : (
              notifications.map((item) => {
                const Icon = iconFor(item.kind);
                return (
                  <Link
                    key={item.id}
                    to={item.target}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-muted/55"
                  >
                    <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${severityClass(item.severity)}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-black text-foreground">
                        {language === "ar" ? item.titleAr : item.titleEn}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                        {language === "ar" ? item.bodyAr : item.bodyEn}
                      </span>
                      {item.createdAt ? (
                        <span className="mt-1 block text-[8px] text-muted-foreground/70">
                          {new Intl.DateTimeFormat(language === "ar" ? "ar-LB" : "en", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(item.createdAt))}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })
            )}
          </div>

          <Link
            to="/dashboard/activity"
            onClick={() => setOpen(false)}
            className="block border-t border-border/60 px-4 py-3 text-center text-[10px] font-black text-primary transition hover:bg-muted/40"
          >
            {text("عرض سجل النشاط الكامل", "View full activity log")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
