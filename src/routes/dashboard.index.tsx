import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  FileSearch,
  Image,
  Layers3,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Tags,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

const QUICK_ACTIONS = [
  {
    to: "/dashboard/hero",
    title: "صور الهيرو",
    text: "تعديل صور الواجهة والعناوين والروابط.",
    icon: Image,
  },
  {
    to: "/dashboard/sections",
    title: "أقسام الصفحة",
    text: "إظهار وترتيب وتحرير أقسام الصفحة الرئيسية.",
    icon: Layers3,
  },
  {
    to: "/dashboard/navigation",
    title: "القوائم والأيقونات",
    text: "إدارة روابط الهيدر والفوتر والجوال.",
    icon: Menu,
  },
  {
    to: "/dashboard/brands",
    title: "البراندات",
    text: "إدارة أسماء الشركات وشعاراتها وروابطها.",
    icon: Tags,
  },
  {
    to: "/dashboard/seo",
    title: "SEO",
    text: "العناوين والوصف وصور المشاركة وبيانات الصفحات.",
    icon: Search,
  },
  {
    to: "/dashboard/settings",
    title: "الإعدادات العامة",
    text: "اسم المتجر وواتساب وإعدادات الواجهة العامة.",
    icon: Settings,
  },
] as const;

const MANAGEMENT_ROWS = [
  { to: "/dashboard/hero", title: "Homepage Hero", type: "واجهة رئيسية", icon: Image },
  { to: "/dashboard/sections", title: "Homepage Sections", type: "أقسام المحتوى", icon: Layers3 },
  { to: "/dashboard/brands", title: "Brand Directory", type: "براندات", icon: Tags },
  { to: "/dashboard/seo", title: "SEO Pages", type: "محركات البحث", icon: FileSearch },
] as const;

async function loadCmsStats() {
  const [hero, sections, brands, seo] = await Promise.all([
    supabase.from("cms_hero_slides").select("id", { count: "exact", head: true }),
    supabase.from("cms_sections").select("id", { count: "exact", head: true }),
    supabase.from("cms_brands").select("id", { count: "exact", head: true }),
    supabase.from("cms_seo_pages").select("page_slug", { count: "exact", head: true }),
  ]);

  return {
    hero: hero.error ? null : (hero.count ?? 0),
    sections: sections.error ? null : (sections.count ?? 0),
    brands: brands.error ? null : (brands.count ?? 0),
    seo: seo.error ? null : (seo.count ?? 0),
  };
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: number | null | undefined;
  helper: string;
  icon: typeof Image;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {value === undefined ? "…" : value === null ? "—" : value}
          </p>
        </div>
        <span className="grid size-9 place-items-center rounded-xl bg-muted/60 text-foreground">
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-muted-foreground">{helper}</p>
    </div>
  );
}

function DashboardOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "cms-stats"],
    queryFn: loadCmsStats,
    staleTime: 15_000,
    retry: false,
  });

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Dashboard</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-[28px]">
            إدارة متجر Space Call
          </h1>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            نظرة سريعة على محتوى المتجر وإعدادات الواجهة المتصلة مباشرة بـSupabase CMS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/70 bg-card px-3.5 text-xs font-bold transition hover:bg-muted"
          >
            <ExternalLink className="size-3.5" /> معاينة المتجر
          </a>
          <Link
            to="/dashboard/hero"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-foreground px-3.5 text-xs font-bold text-background transition hover:opacity-90"
          >
            <Image className="size-3.5" /> تعديل الواجهة
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Hero Slides"
          value={isLoading ? undefined : stats?.hero}
          helper="العناصر المسجلة في واجهة الهيرو"
          icon={Image}
        />
        <StatCard
          label="Homepage Sections"
          value={isLoading ? undefined : stats?.sections}
          helper="أقسام الصفحة القابلة للإدارة"
          icon={Layers3}
        />
        <StatCard
          label="Managed Brands"
          value={isLoading ? undefined : stats?.brands}
          helper="براندات CMS المسجلة حاليًا"
          icon={Tags}
        />
        <StatCard
          label="SEO Pages"
          value={isLoading ? undefined : stats?.seo}
          helper="صفحات SEO المسجلة في اللوحة"
          icon={FileSearch}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.7fr)]">
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.02)]">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-black text-foreground">إدارة المحتوى</h2>
              <p className="mt-1 text-[10px] text-muted-foreground">أهم أجزاء المتجر المرتبطة بالـCMS.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Live
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-right">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20 text-[10px] font-semibold text-muted-foreground">
                  <th className="px-5 py-3">المحتوى</th>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-5 py-3 text-left">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {MANAGEMENT_ROWS.map((row) => {
                  const Icon = row.icon;
                  return (
                    <tr key={row.to} className="border-b border-border/50 last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/60 bg-muted/30 text-foreground">
                            <Icon className="size-4" strokeWidth={1.8} />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-foreground">{row.title}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">Space Call CMS</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[11px] font-medium text-muted-foreground">{row.type}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-500" /> متصل
                        </span>
                      </td>
                      <td className="px-5 py-4 text-left">
                        <Link
                          to={row.to}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border/70 px-2.5 text-[10px] font-bold text-foreground transition hover:bg-muted"
                        >
                          فتح <ArrowLeft className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.02)]">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h2 className="text-sm font-black text-foreground">حالة النظام</h2>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Dashboard health</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["Supabase CMS", "متصل"],
                ["Admin Access", "محمي"],
                ["Live Content", "مفعّل"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-foreground">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> {value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.02)]">
            <h2 className="text-sm font-black text-foreground">إجراءات سريعة</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.slice(0, 4).map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="rounded-xl border border-border/60 bg-muted/20 p-3 transition hover:border-foreground/15 hover:bg-muted/45"
                  >
                    <Icon className="size-4 text-foreground" strokeWidth={1.8} />
                    <p className="mt-2 text-[10px] font-bold text-foreground">{action.title}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.02)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-foreground">كل أدوات الإدارة</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">وصول مباشر لباقي صفحات التحكم.</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK_ACTIONS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.to}
                to={card.to}
                className="group flex items-center gap-3 rounded-xl border border-border/60 p-3.5 transition hover:border-foreground/15 hover:bg-muted/25"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted/60 text-foreground">
                  <Icon className="size-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground">{card.title}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{card.text}</p>
                </div>
                <ArrowLeft className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}
