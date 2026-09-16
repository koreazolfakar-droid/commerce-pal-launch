import { Bell, Languages, Menu } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalDashboardSearch } from "@/dashboard/components/GlobalDashboardSearch";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export function DashboardHeader({
  email,
  role,
  onOpenMobileNav,
}: {
  email: string;
  role: "admin" | "editor";
  onOpenMobileNav: () => void;
}) {
  const { language, toggleLanguage, text } = useDashboardLanguage();
  const initial = (email.trim().charAt(0) || "S").toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-border/70 dark:bg-background/94">
      <div className="flex min-h-[68px] items-center gap-3 px-4 sm:px-5 lg:px-6 xl:px-7">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-card text-muted-foreground transition hover:bg-muted lg:hidden"
          aria-label={text("فتح قائمة لوحة التحكم", "Open dashboard menu")}
        >
          <Menu className="size-5" />
        </button>

        <div className="hidden flex-1 md:block">
          <GlobalDashboardSearch />
        </div>

        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="relative grid size-9 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-border/70 dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
            aria-label={text("الإشعارات", "Notifications")}
            title={text("الإشعارات", "Notifications")}
          >
            <Bell className="size-4" />
            <span className="absolute end-[8px] top-[7px] size-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-card" />
          </button>

          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 text-[10px] font-black text-slate-600 transition hover:bg-slate-50 dark:border-border/70 dark:bg-card dark:text-foreground dark:hover:bg-muted"
            aria-label={text("تغيير لغة لوحة التحكم", "Change dashboard language")}
          >
            <Languages className="size-3.5" />
            <span>{language === "ar" ? "EN" : "عربي"}</span>
          </button>

          <ThemeToggle className="border border-slate-200/80 bg-white shadow-none hover:bg-slate-50 dark:border-border/70 dark:bg-card dark:hover:bg-muted" />

          <div className="ms-1 hidden items-center gap-2.5 border-s border-slate-200/80 ps-3 sm:flex dark:border-border/70">
            <span className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-black text-white dark:bg-primary">
              {initial}
            </span>
            <div className="hidden min-w-0 xl:block">
              <p className="max-w-40 truncate text-[11px] font-black text-slate-900 dark:text-foreground">
                {role === "admin" ? "Admin" : "Editor"}
              </p>
              <p className="max-w-40 truncate text-[9px] text-slate-500 dark:text-muted-foreground">
                {role === "admin" ? text("مدير المتجر", "Store Manager") : text("محرر المحتوى", "Content Editor")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-2 md:hidden dark:border-border/50">
        <GlobalDashboardSearch />
      </div>
    </header>
  );
}
