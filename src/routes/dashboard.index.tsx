import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Image,
  Menu,
  PanelsTopLeft,
  Search,
  Settings,
  Tags,
} from "lucide-react";

import { fetchDashboardOverview } from "@/lib/cmsAdmin.functions";

export const Route = createFileRoute("/dashboard/" as never)({
  component: DashboardHome,
});

const cards = [
  { key: "hero", label: "Hero Slides", href: "/dashboard/hero", icon: Image },
  { key: "sections", label: "الأقسام", href: "/dashboard/sections", icon: PanelsTopLeft },
  { key: "navigation", label: "عناصر التنقل", href: "/dashboard/navigation", icon: Menu },
  { key: "brands", label: "البراندات", href: "/dashboard/brands", icon: Tags },
] as const;

const quickActions = [
  { href: "/dashboard/hero", label: "إدارة صور Hero", icon: Image },
  { href: "/dashboard/seo", label: "إعدادات SEO", icon: Search },
  { href: "/dashboard/settings", label: "إعدادات الموقع", icon: Settings },
] as const;

function DashboardHome() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: fetchDashboardOverview,
    staleTime: 10_000,
  });

  const heroCount = data?.counts?.hero ?? 0;
  const sectionsCount = data?.counts?.sections ?? 0;
  const navigationCount = data?.counts?.navigation ?? 0;
  const brandsCount = data?.counts?.brands ?? 0;
  const seoCount = data?.counts?.seo ?? 0;
  const settingsCount = data?.counts?.settings ?? 0;
  const totalContent =
    heroCount + sectionsCount + navigationCount + brandsCount + seoCount + settingsCount;
  const chartTotal = Math.max(heroCount + sectionsCount + navigationCount + brandsCount, 1);
  const heroShare = (heroCount / chartTotal) * 100;
  const sectionsShare = (sectionsCount / chartTotal) * 100;
  const navigationShare = (navigationCount / chartTotal) * 100;
  const heroEnd = heroShare;
  const sectionsEnd = heroEnd + sectionsShare;
  const navigationEnd = sectionsEnd + navigationShare;

  return (
    <div className="space-y-6 text-slate-950" dir="rtl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#315efb]">
            Store Overview
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            مرحباً بك في Space Call
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-400">
            نظرة سريعة على محتوى المتجر وآخر التعديلات.
          </p>
        </div>
        <p className="text-xs font-semibold text-slate-400">
          {new Date().toLocaleDateString("ar-LB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error instanceof Error ? error.message : "تعذر تحميل ملخص اللوحة"}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const count = data?.counts?.[card.key];
          const accentClasses = [
            "bg-blue-50 text-blue-600",
            "bg-violet-50 text-violet-600",
            "bg-amber-50 text-amber-600",
            "bg-emerald-50 text-emerald-600",
          ] as const;

          return (
            <a
              key={card.key}
              href={card.href}
              className="group rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.28)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400">{card.label}</p>
                  <p className="mt-3 text-[28px] font-black leading-none tabular-nums text-slate-950">
                    {isLoading || count === undefined ? "—" : count.toLocaleString("en-US")}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-400">عنصر قابل للإدارة</p>
                </div>
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-2xl ${accentClasses[index]}`}
                >
                  <Icon className="size-5" />
                </span>
              </div>
            </a>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[22px] bg-[#111d4a] p-5 text-white shadow-[0_18px_40px_-24px_rgba(17,29,74,0.7)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-white/60">إجمالي عناصر CMS</p>
              <p className="mt-3 text-4xl font-black tabular-nums">
                {isLoading ? "—" : totalContent.toLocaleString("en-US")}
              </p>
              <p className="mt-2 max-w-md text-xs leading-6 text-white/55">
                المحتوى الذي يمكن إدارته من لوحة Space Call بدون تعديل الكود مباشرة.
              </p>
            </div>
            <span className="rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/75">
              Live CMS
            </span>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
            <div>
              <p className="text-lg font-black tabular-nums">{seoCount}</p>
              <p className="mt-1 text-[10px] font-semibold text-white/50">SEO</p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-lg font-black tabular-nums">{settingsCount}</p>
              <p className="mt-1 text-[10px] font-semibold text-white/50">Settings</p>
            </div>
            <div>
              <p className="text-lg font-black tabular-nums">{brandsCount}</p>
              <p className="mt-1 text-[10px] font-semibold text-white/50">Brands</p>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900">توزيع المحتوى</h2>
              <p className="mt-1 text-[11px] font-semibold text-slate-400">حسب الأقسام الرئيسية</p>
            </div>
            <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-400">
              CMS
            </span>
          </div>

          <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:justify-around">
            <div className="relative size-36 shrink-0 rounded-full bg-slate-100 p-4">
              <div
                className="size-full rounded-full"
                style={{
                  background: `conic-gradient(#315efb 0% ${heroEnd}%, #f59e0b ${heroEnd}% ${sectionsEnd}%, #ef4444 ${sectionsEnd}% ${navigationEnd}%, #8b5cf6 ${navigationEnd}% 100%)`,
                }}
              />
              <div className="absolute inset-[34px] grid place-items-center rounded-full bg-white text-center shadow-inner">
                <div>
                  <p className="text-xl font-black tabular-nums text-slate-900">
                    {heroCount + sectionsCount + navigationCount + brandsCount}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400">TOTAL</p>
                </div>
              </div>
            </div>

            <div className="grid w-full max-w-[230px] grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <Legend dot="bg-[#315efb]" label="Hero" value={heroCount} />
              <Legend dot="bg-amber-500" label="Sections" value={sectionsCount} />
              <Legend dot="bg-red-500" label="Navigation" value={navigationCount} />
              <Legend dot="bg-violet-500" label="Brands" value={brandsCount} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-[#315efb]">
                <Activity className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-black text-slate-900">آخر التعديلات</h2>
                <p className="text-[10px] font-semibold text-slate-400">Recent activity</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-right text-xs">
              <thead className="bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 sm:px-6">الإجراء</th>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">العنصر</th>
                  <th className="px-4 py-3">المستخدم</th>
                  <th className="px-5 py-3 sm:px-6">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recentActivity?.length ? (
                  data.recentActivity.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-extrabold text-slate-800 sm:px-6">
                        {item.action}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-500">
                        {item.entity_type}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3.5 font-mono text-[10px] text-slate-400">
                        {item.entity_id ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-500">
                        {item.actor_email ?? "system"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[11px] font-semibold text-slate-400 sm:px-6">
                        {new Date(item.created_at).toLocaleString("ar-LB")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                      {isLoading ? "جاري تحميل النشاط…" : "لا توجد تعديلات مسجلة بعد."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <h2 className="text-sm font-black text-slate-900">وصول سريع</h2>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">Quick actions</p>

          <div className="mt-4 space-y-2">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-white group-hover:text-[#315efb]">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-xs font-extrabold text-slate-700">
                    {item.label}
                  </span>
                  <ArrowLeft className="size-3.5 text-slate-300 transition group-hover:-translate-x-0.5 group-hover:text-slate-500" />
                </a>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}

function Legend({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${dot}`} />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold text-slate-400">{label}</p>
        <p className="text-sm font-black tabular-nums text-slate-800">{value}</p>
      </div>
    </div>
  );
}
