import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

import { BottomNav, MOBILE_NAV_HEIGHT } from "@/components/BottomNav";
import { MobileTopBar } from "@/components/MobileTopBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "../dark-black.css";
import "../ui-overhaul.css";
import "../design-consistency.css";

type AdvisorComponent = typeof import("@/components/SmartPhoneAdvisor").SmartPhoneAdvisor;

// Keep the chat module and restored recommendation queries off the initial load.
function OnDemandAdvisor({ context }: { context?: string }) {
  const [Advisor, setAdvisor] = useState<AdvisorComponent | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const promptRef = useRef("");
  const loadingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const openAdvisor = () => {
    if (loadingRef.current || Advisor) return;
    loadingRef.current = true;
    setLoading(true);
    setFailed(false);
    void import("@/components/SmartPhoneAdvisor")
      .then((module) => {
        if (mountedRef.current) setAdvisor(() => module.SmartPhoneAdvisor);
      })
      .catch(() => {
        if (mountedRef.current) setFailed(true);
      })
      .finally(() => {
        loadingRef.current = false;
        if (mountedRef.current) setLoading(false);
      });
  };

  useEffect(() => {
    if (Advisor) return;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      if (detail?.prompt) promptRef.current = detail.prompt;
      openAdvisor();
    };
    window.addEventListener("spacecall:open-ai", listener);
    return () => window.removeEventListener("spacecall:open-ai", listener);
  });

  if (Advisor) {
    return <Advisor context={context} initialOpen initialPrompt={promptRef.current} />;
  }

  return (
    <button
      type="button"
      aria-label={failed ? "Retry opening Space Call AI" : "Open Space Call AI"}
      aria-busy={loading}
      disabled={loading}
      onClick={openAdvisor}
      className="group fixed bottom-[calc(var(--mobile-nav-height)+14px)] right-4 z-40 inline-flex h-12 w-12 items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary px-0 text-primary-foreground shadow-float transition-[transform,box-shadow,width] duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 sm:right-5 sm:w-auto sm:rounded-full sm:px-4 lg:bottom-6 lg:right-6"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
      <span className="hidden text-sm font-extrabold sm:inline" aria-live="polite">
        {failed ? "Retry Space Call AI" : "Space Call AI"}
      </span>
    </button>
  );
}

/** Shared store chrome: desktop header, mobile app bar, footer and bottom nav. */
export function StoreLayout({ children, aiContext }: { children: ReactNode; aiContext?: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onHomePage = pathname === "/";
  const onCartPage = pathname === "/cart";
  const onProductPage = pathname.startsWith("/product/");
  const mobileNavStyle = {
    "--mobile-nav-height": MOBILE_NAV_HEIGHT,
  } as CSSProperties;

  return (
    <div
      className="store-layout flex min-h-screen min-w-0 flex-col bg-background"
      data-product-page={onProductPage}
      data-cart-page={onCartPage}
      style={mobileNavStyle}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:p-3"
      >
        Skip to content
      </a>
      <div className="hidden lg:block">
        <SiteHeader />
      </div>
      <MobileTopBar showCategoryRail={!onHomePage && !onCartPage} />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
        {children}
      </main>
      <SiteFooter />
      <OnDemandAdvisor {...(aiContext ? { context: aiContext } : {})} />
      <BottomNav />
    </div>
  );
}
