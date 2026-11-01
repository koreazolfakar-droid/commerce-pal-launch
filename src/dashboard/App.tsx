import DashboardCommandCenter from "@/dashboard/components/layout/DashboardCommandCenter";
import { unavailableDashboardRoutes } from "@/dashboard/config/capabilities";
import DashboardConnectivity from "@/dashboard/components/layout/DashboardConnectivity";
import DashboardErrorBoundary from "@/dashboard/components/ErrorBoundary";
import DashboardSectionLinks from "@/dashboard/components/layout/DashboardSectionLinks";
import "@/dashboard/workspace.css";
import {
  DashboardIdentityProvider,
  useDashboardIdentity,
} from "@/dashboard/contexts/DashboardIdentityContext";
import { useDashboardDialogFocus } from "@/dashboard/hooks/useDashboardDialogFocus";
import { confirmDashboardDiscard } from "@/dashboard/lib/unsavedChanges";
import { installDashboardNavigationGuard } from "@/dashboard/lib/unsavedChanges";
import { readPreference, writePreference } from "@/dashboard/lib/preferenceStorage";
import { navSections } from "@/dashboard/config/navigation";
import {
  DASHBOARD_AUTH_REQUIRED_EVENT,
  getDashboardMfaStatus,
  signOutDashboard,
} from "@/dashboard/data/catalog";
import { LanguageContext, useLanguage, translations } from "@/dashboard/i18n";
import { useTheme } from "@/dashboard/contexts/ThemeContext";
import {
  DashboardLoginPage,
  preloadDashboardRoute,
  resolveDashboardRoute,
} from "@/dashboard/config/routes";
import { useDashboardAuth0 } from "@/dashboard/security/Auth0DashboardSecurity";
import { SITE_URL } from "@/lib/storeConfig";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Layers3,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Moon,
  Package,
  PackagePlus,
  PanelsTopLeft,
  SearchCheck,
  Settings2,
  ShoppingBag,
  Star,
  Sun,
  Tags,
  TicketPercent,
  UserCog,
  Users,
  X,
} from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Toaster, toast } from "sonner";
import { Route, Switch, useLocation } from "wouter";

const DASHBOARD_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const iconMap: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  Package,
  PackagePlus,
  Layers3,
  Tags,
  Boxes,
  Users,
  PanelsTopLeft,
  Image: ImageIcon,
  Badge: Star,
  Menu,
  BadgePercent: TicketPercent,
  Megaphone,
  TicketPercent,
  SearchCheck,
  ChartNoAxesCombined: BarChart3,
  Mail,
  Star,
  FolderOpen,
  UserCog,
  ScrollText: FileText,
  Settings2,
  LockKeyhole,
};

function Logo() {
  return (
    <div className="dashboard-brand flex min-w-0 items-center gap-3">
      <div className="dashboard-brand-mark grid size-11 shrink-0 place-items-center rounded-xl" aria-hidden="true">
        <span>SC</span>
      </div>
      <div className="min-w-0">
        <div className="dashboard-brand-name truncate">Space Call<span className="dashboard-brand-dot">.</span></div>
        <div className="dashboard-brand-caption truncate">COMMAND WORKSPACE</div>
      </div>
    </div>
  );
}

