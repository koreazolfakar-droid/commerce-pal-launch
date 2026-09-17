import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  Image,
  Package,
  SearchCheck,
  Settings,
  ShoppingBag,
  UsersRound,
} from "lucide-react";

import type { DashboardOverview } from "@/dashboard/types/dashboard";
import { cn } from "@/lib/utils";

const modules = [
  {
    to: "/dashboard/orders",
    icon: ShoppingBag,
    en: "Orders",
    ar: "الطلبات",
    descriptionEn: "Review and process customer orders.",
    descriptionAr: "راجع الطلبات وعالجها بسرعة.",
    metric: "orders" as const,
  },
  {
    to: "/dashboard/products",
    icon: Package,
    en: "Products",
    ar: "المنتجات",
    descriptionEn: "Products, variants, pricing and media.",
    descriptionAr: "المنتجات والـVariants والأسعار والصور.",
    metric: "products" as const,
  },
  {
    to: "/dashboard/inventory",
    icon: Boxes,
    en: "Inventory",
    ar: "المخزون",
    descriptionEn: "Stock levels, low-stock alerts and adjustments.",
    descriptionAr: "الكميات والتنبيهات وتعديل المخزون.",
    metric: "inventory" as const,
  },
  {
    to: "/dashboard/customers",
    icon: UsersRound,
    en: "Customers",
    ar: "العملاء",
    descriptionEn: "Customer profiles and order activity.",
    descriptionAr: "ملفات العملاء ونشاط الطلبات.",
    metric: "customers" as const,
  },
  {
    to: "/dashboard/hero",
    icon: Image,
    en: "Storefront Content",
    ar: "محتوى المتجر",
    descriptionEn: "Hero, homepage sections, menus and visuals.",
    descriptionAr: "الهيرو والأقسام والقوائم والعناصر البصرية.",
    metric: "content" as const,
  },
  {
    to: "/dashboard/analytics",
    icon: BarChart3,
    en: "Analytics",
    ar: "التحليلات",
    descriptionEn: "Sales and customer performance.",
    descriptionAr: "أداء المبيعات والعملاء.",
    metric: "analytics" as const,
  },
  {
    to: "/dashboard/seo",
    icon: SearchCheck,
    en: "SEO",
    ar: "SEO",
    descriptionEn: "Search metadata and discoverability controls.",
    descriptionAr: "بيانات البحث وإعدادات الظهور.",
    metric: "seo" as const,
  },
  {
    to: "/dashboard/settings",
    icon: Settings,
    en: "Settings",
    ar: "الإعدادات",
    descriptionEn: "Store identity, WhatsApp and system preferences.",
    descriptionAr: "هوية المتجر وواتساب وإعدادات النظام.",
    metric: "settings" as const,
  },
] as const;

function moduleMetric(
  metric: (typeof modules)[number]["metric"],
  data: DashboardOverview,
  language: "ar" | "en",
) {
  if (metric === "orders") return data.stats.orders.toLocaleString();
  if (metric === "products") return data.stats.products.toLocaleString();
  if (metric === "inventory") return data.stats.lowStockAlerts.toLocaleString();
  if (metric === "customers") return data.stats.customers.toLocaleString();
  if (metric === "analytics") {
    return data.stats.conversionRate === null ? "—" : `${data.stats.conversionRate.toFixed(1)}%`;
  }
  return language === "ar" ? "إدارة" : "Manage";
}

function moduleMetricLabel(
  metric: (typeof modules)[number]["metric"],
  language: "ar" | "en",
) {
  if (metric === "orders") return language === "ar" ? "طلب" : "orders";
  if (metric === "products") return language === "ar" ? "منتج" : "products";
  if (metric === "inventory") return language === "ar" ? "تنبيه" : "alerts";
  if (metric === "customers") return language === "ar" ? "عميل" : "customers";
  if (metric === "analytics") return language === "ar" ? "تحويل" : "conversion";
  return "";
}

export function DashboardManagementHub({
  data,
  language,
}: {
  data: DashboardOverview;
  language: "ar" | "en";
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
            {language === "ar" ? "مركز الإدارة" : "Management center"}
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight sm:text-xl">
            {language === "ar" ? "كل أدوات المتجر في مكان واحد" : "Everything you manage, in one place"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {language === "ar"
              ? "انتقل مباشرة إلى المنتجات والمخزون والطلبات والمحتوى والإعدادات بدون البحث بين الصفحات."
              : "Jump directly to catalog, inventory, orders, storefront content and settings without hunting through pages."}
          </p>
        </div>
        <Link
          to="/dashboard/products"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 text-xs font-black transition hover:bg-muted"
        >
          {language === "ar" ? "إدارة الكتالوج" : "Manage catalog"}
          <ChevronRight className="size-3.5 rtl:rotate-180" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;
          const metric = moduleMetric(module.metric, data, language);
          const metricLabel = moduleMetricLabel(module.metric, language);
          const warning = module.metric === "inventory" && data.stats.lowStockAlerts > 0;

          return (
            <Link
              key={module.to}
              to={module.to}
              className="group min-w-0 rounded-2xl border border-border/70 bg-background p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary",
                    warning && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  )}
                >
                  <Icon className="size-[18px]" />
                </span>
                <span className="flex items-baseline gap-1 text-end">
                  <strong className={cn("text-lg font-black", warning && "text-amber-600 dark:text-amber-400")}>
                    {metric}
                  </strong>
                  {metricLabel ? <span className="text-[9px] text-muted-foreground">{metricLabel}</span> : null}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-black">
                {language === "ar" ? module.ar : module.en}
              </h3>
              <p className="mt-1 min-h-10 text-[11px] leading-5 text-muted-foreground">
                {language === "ar" ? module.descriptionAr : module.descriptionEn}
              </p>
              <div className="mt-3 flex items-center gap-1 text-[10px] font-black text-primary opacity-80 transition group-hover:opacity-100">
                {language === "ar" ? "فتح" : "Open"}
                <ChevronRight className="size-3 rtl:rotate-180" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
