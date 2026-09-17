import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, SearchCheck } from "lucide-react";

import { DashboardCard } from "@/dashboard/components/DashboardCard";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const { language, text } = useDashboardLanguage();
  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header">
        <p>{text("التحليلات", "Analytics")}</p>
        <h1>{text("التحليلات والأداء", "Analytics & Performance")}</h1>
        <p>
          {text(
            "تقارير المبيعات والطلبات متاحة في لوحة التحكم، ويمكن إدارة SEO من المسار المخصص.",
            "Sales and order reporting lives on the main dashboard, with SEO controls available in the dedicated workspace.",
          )}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard className="p-5">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="size-5" />
          </span>
          <h2 className="mt-4 text-sm font-black">{text("تقرير الأداء", "Performance report")}</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {text(
              "استخدم الصفحة الرئيسية لمتابعة الإيرادات واتجاهات الطلبات والعملاء والمخزون حسب الفترة الزمنية.",
              "Use the main dashboard to monitor revenue, order trends, customers and inventory by date range.",
            )}
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex text-xs font-bold text-primary hover:underline"
          >
            {text("فتح لوحة التحكم", "Open dashboard")} →
          </Link>
        </DashboardCard>
        <DashboardCard className="p-5">
          <span className="grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600">
            <SearchCheck className="size-5" />
          </span>
          <h2 className="mt-4 text-sm font-black">SEO</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {text(
              "إدارة عناوين الصفحات والأوصاف وOpen Graph وإعدادات الفهرسة بدون خلطها مع تحليلات المبيعات.",
              "Manage page titles, descriptions, Open Graph and indexing settings separately from commerce analytics.",
            )}
          </p>
          <Link
            to="/dashboard/seo"
            className="mt-4 inline-flex text-xs font-bold text-primary hover:underline"
          >
            {language === "ar" ? "فتح SEO" : "Open SEO"} →
          </Link>
        </DashboardCard>
      </div>
    </section>
  );
}
