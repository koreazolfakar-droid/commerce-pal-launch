import { Link } from "@tanstack/react-router";
import {
  FolderKanban,
  Image,
  LayoutPanelTop,
  Menu,
  SearchCheck,
  Settings2,
  Tags,
} from "lucide-react";

import { SettingsEditor } from "@/components/admin/SettingsEditor";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

const settingsAreas = [
  {
    to: "/dashboard/hero",
    icon: Image,
    en: "Hero & banners",
    ar: "الهيرو والبنرات",
    descriptionEn: "Homepage hero slides, images and calls to action.",
    descriptionAr: "صور الهيرو والبنرات وروابطها وأزرارها.",
  },
  {
    to: "/dashboard/sections",
    icon: LayoutPanelTop,
    en: "Homepage sections",
    ar: "أقسام الصفحة الرئيسية",
    descriptionEn: "Control homepage content blocks and visibility.",
    descriptionAr: "ترتيب أقسام الصفحة ومحتواها وإظهارها.",
  },
  {
    to: "/dashboard/navigation",
    icon: Menu,
    en: "Menus & icons",
    ar: "القوائم والأيقونات",
    descriptionEn: "Header, footer, mobile navigation and trust items.",
    descriptionAr: "قوائم الهيدر والفوتر والموبايل وعناصر الثقة.",
  },
  {
    to: "/dashboard/seo",
    icon: SearchCheck,
    en: "SEO settings",
    ar: "إعدادات SEO",
    descriptionEn: "Titles, descriptions, canonical URLs and search visibility.",
    descriptionAr: "العناوين والوصف والروابط وظهور الموقع في البحث.",
  },
  {
    to: "/dashboard/brands",
    icon: Tags,
    en: "Brands",
    ar: "البراندات",
    descriptionEn: "Brand names, ordering, logos and visibility.",
    descriptionAr: "أسماء البراندات وترتيبها وشعاراتها وظهورها.",
  },
  {
    to: "/dashboard/collections",
    icon: FolderKanban,
    en: "Collections",
    ar: "المجموعات",
    descriptionEn: "Store collections and product groupings.",
    descriptionAr: "مجموعات المتجر وتجميع المنتجات.",
  },
] as const;

export function SettingsWorkspace() {
  const { language, text } = useDashboardLanguage();

  return (
    <section className="admin-page space-y-5">
      <header className="admin-page-header">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
          {text("مركز الإعدادات", "Settings control center")}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
          {text("إعدادات Space Call", "Space Call settings")}
        </h1>
        <p className="mt-1.5 max-w-3xl text-xs leading-5 text-muted-foreground">
          {text(
            "بدل البحث بين صفحات كثيرة، اختر نوع الإعداد الذي تريد تعديله من هنا ثم انتقل مباشرة إليه.",
            "Choose what you want to configure and jump directly to the right management screen.",
          )}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {settingsAreas.map((area) => {
          const Icon = area.icon;
          return (
            <Link
              key={area.to}
              to={area.to}
              className="group rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black">{language === "ar" ? area.ar : area.en}</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    {language === "ar" ? area.descriptionAr : area.descriptionEn}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-3xl border border-primary/15 bg-primary/[0.035] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-sm font-black">
              {text("الإعدادات العامة والمتقدمة", "General & advanced settings")}
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {text(
                "هوية المتجر، واتساب، شريط الإعلانات، ساعات الدعم، الشحن والقيم العامة تبقى قابلة للتعديل من المحرر أدناه.",
                "Store identity, WhatsApp, announcement bar, support hours, shipping notes and general values remain editable below.",
              )}
            </p>
          </div>
        </div>
      </div>

      <div id="general-settings" className="scroll-mt-24">
        <SettingsEditor />
      </div>
    </section>
  );
}
