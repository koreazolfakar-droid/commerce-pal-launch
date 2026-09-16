import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Database,
  ExternalLink,
  Image,
  Layers3,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

const QUICK_ACTIONS = [
  {
    to: "/dashboard/hero",
    title: "صور الهيرو",
    text: "تغيير صور الواجهة والعناوين والروابط.",
    icon: Image,
  },
  {
    to: "/dashboard/sections",
    title: "أقسام الصفحة",
    text: "تعديل العناوين وإظهار وترتيب أقسام الصفحة الرئيسية.",
    icon: Layers3,
  },
  {
    to: "/dashboard/navigation",
    title: "القوائم والأيقونات",
    text: "إدارة روابط وأيقونات الهيدر والفوتر والجوال.",
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
    text: "اسم المتجر وواتساب والشعار وإعدادات الواجهة.",
    icon: Settings,
  },
] as const;

function DashboardOverview() {
  return (
    <section className="space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-bold text-primary">
              <Sparkles className="size-3.5" /> مركز إدارة Space Call
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              كل ما تحتاجه لإدارة واجهة المتجر، بمكان واحد.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              عدّل المحتوى، الأقسام، البراندات وSEO من اللوحة. التغييرات المحفوظة في الـCMS تنتقل
              مباشرة إلى واجهة المتجر.
            </p>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <ExternalLink className="size-4" /> فتح المتجر
          </a>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-foreground">إجراءات سريعة</h2>
            <p className="mt-1 text-xs text-muted-foreground">ادخل مباشرة للقسم الذي تريد تعديله.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK_ACTIONS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.to}
                to={card.to}
                className="group rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" strokeWidth={1.9} />
                  </span>
                  <ArrowLeft className="mt-1 size-4 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
                </div>
                <h3 className="mt-4 text-sm font-black text-foreground">{card.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{card.text}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-foreground">حالة لوحة الإدارة</h2>
              <p className="text-xs text-muted-foreground">المكونات الأساسية جاهزة للعمل.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Database className="size-4 text-primary" /> Supabase CMS
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                المحتوى والصلاحيات مربوطان بقاعدة البيانات.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ShieldCheck className="size-4 text-emerald-500" /> حماية الإدارة
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                الوصول يعتمد على حسابات وصلاحيات Admin / Editor.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="text-sm font-black text-foreground">ملاحظة المنتجات</h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            تعديل المنتجات والأسعار والمخزون ما زال يُدار من Shopify مباشرة. لوحة Space Call الحالية
            مخصصة لمحتوى وتجربة واجهة المتجر وSEO.
          </p>
          <a
            href="https://admin.shopify.com"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
          >
            فتح Shopify Admin <ExternalLink className="size-3.5" />
          </a>
        </section>
      </div>
    </section>
  );
}