function Sidebar({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const { t, lang } = useLanguage();
  const [location, navigate] = useLocation();
  const identity = useDashboardIdentity();
  const sidebarRef = useRef<HTMLElement>(null);
  useDashboardDialogFocus(mobileOpen, sidebarRef, () => setMobileOpen(false));
  const [smallSidebar, setSmallSidebar] = useState(false);
  const [closedSections, setClosedSections] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(readPreference("dashboard:closed-sections") ?? "[]");
      if (Array.isArray(saved)) setClosedSections(saved.filter((v) => typeof v === "string"));
    } catch {
      /* ignore malformed preference */
    }
  }, []);
  const toggleSection = (label: string) =>
    setClosedSections((current) => {
      const next = current.includes(label)
        ? current.filter((v) => v !== label)
        : [...current, label];
      writePreference("dashboard:closed-sections", JSON.stringify(next));
      return next;
    });
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setSmallSidebar(media.matches);
      if (!media.matches) setMobileOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [setMobileOpen]);
  const items = navSections.flatMap((section) => section.items);
  const activeHref = location.startsWith("/dashboard/receivings/")
    ? "/dashboard/receiving"
    : items
        .filter(
          (item) =>
            location === item.href ||
            (item.href !== "/dashboard" && location.startsWith(item.href + "/")),
        )
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const isActive = (href: string) => href === activeHref;

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      {mobileOpen && (
        <button
          aria-label={t("Close menu")}
          onClick={() => setMobileOpen(false)}
          className="dashboard-navigation-backdrop fixed inset-0 z-40 touch-none bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
        />
      )}
      <aside
        ref={sidebarRef}
        id="dashboard-sidebar-navigation"
        inert={smallSidebar && !mobileOpen ? true : undefined}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={t("Navigation")}
        tabIndex={-1}
        className={`dashboard-sidebar fixed inset-y-0 start-0 z-50 flex w-[min(90vw,336px)] flex-col overscroll-contain pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-white transition-transform duration-200 ${mobileOpen ? "translate-x-0" : lang === "ar" ? "translate-x-full" : "-translate-x-full"}`}
      >
        <div className="dashboard-sidebar-brand flex min-h-[88px] items-center justify-between gap-3 px-5">
          <Logo />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t("Close navigation")}
            className="dashboard-sidebar-close grid size-10 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav aria-label={t("Workspace navigation")} className="dashboard-sidebar-scroll flex-1 overflow-y-auto overscroll-contain px-3 py-4 scrollbar-none lg:py-5">
          {navSections.map((section) => (
            <section key={section.label} className="dashboard-sidebar-group mb-5">
              <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  aria-expanded={!closedSections.includes(section.label)}
                  className="dashboard-sidebar-section mb-2 flex min-h-9 w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-400 hover:text-white"
                >
                  <span>{t(section.label)}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-3.5 transition-transform duration-150 ${closedSections.includes(section.label) ? "-rotate-90" : ""}`}
                  />
                </button>
              <div className="dashboard-sidebar-items space-y-1">
                {section.items
                  .filter((item) => !unavailableDashboardRoutes.has(item.href))
                  .filter((item) => !closedSections.includes(section.label) || item.href === activeHref)
                  .filter((item) => item.href !== "/dashboard/users" || identity.role === "admin")
                  .map((item) => {
                    const Icon = iconMap[item.icon] ?? LayoutDashboard;
                    const active = isActive(item.href);
                    return (
                      <button
                        key={item.href}
                        aria-label={t(item.label)}
                        aria-current={active ? "page" : undefined}
                        onMouseEnter={() => void preloadDashboardRoute(item.href)}
                        onFocus={() => void preloadDashboardRoute(item.href)}
                        onTouchStart={() => void preloadDashboardRoute(item.href)}
                        onClick={() => {
                          void preloadDashboardRoute(item.href);
                          navigate(item.href);
                          setMobileOpen(false);
                        }}
                        className="dashboard-sidebar-action group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-[13px] font-medium transition-colors duration-150"
                      >
                        <Icon
                          className="dashboard-sidebar-item-icon size-[18px] shrink-0"
                          strokeWidth={1.8}
                        />
                        <>
                          <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
                            {[
                              "/dashboard/marketing",
                              "/dashboard/coupons",
                              "/dashboard/messages",
                              "/dashboard/reviews",
                            ].includes(item.href) ? (
                              <span className="dashboard-sidebar-status ms-auto rounded px-1.5 py-0.5 text-[10px]">
                                {t("Not connected")}
                              </span>
                            ) : null}
                        </>
                      </button>
                    );
                  })}
              </div>
            </section>
          ))}
        </nav>
        <div className="dashboard-sidebar-footer p-3">
          <div className="dashboard-sidebar-shortcuts mb-3 space-y-1">
              <button
                type="button"
                onClick={() => {
                  void preloadDashboardRoute("/dashboard/products/new");
                  navigate("/dashboard/products/new");
                  setMobileOpen(false);
                }}
                className="dashboard-sidebar-new-product flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] font-semibold"
              >
                <PackagePlus className="size-[18px]" strokeWidth={1.8} />
                <span className="flex-1 text-start">{t("Quick product")}</span>
                <span aria-hidden="true">+</span>
              </button>
              <button
                type="button"
                onClick={() => window.open(SITE_URL, "_blank", "noopener,noreferrer")}
                className="dashboard-sidebar-store flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-[12px] font-medium"
              >
                <ExternalLink className="size-4" />
                <span className="flex-1 text-start">{t("Open store")}</span>
              </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
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

function MobileBottomNav({ onMore, open }: { onMore: () => void; open: boolean }) {
  const { t } = useLanguage();
  const [location, navigate] = useLocation();
  const items = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
    { label: "Products", href: "/dashboard/products", icon: Package },
    { label: "Add", href: "/dashboard/products/new", icon: PackagePlus },
  ];

  return (
    <nav
      className="dashboard-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-border/90 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(15,23,42,.08)] backdrop-blur-lg lg:hidden"
      aria-label="Dashboard mobile navigation"
    >
      <div className="dashboard-mobile-nav-grid grid min-h-[68px] grid-cols-5">
        {items.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? location === href || location === "/dashboard/"
              : href === "/dashboard/products"
                ? location.startsWith(href) && !location.startsWith("/dashboard/products/new")
                : location.startsWith(href);
          return (
            <button
              key={href}
              type="button"
              onTouchStart={() => void preloadDashboardRoute(href)}
              onClick={() => {
                void preloadDashboardRoute(href);
                navigate(href);
              }}
              className={`dashboard-mobile-nav-item flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium ${active ? "is-active text-primary" : "text-muted-foreground"} ${href === "/dashboard/products/new" ? "dashboard-mobile-nav-create" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`dashboard-mobile-nav-icon grid size-9 place-items-center rounded-xl ${active ? "bg-accent" : ""}`}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              </span>
              <span className="max-w-full truncate">{t(label)}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-controls="dashboard-sidebar-navigation"
          aria-expanded={open}
          className={`dashboard-mobile-nav-item flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium ${open ? "is-active text-primary" : "text-muted-foreground"}`}
        >
          <span className="dashboard-mobile-nav-icon grid size-9 place-items-center rounded-xl">
            <Menu className="size-[18px]" />
          </span>
          <span>{t("More")}</span>
        </button>
      </div>
    </nav>
  );
}

function DashboardRouteFallback() {
  return (
    <div
      className="dashboard-route-skeleton min-h-[360px] space-y-6 rounded-2xl border border-border bg-card/70 p-5 sm:p-7"
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard page"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span>Loading dashboard page…</span>
      </div>
      <div aria-hidden="true" className="animate-pulse space-y-6">
        <div className="h-8 w-44 max-w-full rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-24 rounded-xl border border-border bg-muted/70" />
          ))}
        </div>
        <div className="h-52 rounded-xl border border-border bg-muted/70" />
      </div>
    </div>
  );
}

