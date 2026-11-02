import DashboardCommandCenter from "@/dashboard/components/layout/DashboardCommandCenter";
import { useDashboardIdentity } from "@/dashboard/contexts/DashboardIdentityContext";
import { navSections } from "@/dashboard/config/navigation";
import { signOutDashboard } from "@/dashboard/data/catalog";
import { useLanguage } from "@/dashboard/i18n";
import { useTheme } from "@/dashboard/contexts/ThemeContext";
import { useDashboardAuth0 } from "@/dashboard/security/Auth0DashboardSecurity";
import {
  ChevronDown,
  FileText,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  Settings2,
  Sun,
} from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLocation } from "wouter";

export default function Header({ onMenu }: { onMenu: () => void }) {
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { enabled: auth0Enabled, logoutAuth0 } = useDashboardAuth0();
  const [profileOpen, setProfileOpen] = useState(false);
  const [location, navigate] = useLocation();
  const identity = useDashboardIdentity();
  const profileRef = useRef<HTMLDivElement>(null);
  const activeRoute = navSections.flatMap((section) => section.items)
    .filter((item) => location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href + "/")))
    .sort((first, second) => second.href.length - first.href.length)[0];
  useEffect(() => {
    if (!profileOpen) return;
    profileRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const close = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [profileOpen]);
  const profileKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
    items[next]?.focus();
  };
  return (
    <header className="dashboard-header dashboard-commandbar sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-3 border-b border-border/80 bg-background/95 px-3 py-2 backdrop-blur-md sm:h-[74px] sm:px-6 sm:py-0 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          className="dashboard-menu-trigger dashboard-icon-button dashboard-icon-button-lg grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground lg:hidden"
          aria-label={t("Open dashboard menu")}
        >
          <Menu className="size-5" />
        </button>
        <div className="dashboard-header-location hidden min-w-0 shrink-0 items-center gap-2.5 lg:flex">
          <span className="dashboard-header-location-brand">Space Call</span>
          <span aria-hidden="true" className="dashboard-header-separator" />
          <span className="max-w-[11rem] truncate text-sm font-semibold text-foreground">{t(activeRoute?.label ?? "Dashboard")}</span>
        </div>
        <div className="dashboard-header-search min-w-0 flex-1"><DashboardCommandCenter /></div>
      </div>
      <div className="dashboard-header-actions flex shrink-0 items-center gap-1 sm:gap-2.5">
        <button
          onClick={() => navigate("/dashboard/activity")}
          className="dashboard-icon-button dashboard-toolbar-button hidden size-10 place-items-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-foreground sm:grid"
          aria-label={t("Activity logs")}
          title={t("Activity logs")}
        >
          <FileText className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="dashboard-icon-button dashboard-toolbar-button grid size-10 place-items-center rounded-lg border border-transparent text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground active:scale-95"
          aria-label={theme === "dark" ? t("Switch to light mode") : t("Switch to dark mode")}
          aria-pressed={theme === "dark"}
          title={theme === "dark" ? t("Switch to light mode") : t("Switch to dark mode")}
        >
          {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>
        <div className="hidden h-8 w-px bg-border sm:block" />
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="dashboard-compact-control dashboard-lang-switch min-h-9 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-primary"
          title={lang === "en" ? "العربية" : t("English")}
        >
          {lang === "en" ? t("AR") : t("EN")}
        </button>

        <div
          className="relative"
          ref={profileRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false);
          }}
        >
          <button
            onClick={() => setProfileOpen((current) => !current)}
            className="dashboard-account-trigger flex items-center gap-2 rounded-lg p-1.5 pe-2 transition-colors hover:bg-muted"
            aria-label={t("Account menu")}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setProfileOpen(true);
              }
            }}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <div className="dashboard-account-avatar grid size-9 place-items-center rounded-lg text-[11px] font-bold ring-2 ring-background">
              {identity.name.slice(0, 2).toUpperCase() || "…"}
            </div>
            <div className="hidden text-start sm:block">
              <div className="text-[12px] font-bold text-foreground">
                {identity.loading ? t("Loading…") : identity.name}
              </div>
              <div className="text-[10px] font-medium text-muted-foreground">
                {identity.role
                  ? t(identity.role === "admin" ? "Administrator" : "Editor")
                  : t("Staff")}
              </div>
            </div>
            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
          </button>

          {profileOpen && (
            <div
              className="absolute end-0 top-[calc(100%+8px)] w-48 rounded-xl border border-border bg-popover p-2 text-start text-popover-foreground shadow-card"
              role="menu"
              aria-label={t("Account menu")}
              onKeyDown={profileKeyboard}
            >
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/dashboard/security");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                role="menuitem"
              >
                <LockKeyhole className="size-3.5" /> {t("Security")}
              </button>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/dashboard/settings");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                role="menuitem"
              >
                <Settings2 className="size-3.5" /> {t("Settings")}
              </button>
              <button
                onClick={async () => {
                  setProfileOpen(false);
                  await signOutDashboard().catch(() => undefined);
                  if (auth0Enabled) {
                    await logoutAuth0();
                    return;
                  }
                  navigate("/dashboard/login");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                role="menuitem"
              >
                <LogOut className="size-3.5" /> {t("Sign out")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
