import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Image, Menu, PanelsTopLeft, Search, Settings, Tags } from "lucide-react";

import { fetchDashboardOverview } from "@/lib/cmsAdmin.functions";

export const Route = createFileRoute("/dashboard/" as never)({
  component: DashboardHome,
});

const cards = [
  { key: "hero", label: "صور Hero", href: "/dashboard/hero", icon: Image },
  { key: "sections", label: "الأقسام", href: "/dashboard/sections", icon: PanelsTopLeft },
  { key: "navigation", label: "عناصر التنقل", href: "/dashboard/navigation", icon: Menu },
  { key: "brands", label: "البراندات", href: "/dashboard/brands", icon: Tags },
  { key: "seo", label: "صفحات SEO", href: "/dashboard/seo", icon: Search },
  { key: "settings", label: "الإعدادات", href: "/dashboard/settings", icon: Settings },
] as const;

function DashboardHome() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: fetchDashboardOverview,
    staleTime: 10_000,
  });

  return (
    <div className="space-y-7" dir="rtl">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Commerce CMS</p>
        <h1 className="mt-1 text-3xl font-black">لوحة تحكم Space Call</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          تحكم بمحتوى الواجهة من مكان واحد. المنتجات والأسعار والمخزون ما زالت منفصلة عن هذه المرحلة.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "تعذر تحميل ملخص اللوحة"}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const count = data?.counts?.[card.key];
          return (
            <a
              key={card.key}
              href={card.href}
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{card.label}</p>
                  <p className="mt-2 text-3xl font-black tabular-nums">
                    {isLoading || count === undefined ? "—" : count}
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-105">
                  <Icon className="size-5" />
                </span>
              </div>
            </a>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          <h2 className="text-lg font-black">آخر التعديلات</h2>
        </div>

        <div className="mt-4 divide-y divide-border">
          {data?.recentActivity?.length ? (
            data.recentActivity.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <span className="font-bold">{item.action}</span>
                  <span className="mx-2 text-muted-foreground">{item.entity_type}</span>
                  {item.entity_id ? <code className="text-xs text-muted-foreground">{item.entity_id}</code> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.actor_email ?? "system"} · {new Date(item.created_at).toLocaleString("ar-LB")}
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              {isLoading ? "جاري تحميل النشاط…" : "لا توجد تعديلات مسجلة بعد."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