function DashboardGate() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const lastActivityAt = useRef(Date.now());
  const expiringSession = useRef(false);

  const expireDashboardSession = useCallback(async () => {
    if (expiringSession.current) return;
    expiringSession.current = true;
    await signOutDashboard().catch(() => undefined);
    toast.info("Dashboard session expired after 30 minutes of inactivity.");
    navigate("/dashboard/login");
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    getDashboardMfaStatus()
      .then((status) => {
        if (cancelled) return;

        if (status?.ready) {
          lastActivityAt.current = Date.now();
          setState("ready");
          return;
        }

        setState("denied");
        navigate(status ? "/dashboard/login?mode=mfa" : "/dashboard/login");
      })
      .catch(() => {
        if (!cancelled) {
          setState("denied");
          navigate("/dashboard/login");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (state !== "ready") return;

    const redirectForStatus = (status: Awaited<ReturnType<typeof getDashboardMfaStatus>>) => {
      setState("denied");
      navigate(status ? "/dashboard/login?mode=mfa" : "/dashboard/login");
    };

    const handleAuthRequired = () => {
      redirectForStatus(null);
    };

    let revalidating = false;
    const revalidateVisibleSession = async () => {
      if (revalidating || document.visibilityState === "hidden") return;
      if (Date.now() - lastActivityAt.current >= DASHBOARD_IDLE_TIMEOUT_MS) {
        await expireDashboardSession();
        return;
      }

      revalidating = true;
      try {
        const status = await getDashboardMfaStatus();
        if (!status?.ready) redirectForStatus(status);
      } catch {
        // A temporary network failure should not sign the user out. Protected
        // data calls still fail closed, and a real auth loss emits the event above.
      } finally {
        revalidating = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void revalidateVisibleSession();
    };

    window.addEventListener(DASHBOARD_AUTH_REQUIRED_EVENT, handleAuthRequired);
    window.addEventListener("focus", revalidateVisibleSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(DASHBOARD_AUTH_REQUIRED_EVENT, handleAuthRequired);
      window.removeEventListener("focus", revalidateVisibleSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [expireDashboardSession, navigate, state]);

  useEffect(() => {
    if (state !== "ready") return;

    let timeoutId = window.setTimeout(() => undefined, DASHBOARD_IDLE_TIMEOUT_MS);

    const reset = () => {
      lastActivityAt.current = Date.now();
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => void expireDashboardSession(), DASHBOARD_IDLE_TIMEOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
    events.forEach((eventName) => window.addEventListener(eventName, reset, { passive: true }));
    reset();

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((eventName) => window.removeEventListener(eventName, reset));
    };
  }, [expireDashboardSession, state]);

  if (state !== "ready") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        {state === "loading" ? <Loader2 className="size-6 animate-spin text-[#5968ea]" /> : null}
      </div>
    );
  }
  return (
    <DashboardIdentityProvider>
      <DashboardLayout />
    </DashboardIdentityProvider>
  );
}

function DashboardLayout() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const route = location.replace(/\/$/, "") || "/dashboard";
  const content = resolveDashboardRoute(route);
  return (
    <div className="dashboard-theme-scope min-h-screen min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <a href="#dashboard-main" className="dashboard-skip-link">
        {t("Skip to content")}
      </a>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div
        inert={mobileOpen ? true : undefined}
        className="dashboard-desktop-content min-h-screen min-h-[100dvh] min-w-0"
      >
        <Header onMenu={() => setMobileOpen(true)} />
        <DashboardConnectivity />
        <main
          id="dashboard-main"
          tabIndex={-1}
          className="dashboard-main mx-auto min-w-0 max-w-[1520px] p-3 pb-24 sm:p-6 sm:pb-24 lg:p-9"
        >
          <DashboardSectionLinks />
          <DashboardErrorBoundary key={route}>
            <Suspense fallback={<DashboardRouteFallback />}>{content}</Suspense>
          </DashboardErrorBoundary>
        </main>
        <MobileBottomNav onMore={() => setMobileOpen(true)} open={mobileOpen} />
      </div>
    </div>
  );
}

export default function App() {
  const { theme } = useTheme();
  useInsertionEffect(() => installDashboardNavigationGuard(), []);
  const [lang, setLang] = useState<"en" | "ar">(() =>
    readPreference("spacecall-language") === "ar" ? "ar" : "en",
  );
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    writePreference("spacecall-language", lang);
  }, [lang]);
  const t = useCallback((key: string) => translations[lang][key] || key, [lang]);
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <>
        <Switch>
          <Route path="/dashboard/login">
            {() => (
              <Suspense fallback={<div className="min-h-screen bg-background" />}>
                <DashboardLoginPage />
              </Suspense>
            )}
          </Route>
          <Route component={DashboardGate} />
        </Switch>
        <Toaster position="bottom-right" richColors theme={theme} />
      </>
    </LanguageContext.Provider>
  );
}
