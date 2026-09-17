import { Languages, Menu } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardNotifications } from "@/dashboard/components/DashboardNotifications";
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
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur-xl">
      <div className="flex min-h-[68px] items-center gap-3 px-4 sm:px-5 lg:px-6 xl:px-7">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
          aria-label={text("فتح قائمة لوحة التحكم", "Open dashboard menu")}
        >
          <Menu className="size-5" />
        </button>

        <div className="hidden flex-1 md:block">
          <GlobalDashboardSearch />
        </div>

        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <DashboardNotifications />

          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-card px-2.5 text-[10px] font-black text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={text("تغيير لغة لوحة التحكم", "Change dashboard language")}
          >
            <Languages className="size-3.5" />
            <span>{language === "ar" ? "EN" : "عربي"}</span>
          </button>

          <ThemeToggle className="border border-border/70 bg-card shadow-none hover:bg-muted" />

          <div className="ms-1 hidden items-center gap-2.5 border-s border-border/70 ps-3 sm:flex">
            <span className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-black text-background dark:bg-primary dark:text-primary-foreground">
              {initial}
            </span>
            <div className="hidden min-w-0 xl:block">
              <p className="max-w-40 truncate text-[11px] font-black text-foreground">
                {role === "admin" ? "Admin" : "Editor"}
              </p>
              <p className="max-w-40 truncate text-[9px] text-muted-foreground">
                {role === "admin"
                  ? text("مدير المتجر", "Store Manager")
                  : text("محرر المحتوى", "Content Editor")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-2 md:hidden">
        <GlobalDashboardSearch />
      </div>
    </header>
  );
}
