import { createFileRoute } from "@tanstack/react-router";
import { Database, ShieldCheck, Store } from "lucide-react";

import { ProductEditor } from "@/components/admin/ProductEditor";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/products")({
  component: ProductsDashboardPage,
});

function ProductsDashboardPage() {
  const { text } = useDashboardLanguage();

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Database className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-primary">
                Space Call Native Catalog
              </p>
              <h2 className="mt-1 text-sm font-black text-foreground">
                {text("إدارة مستقلة للمنتجات", "Independent product management")}
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                {text(
                  "أي منتج أو سعر أو مخزون تعدّله هنا يُحفظ في قاعدة بيانات Space Call فقط. Shopify يبقى موجوداً ولا يتم تعديل بياناته من هذه الصفحة.",
                  "Products, prices and inventory changed here are stored in the Space Call database only. Shopify remains connected and is not modified from this page.",
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[430px]">
            <StatusPill
              icon={<Database className="size-3.5" />}
              label={text("المصدر", "Source")}
              value="Supabase"
            />
            <StatusPill
              icon={<ShieldCheck className="size-3.5" />}
              label="Shopify"
              value={text("بدون تعديل", "Untouched")}
            />
            <StatusPill
              icon={<Store className="size-3.5" />}
              label={text("المتجر", "Storefront")}
              value={text("لم يتحول بعد", "Not switched yet")}
            />
          </div>
        </div>
      </section>

      <ProductEditor />
    </div>
  );
}

function StatusPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/80 px-3 py-2.5">
      <span className="text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[9px] font-semibold text-muted-foreground">{label}</span>
        <span className="block truncate text-[11px] font-black text-foreground">{value}</span>
      </span>
    </div>
  );
}
