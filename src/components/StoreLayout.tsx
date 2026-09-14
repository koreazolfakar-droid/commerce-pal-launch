import { type CSSProperties, type ReactNode } from "react";
import { Hydrate } from "@tanstack/react-start";
import { media, visible } from "@tanstack/react-start/hydration";
import { useRouterState } from "@tanstack/react-router";

import { BottomNav, MOBILE_NAV_HEIGHT } from "@/components/BottomNav";
import { GlobalCartDrawer } from "@/components/GlobalCartDrawer";
import { MobileTopBar } from "@/components/MobileTopBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "../dark-black.css";
import "../ui-overhaul.css";
import "../design-consistency.css";

/** Shared store chrome: desktop header, mobile app bar, footer and bottom nav. */
export function StoreLayout({ children }: { children: ReactNode }) {
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

      {/*
       * Keep the desktop header's final 136px footprint reserved before the
       * media-gated client shell hydrates. Without this reservation the main
       * content starts at y=0 and is pushed down to y=136 after hydration,
       * which is the entire desktop CLS event reported by Lighthouse.
       */}
      <div className="hidden min-h-[136px] lg:block">
        <Hydrate when={media("(min-width: 1024px)")}>
          <SiteHeader />
        </Hydrate>
      </div>
      <Hydrate when={media("(max-width: 1023px)")}>
        <MobileTopBar showCategoryRail={!onHomePage && !onCartPage} />
      </Hydrate>

      <main id="main-content" tabIndex={-1} className={onCartPage ? "min-w-0" : "min-w-0 flex-1"}>
        {children}
      </main>

      <Hydrate when={visible({ rootMargin: "900px" })}>
        <SiteFooter compactTopSpacing={onCartPage} />
      </Hydrate>
      <Hydrate when={media("(max-width: 1023px)")}>
        <BottomNav />
      </Hydrate>

      <GlobalCartDrawer />
    </div>
  );
}
