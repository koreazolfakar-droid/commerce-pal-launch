import type { CSSProperties, ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

import { BottomNav, MOBILE_NAV_HEIGHT } from "@/components/BottomNav";
import { MobileTopBar } from "@/components/MobileTopBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SmartPhoneAdvisor } from "@/components/SmartPhoneAdvisor";
import "../dark-black.css";
import "../ui-overhaul.css";
import "../design-consistency.css";

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
      <SmartPhoneAdvisor {...(aiContext ? { context: aiContext } : {})} />
      <BottomNav />
    </div>
  );
}
