import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, House, Search, ShoppingBag, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { OPEN_SMART_ADVISOR_EVENT } from "@/components/SmartPhoneAdvisor";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import "../mobile-ai-nav.css";

function Count({ value }: { value: number }) {
  if (value <= 0) return null;

  return (
    <span className="absolute -right-2 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#1f6ff2] px-1 text-[9px] font-extrabold leading-none text-white shadow-[0_2px_8px_rgba(31,111,242,.22)] ring-2 ring-white dark:ring-[#10151d]">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Mobile bottom navigation matched to the approved Space Call visual reference. */
export function BottomNav() {
  const navRef = useRef<HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const { t } = useLanguage();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const wishlistCount = useWishlistStore((state) => state.handles.length);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  useEffect(() => {
    const nav = navRef.current;
    const layout = nav?.closest<HTMLElement>(".store-layout");
    if (!nav || !layout) return;

    const measure = () => {
      if (nav.offsetHeight > 0) {
        layout.style.setProperty("--mobile-nav-height", `${nav.offsetHeight}px`);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  const homeActive = pathname === "/";
  const wishlistActive = pathname.startsWith("/wishlist");
  const cartActive = pathname.startsWith("/cart");

  const tabClass = (isActive?: boolean) =>
    cn(
      "press group relative flex min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-[5px] px-1 py-1 text-center text-[10px] font-semibold leading-none tracking-[-0.01em] transition-[color,transform] duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1f6ff2]/25",
      isActive
        ? "text-[#1f6ff2] dark:text-[#74a9ff]"
        : "text-[#5d6674] hover:text-[#2f3948] dark:text-[#aeb6c2] dark:hover:text-white",
    );

  const iconClass = (isActive?: boolean) =>
    cn(
      "relative grid h-10 w-11 place-items-center transition-[color,transform] duration-150 group-hover:-translate-y-px",
      isActive
        ? "text-[#1f6ff2] dark:text-[#74a9ff]"
        : "text-[#596579] dark:text-[#aeb6c2]",
    );

  const activeIndicator = (
    <span
      className="absolute -top-[7px] left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-[#1f6ff2] shadow-[0_1px_4px_rgba(31,111,242,.22)]"
      aria-hidden="true"
    />
  );

  const openAi = () => {
    window.dispatchEvent(new CustomEvent(OPEN_SMART_ADVISOR_EVENT));
  };

  return (
    <>
      <nav
        ref={navRef}
        data-testid="bottom-nav"
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
      >
        <div className="border-t border-black/[.06] bg-white/[.98] pb-[max(7px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_26px_-24px_rgba(15,23,42,.42)] backdrop-blur-xl dark:border-white/[.08] dark:bg-[#10151d]/[.98]">
          <div className="mx-auto grid h-[68px] max-w-[560px] grid-cols-5 px-1 sm:px-4">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={tabClass(searchOpen)}
              aria-label={t("searchLabel")}
            >
              <span className={iconClass(searchOpen)}>
                <Search aria-hidden="true" className="size-[25px]" strokeWidth={2.1} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("searchLabel")}</span>
              {searchOpen && activeIndicator}
            </button>

            <button
              type="button"
              onClick={openAi}
              className="press group relative flex min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-[5px] px-1 py-1 text-center text-[10px] font-semibold leading-none tracking-[-0.01em] text-[#6d63d8] transition-[color,transform] duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d63d8]/25 dark:text-[#aaa2ff]"
              aria-label="Open AI assistant"
            >
              <span className="relative grid h-10 w-11 place-items-center text-[#6d63d8] transition-transform duration-150 group-hover:-translate-y-px dark:text-[#aaa2ff]">
                <Sparkles aria-hidden="true" className="size-[25px]" strokeWidth={2.15} />
              </span>
              <span>AI</span>
            </button>

            <Link
              to="/"
              className={cn(
                "press group relative flex min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-[4px] px-1 py-0.5 text-center text-[10px] font-bold leading-none tracking-[-0.01em] transition-[color,transform] duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1f6ff2]/25",
                homeActive
                  ? "text-[#1f6ff2] dark:text-[#74a9ff]"
                  : "text-[#5d6674] dark:text-[#aeb6c2]",
              )}
              aria-current={homeActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "relative grid h-[48px] w-[48px] place-items-center rounded-full transition-[background-color,color,box-shadow,transform] duration-150 group-hover:-translate-y-px",
                  homeActive
                    ? "bg-[#eaf2ff] text-[#1f6ff2] shadow-[inset_0_0_0_1px_rgba(31,111,242,.08),0_4px_12px_-8px_rgba(31,111,242,.55)] dark:bg-[#1d2a40] dark:text-[#74a9ff]"
                    : "text-[#596579] dark:text-[#aeb6c2]",
                )}
              >
                <House
                  aria-hidden="true"
                  className="size-[26px]"
                  strokeWidth={2.05}
                  fill={homeActive ? "currentColor" : "none"}
                />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("home")}</span>
              {homeActive && activeIndicator}
            </Link>

            <Link
              to="/wishlist"
              className={tabClass(wishlistActive)}
              aria-current={wishlistActive ? "page" : undefined}
            >
              <span className={iconClass(wishlistActive)}>
                <Heart
                  aria-hidden="true"
                  className="size-[25px]"
                  strokeWidth={2.05}
                  fill={wishlistActive ? "currentColor" : "none"}
                />
                <Count value={wishlistCount} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("saved")}</span>
              {wishlistActive && activeIndicator}
            </Link>

            <Link
              to="/cart"
              className={tabClass(cartActive)}
              aria-current={cartActive ? "page" : undefined}
            >
              <span className={iconClass(cartActive)}>
                <ShoppingBag aria-hidden="true" className="size-[25px]" strokeWidth={2.05} />
                <Count value={cartCount} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("bag")}</span>
              {cartActive && activeIndicator}
            </Link>
          </div>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
