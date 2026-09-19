import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/dashboard/i18n";
import { pageMeta } from "@/dashboard/config/navigation";
import {
  loadWorkspaceRows,
  type WorkspaceRow,
  type WorkspaceSource,
} from "@/dashboard/data/workspace";

export default function WorkspacePage({ path }: { path: string }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [auditSource, setAuditSource] = useState<"catalog" | "cms">("catalog");
  const source: WorkspaceSource | null =
    path === "/dashboard/activity"
      ? auditSource
      : path === "/dashboard/users"
        ? "users"
        : path === "/dashboard/promotions"
          ? "promotions"
          : null;
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [rows, setRows] = useState<WorkspaceRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(Boolean(source));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setRows([]);
    setHasMore(false);
    loadWorkspaceRows(source, page)
      .then((result) => {
        if (!cancelled) {
          setRows(result.rows);
          setHasMore(result.hasMore);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            ar
              ? "تعذر تحميل البيانات. تحقق من الاتصال وصلاحيات حسابك ثم أعد المحاولة."
              : "Unable to load data. Check your connection and account permissions, then retry.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, page, reload, ar]);
  const titles: Record<string, string> = {
    "/dashboard/activity": "سجل النشاط",
    "/dashboard/users": "المستخدمون",
    "/dashboard/promotions": "العروض",
    "/dashboard/marketing": "الحملات",
    "/dashboard/coupons": "القسائم",
    "/dashboard/messages": "الرسائل",
    "/dashboard/reviews": "المراجعات",
  };
  const title = ar
    ? (titles[path] ?? "الصفحة غير موجودة")
    : (pageMeta[path]?.title ??
      {
        "/dashboard/marketing": "Campaigns",
        "/dashboard/coupons": "Coupons",
        "/dashboard/reviews": "Reviews",
      }[path] ??
      "Page not found");
  const button =
    "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-40";
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {!source ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <p>
            {ar
              ? "هذا القسم غير مربوط بخدمة تشغيل حاليًا. لا توجد بيانات معروضة أو عمليات حفظ وهمية."
              : "This section does not have an operational integration yet. No sample records or simulated save actions are shown."}
          </p>
          {path === "/dashboard/marketing" && (
            <Link className="block text-indigo-600" href="/dashboard/homepage/hero">
              {ar ? "إدارة بنرات الحملات المنشورة" : "Manage published campaign banners"}
            </Link>
          )}
          <Link className="block text-indigo-600" href="/dashboard">
            {ar ? "العودة للوحة التحكم" : "Back to dashboard"}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {source === "users"
              ? ar
                ? "عرض حسابات الفريق وصلاحياتها الحالية. معرّف المستخدم هو معرّفه الحقيقي؛ إدارة الدعوات غير متاحة هنا بعد."
                : "Read-only staff roles and MFA enrollment. User IDs are real account identifiers; invitations are not available here yet."
              : source === "promotions"
                ? ar
                  ? "أسعار المقارنة المحفوظة للمتغيرات النشطة. افتح المنتج لتعديل العرض."
                  : "Saved compare-at prices for active variants. Open a product to edit its offer."
                : ar
                  ? "أحداث محفوظة فعلًا، حسب صلاحيات حسابك."
                  : "Persisted events visible to your account."}
          </p>
          <div className="flex flex-wrap gap-2">
            {path === "/dashboard/activity" && (
              <select
                aria-label={ar ? "مصدر السجل" : "Activity source"}
                className={button}
                value={auditSource}
                onChange={(e) => {
                  setAuditSource(e.target.value as "catalog" | "cms");
                  setPage(0);
                }}
              >
                <option value="catalog">{ar ? "الكتالوج" : "Catalog"}</option>
                <option value="cms">{ar ? "محتوى الموقع" : "Site content"}</option>
              </select>
            )}
            <button className={button} disabled={loading} onClick={() => setReload((n) => n + 1)}>
              {ar ? "تحديث" : "Refresh"}
            </button>
          </div>
          {loading ? (
            <p role="status">{ar ? "جارٍ التحميل…" : "Loading…"}</p>
          ) : error ? (
            <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">
              {error}
            </p>
          ) : rows.length ? (
            <ul className="divide-y rounded-2xl border border-slate-200 bg-white">
              {rows.map((row) => (
                <li key={row.id} className="p-4 space-y-1 break-words">
                  <div className="font-semibold">
                    {row.href ? (
                      <Link className="text-indigo-600" href={row.href}>
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{row.detail}</p>
                  <time className="text-xs text-slate-400" dateTime={row.date}>
                    {new Date(row.date).toLocaleString(ar ? "ar-LB" : "en-US")}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border bg-white p-6">
              {ar ? "لا توجد سجلات في هذه الصفحة." : "No records on this page."}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              className={button}
              disabled={loading || page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              {ar ? "السابق" : "Previous"}
            </button>
            <span>{page + 1}</span>
            <button
              className={button}
              disabled={loading || Boolean(error) || !hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              {ar ? "التالي" : "Next"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
