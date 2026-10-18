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
  searchDashboardProducts,
  signOutDashboard,
  type DashboardProductSearchItem,
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
  Command,
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
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  Search,
  SearchCheck,
  Settings2,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Tags,
  TicketPercent,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useInsertionEffect, useRef, useState } from "react";
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

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? "justify-center" : ""}`}>
      <div className="relative grid size-10 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#5c6bff] via-[#4c48d8] to-[#8c52d9] shadow-[0_10px_24px_rgba(86,77,223,.35)]">
        <div className="absolute h-[22px] w-[30px] -rotate-[28deg] rounded-[50%] border-[3px] border-white/90" />
        <div className="absolute h-2.5 w-2.5 translate-x-2 -translate-y-2 rounded-full bg-[#56b7ff]" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="text-[15px] font-bold tracking-[-.03em] text-white">Space Call</div>
          <div className="mt-0.5 whitespace-nowrap text-[9px] font-medium uppercase tracking-[.18em] text-slate-400">
            Tech for a better tomorrow
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
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
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => {
      setSmallSidebar(media.matches);
      if (!media.matches) setMobileOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [setMobileOpen]);
  const items = navSections.flatMap((section) => section.items);
  const activeHref = items
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
          className="fixed inset-0 z-40 touch-none bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
        />
      )}
      <aside
        ref={sidebarRef}
        inert={smallSidebar && !mobileOpen ? true : undefined}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={t("Navigation")}
        tabIndex={-1}
        className={`fixed inset-y-0 start-0 z-50 flex w-[min(86vw,320px)] flex-col overscroll-contain bg-[#101b32] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-white shadow-xl transition-transform duration-200 lg:w-[260px] lg:translate-x-0 lg:py-0 ${collapsed ? "lg:w-[82px]" : ""} ${mobileOpen ? "translate-x-0" : lang === "ar" ? "translate-x-full" : "-translate-x-full"}`}
      >
        <div
          className={`flex h-[76px] items-center border-b border-white/[.07] px-5 lg:h-[92px] ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
        >
          <Logo compact={collapsed && !mobileOpen} />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 scrollbar-none lg:py-5">
          {navSections.map((section) => (
            <div key={section.label} className="mb-6">
              {(!collapsed || mobileOpen) && (
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  aria-expanded={!closedSections.includes(section.label)}
                  className="mb-2 flex w-full items-center justify-between rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500 hover:text-slate-300"
                >
                  <span>{t(section.label)}</span>
                  <span
                    aria-hidden
                    className={`text-[11px] transition-transform ${closedSections.includes(section.label) ? "-rotate-90" : ""}`}
                  >
                    ▾
                  </span>
                </button>
              )}
              <div className="space-y-1">
                {section.items
                  .filter(
                    (item) =>
                      collapsed && !mobileOpen
                        ? true
                        : !closedSections.includes(section.label) || item.href === activeHref,
                  )
                  .filter((item) => item.href !== "/dashboard/users" || identity.role === "admin")
                  .map((item) => {
                    const Icon = iconMap[item.icon] ?? LayoutDashboard;
                    const active = isActive(item.href);
                    return (
                      <button
                        key={item.href}
                        title={collapsed ? t(item.label) : undefined}
                        aria-current={active ? "page" : undefined}
                        onMouseEnter={() => void preloadDashboardRoute(item.href)}
                        onFocus={() => void preloadDashboardRoute(item.href)}
                        onTouchStart={() => void preloadDashboardRoute(item.href)}
                        onClick={() => {
                          void preloadDashboardRoute(item.href);
                          navigate(item.href);
                          setMobileOpen(false);
                        }}
                        className={`dashboard-sidebar-action group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[13px] font-medium transition active:scale-[.99] lg:py-2.5 ${collapsed ? "lg:justify-center" : ""} ${active ? "bg-[#5361ef] text-white shadow-[0_4px_14px_rgba(83,97,239,.22)]" : "text-slate-400 hover:bg-white/[.07] hover:text-white"}`}
                      >
                        <Icon
                          className={`size-[17px] shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-200"}`}
                          strokeWidth={1.8}
                        />
                        {(!collapsed || mobileOpen) && (
                          <>
                            <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
                            {[
                              "/dashboard/marketing",
                              "/dashboard/coupons",
                              "/dashboard/messages",
                              "/dashboard/reviews",
                            ].includes(item.href) &&
                            (!collapsed || mobileOpen) ? (
                              <span className="ms-auto rounded bg-white/10 px-1.5 py-0.5 text-[9px]">
                                {t("Not connected")}
                              </span>
                            ) : null}
                          </>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[.07] p-4">
          {(!collapsed || mobileOpen) && (
            <div className="mb-3 rounded-xl border border-white/[.08] bg-white/[.05] p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-300">
                <Sparkles className="size-3.5 text-[#8c8aff]" /> {t("Live workspace")}
              </div>
              <p className="mb-3 text-[11px] leading-4 text-slate-500">
                {t("Store management workspace")}
              </p>
              <button
                onClick={() => window.open(SITE_URL, "_blank", "noopener,noreferrer")}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#a8b2ff] hover:text-white"
              >
                {t("View store")} <ExternalLink className="size-3" />
              </button>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] text-slate-500 hover:bg-white/[.06] hover:text-white lg:flex ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? t("Expand sidebar") : t("Collapse sidebar")}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" />
                <span>{t("Collapse sidebar")}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { enabled: auth0Enabled, logoutAuth0 } = useDashboardAuth0();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [, navigate] = useLocation();
  const [headerProducts, setHeaderProducts] = useState<DashboardProductSearchItem[]>([]);
  const [searchIndexLoading, setSearchIndexLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const headerMounted = useRef(true);
  useEffect(() => {
    if (!profileOpen) return;
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
  const identity = useDashboardIdentity();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.matchMedia("(max-width: 639px)").matches) setMobileSearchOpen(true);
        else document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    headerMounted.current = true;
    return () => {
      headerMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setHeaderProducts([]);
      setSearchIndexLoading(false);
      return;
    }

    let cancelled = false;
    setHeaderProducts([]);
    setSearchError(false);
    setSearchIndexLoading(true);
    const timer = window.setTimeout(() => {
      void searchDashboardProducts(normalizedQuery, 5)
        .then((rows) => {
          if (!cancelled && headerMounted.current) setHeaderProducts(rows);
        })
        .catch(() => {
          if (!cancelled && headerMounted.current) {
            setHeaderProducts([]);
            setSearchError(true);
          }
        })
        .finally(() => {
          if (!cancelled && headerMounted.current) setSearchIndexLoading(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const results: DashboardProductSearchItem[] = query.trim().length >= 2 ? headerProducts : [];

  return (
    <header className="dashboard-header sticky top-0 z-30 flex min-h-[64px] flex-wrap items-center justify-between border-b border-border/80 bg-background/95 px-3 py-2 backdrop-blur-md sm:h-[78px] sm:flex-nowrap sm:px-6 sm:py-0 lg:px-10">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={onMenu}
          className="dashboard-icon-button dashboard-icon-button-lg grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition hover:text-foreground active:scale-95 lg:hidden"
          aria-label="Open dashboard menu"
        >
          <Menu className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setMobileSearchOpen((current) => !current)}
          className="dashboard-icon-button dashboard-icon-button-lg grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition hover:text-foreground active:scale-95 sm:hidden"
          aria-label={t("Search products...")}
          aria-expanded={mobileSearchOpen}
        >
          {mobileSearchOpen ? <X className="size-5" /> : <Search className="size-5" />}
        </button>
        <div className="relative hidden max-w-[480px] flex-1 sm:block">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="global-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={t("Search products...")}
            className="h-11 w-full rounded-lg border border-input bg-card ps-10 pe-14 text-[13px] text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <div className="absolute end-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Command className="size-3" />K
          </div>
          {open && query && (
            <div className="absolute inset-x-0 top-[calc(100%+8px)] overflow-hidden rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-card">
              {results.length ? (
                results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setOpen(false);
                      navigate(`/dashboard/products/${item.id}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start hover:bg-muted"
                  >
                    <div className="grid size-8 place-items-center rounded-lg bg-accent text-primary">
                      <Package className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-foreground">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {`${item.brand || t("No brand")} · ${item.category || t("Uncategorized")}`}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  {searchIndexLoading
                    ? t("Loading products…")
                    : searchError
                      ? t("Product search failed. Try again.")
                      : t("No matching Supabase products")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          onClick={() => navigate("/dashboard/activity")}
          className="dashboard-icon-button grid size-10 place-items-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-foreground"
          aria-label={t("Activity logs")}
          title={t("Activity logs")}
        >
          <FileText className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="dashboard-icon-button grid size-10 place-items-center rounded-lg border border-transparent text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground active:scale-95"
          aria-label={theme === "dark" ? t("Switch to light mode") : t("Switch to dark mode")}
          aria-pressed={theme === "dark"}
          title={theme === "dark" ? t("Switch to light mode") : t("Switch to dark mode")}
        >
          {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>
        <div className="hidden h-8 w-px bg-border sm:block" />
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="dashboard-compact-control rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] font-bold text-muted-foreground transition hover:text-primary"
          title={lang === "en" ? "العربية" : t("English")}
        >
          {lang === "en" ? t("AR") : t("EN")}
        </button>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((current) => !current)}
            className="flex items-center gap-2.5 rounded-lg p-1.5 pe-2 transition hover:bg-card"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#f0c5a9] to-[#925f53] text-[11px] font-bold text-white ring-2 ring-background">
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

      {mobileSearchOpen && (
        <div className="order-last w-full pt-2 sm:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-[22px] size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="mobile-global-search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search products...")}
              className="h-11 w-full rounded-lg border border-input bg-card pe-10 ps-10 text-[13px] text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute end-2 top-[22px] grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground active:bg-muted"
                aria-label={t("Clear search")}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          {query ? (
            <div className="mt-2 max-h-[42dvh] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-card">
              {results.length ? (
                results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setQuery("");
                      navigate(`/dashboard/products/${item.id}`);
                    }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start active:bg-muted"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                      <Package className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold text-foreground">
                        {item.name}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{`${item.brand || t("No brand")} · ${item.sku || t("No SKU")}`}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  {searchIndexLoading
                    ? t("Loading products…")
                    : searchError
                      ? t("Product search failed. Try again.")
                      : t("No matching products")}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </header>
  );
}

function MobileBottomNav({ onMore }: { onMore: () => void }) {
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
      className="dashboard-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-border/90 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(15,23,42,.07)] backdrop-blur-md lg:hidden"
      aria-label="Dashboard mobile navigation"
    >
      <div className="grid min-h-[64px] grid-cols-5">
        {items.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? location === href || location === "/dashboard/"
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
              className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold transition active:scale-95 ${active ? "text-primary" : "text-muted-foreground"}`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`grid size-8 place-items-center rounded-lg ${active ? "bg-accent" : ""}`}
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
          className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold text-muted-foreground transition active:scale-95"
        >
          <span className="grid size-8 place-items-center rounded-lg">
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
      className="grid min-h-[360px] place-items-center rounded-2xl border border-border/60 bg-card/40"
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard page"
    >
      <Loader2 className="size-6 animate-spin text-[#5968ea]" />
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
  const { lang } = useLanguage();
  const [collapsed, setCollapsed] = useState(
    () => readPreference("spacecall-sidebar") === "collapsed",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    writePreference("spacecall-sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed]);
  const route = location.replace(/\/$/, "") || "/dashboard";
  const content = resolveDashboardRoute(route);
  return (
    <div className="dashboard-theme-scope min-h-screen min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div
        inert={mobileOpen ? true : undefined}
        className={`min-h-screen min-h-[100dvh] transition-[padding] duration-200 ${collapsed ? (lang === "ar" ? "lg:pr-[82px]" : "lg:pl-[82px]") : lang === "ar" ? "lg:pr-[260px]" : "lg:pl-[260px]"}`}
      >
        <Header onMenu={() => setMobileOpen(true)} />
        <main className="dashboard-main mx-auto min-w-0 max-w-[1600px] p-3 pb-24 sm:p-6 sm:pb-24 lg:p-9">
          <Suspense fallback={<DashboardRouteFallback />}>{content}</Suspense>
        </main>
        <MobileBottomNav onMore={() => setMobileOpen(true)} />
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
  const t = (key: string) => translations[lang][key] || key;
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
