import { lazy, Suspense, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

import { BottomNav } from "@/components/BottomNav";
import { MobileTopBar } from "@/components/MobileTopBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";
import "../ux-polish.css";
import "../ux-welcome.css";
import "../dark-black.css";
import "../ui-overhaul.css";

const AIAssistant = lazy(() =>
  import("@/components/AIAssistant").then((module) => ({ default: module.AIAssistant })),
);

/** Shared store chrome: desktop header, mobile app bar, footer and bottom nav. */
export function StoreLayout({ children, aiContext }: { children: ReactNode; aiContext?: string }) {
  const onHomePage = useRouterState({ select: (state) => state.location.pathname === "/" });
  const onProductPage = useRouterState({
    select: (state) => state.location.pathname.startsWith("/product/"),
  });
  return (
    <div
      className="store-layout flex min-h-screen min-w-0 flex-col bg-background"
      data-product-page={onProductPage}
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
      <MobileTopBar showCategoryRail={!onHomePage} />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
        {children}
      </main>
      <SiteFooter />
      <WhatsAppCTA />
      <Suspense fallback={null}>
        <AIAssistant {...(aiContext ? { context: aiContext } : {})} />
      </Suspense>
      <BottomNav />
    </div>
  );
}
