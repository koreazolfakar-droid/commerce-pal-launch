import DashboardConnectivity from "@/dashboard/components/layout/DashboardConnectivity";
import DashboardErrorBoundary from "@/dashboard/components/ErrorBoundary";
import DashboardSectionLinks from "@/dashboard/components/layout/DashboardSectionLinks";
import Sidebar from "@/dashboard/components/layout/DashboardSidebar";
import Header from "@/dashboard/components/layout/DashboardHeader";
import MobileBottomNav from "@/dashboard/components/layout/DashboardMobileNav";
import DashboardRouteFallback from "@/dashboard/components/layout/DashboardRouteFallback";
import "@/dashboard/workspace.css";
import "@/dashboard/components/layout/SidebarPolish.css";
import { DashboardIdentityProvider } from "@/dashboard/contexts/DashboardIdentityContext";
import { installDashboardNavigationGuard } from "@/dashboard/lib/unsavedChanges";
import { readPreference, writePreference } from "@/dashboard/lib/preferenceStorage";
import {
  DASHBOARD_AUTH_REQUIRED_EVENT,
  getDashboardMfaStatus,
  signOutDashboard,
} from "@/dashboard/data/catalog";
import { LanguageContext, useLanguage, translations } from "@/dashboard/i18n";
import { useTheme } from "@/dashboard/contexts/ThemeContext";
import {
  DashboardLoginPage,
  resolveDashboardRoute,
} from "@/dashboard/config/routes";
import { Loader2 } from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
} from "react";
import { Toaster, toast } from "sonner";
import { Route, Switch, useLocation } from "wouter";

const DASHBOARD_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

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
