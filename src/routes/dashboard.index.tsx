import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

const CARDS = [
  { to: "/dashboard/hero", title: "صور الهيرو", text: "أضف وبدّل صور الواجهة وروابطها." },
  { to: "/dashboard/sections", title: "أقسام الصفحة", text: "عناوين وترتيب وإظهار الأقسام." },
  {
    to: "/dashboard/navigation",
    title: "القوائم والأيقونات",
    text: "عناصر الهيدر والفوتر والجوال.",
  },
  { to: "/dashboard/brands", title: "البراندات", text: "الأسماء والشعارات والروابط." },
  { to: "/dashboard/seo", title: "SEO", text: "عناوين ووصف الصفحات وصور المشاركة." },
  { to: "/dashboard/settings", title: "الإعدادات", text: "اسم المتجر، واتساب، الشعار…" },
] as const;

function DashboardOverview() {
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-foreground">نظرة عامة</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          تحكّم بمحتوى الموقع من مكان واحد. التغييرات تظهر في الموقع بعد التحديث.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/50 hover:shadow"
          >
            <h2 className="text-sm font-semibold text-foreground">{card.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{card.text}</p>
          </Link>
        ))}
      </div>

      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        تعديل المنتجات والأسعار يحتاج مفتاح Shopify Admin API. المفتاح الحالي للقراءة فقط، لذلك
        المنتجات تُدار حالياً من Shopify مباشرة.
      </p>
    </section>
  );
}
