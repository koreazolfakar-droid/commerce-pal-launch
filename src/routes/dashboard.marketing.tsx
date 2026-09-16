import { createFileRoute, Link } from "@tanstack/react-router";
import { Image, Megaphone, Sparkles } from "lucide-react";

import { DashboardCard } from "@/dashboard/components/DashboardCard";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/marketing")({ component: MarketingPage });

function MarketingPage() {
  const { text } = useDashboardLanguage();
  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header">
        <p>{text("التسويق", "Marketing")}</p>
        <h1>{text("التسويق والمحتوى الترويجي", "Marketing & Promotions")}</h1>
        <p>{text("إدارة الحملات المرئية والهيرو وأقسام العروض من أدوات المحتوى الحالية بدون إنشاء نظام منفصل.", "Manage visual campaigns, hero banners and promotional sections using the existing content tools without duplicating systems.")}</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard className="p-5">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Image className="size-5" /></span>
          <h2 className="mt-4 text-sm font-black">{text("الهيرو والبنرات", "Hero & Banners")}</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{text("تحكم بالصور والعناوين والروابط الرئيسية الظاهرة في واجهة المتجر.", "Control the primary storefront images, messaging and links.")}</p>
          <Link to="/dashboard/hero" className="mt-4 inline-flex text-xs font-bold text-primary hover:underline">{text("إدارة الهيرو", "Manage hero")} →</Link>
        </DashboardCard>
        <DashboardCard className="p-5">
          <span className="grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600"><Sparkles className="size-5" /></span>
          <h2 className="mt-4 text-sm font-black">{text("العروض والأقسام", "Promotions & Sections")}</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{text("إدارة أقسام الصفحة الرئيسية والعروض الترويجية الحالية من نفس CMS.", "Manage homepage sections and current promotional content from the same CMS.")}</p>
          <Link to="/dashboard/sections" className="mt-4 inline-flex text-xs font-bold text-primary hover:underline">{text("إدارة العروض", "Manage promotions")} →</Link>
        </DashboardCard>
      </div>
      <div className="hidden" aria-hidden="true"><Megaphone /></div>
    </section>
  );
}
