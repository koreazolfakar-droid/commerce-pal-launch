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
    <span className="absolute -right-2 -top-1.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-[#1769e8] px-1 text-[8px] font-extrabold leading-none text-white ring-2 ring-white dark:ring-[#10151d]">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Clean mobile commerce navigation inspired by modern native app bars. */
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
      "press group relative flex min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-[4px] px-1 py-1 text-[9.5px] font-semibold leading-none tracking-[-0.01em] transition-colors duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1f6ff2]/25",
      isActive
        ? "text-[#1769e8] dark:text-[#74a9ff]"
        : "text-[#7b8493] hover:text-[#374151] dark:text-[#929baa] dark:hover:text-white",
    );

  const iconShellClass = (isActive?: boolean) =>
    cn(
      "relative grid h-[34px] w-[44px] place-items-center rounded-[12px] transition-[background-color,color,transform] duration-150",
      isActive
        ? "bg-[#eef5ff] text-[#1769e8] dark:bg-[#1c2a40] dark:text-[#74a9ff]"
        : "text-[#596579] group-hover:bg-black/[.035] group-hover:text-[#263244] dark:text-[#aeb6c2] dark:group-hover:bg-white/[.05] dark:group-hover:text-white",
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
        <div className="border-t border-black/[.07] bg-white/[.96] pb-[max(7px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_28px_-22px_rgba(15,23,42,.45)] backdrop-blur-xl dark:border-white/[.08] dark:bg-[#10151d]/[.96]">
          <div className="mx-auto grid h-[62px] max-w-[540px] grid-cols-5 px-1.5 sm:px-4">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={tabClass(searchOpen)}
              aria-label={t("searchLabel")}
            >
              <span className={iconShellClass(searchOpen)}>
                <Search aria-hidden="true" className="size-[21px]" strokeWidth={2} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("searchLabel")}</span>
              {searchOpen && (
                <span className="absolute top-[-6px] h-[2px] w-6 rounded-full bg-[#1769e8]" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={openAi}
              className={tabClass(false)}
              aria-label="Open AI assistant"
            >
              <span className="relative grid h-[34px] w-[44px] place-items-center rounded-[12px] text-[#6d63d8] transition-colors duration-150 group-hover:bg-[#f5f3ff] dark:text-[#aaa2ff] dark:group-hover:bg-[#26233a]">
                <Sparkles aria-hidden="true" className="size-[21px]" strokeWidth={2} />
              </span>
              <span>AI</span>
            </button>

            <Link
              to="/"
              className={cn(tabClass(homeActive), "font-bold")}
              aria-current={homeActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "relative grid h-[38px] w-[46px] place-items-center rounded-[13px] transition-colors duration-150",
                  homeActive
                    ? "bg-[#1769e8] text-white shadow-[0_6px_16px_-10px_rgba(23,105,232,.85)]"
                    : "text-[#4f5d72] group-hover:bg-black/[.035] dark:text-[#c0c7d1] dark:group-hover:bg-white/[.05]",
                )}
              >
                <House
                  aria-hidden="true"
                  className="size-[22px]"
                  strokeWidth={2.05}
                  fill={homeActive ? "currentColor" : "none"}
                />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("home")}</span>
              {homeActive && (
                <span className="absolute top-[-6px] h-[2px] w-7 rounded-full bg-[#1769e8]" aria-hidden="true" />
              )}
            </Link>

            <Link
              to="/wishlist"
              className={tabClass(wishlistActive)}
              aria-current={wishlistActive ? "page" : undefined}
            >
              <span className={iconShellClass(wishlistActive)}>
                <Heart
                  aria-hidden="true"
                  className="size-[21px]"
                  strokeWidth={2}
                  fill={wishlistActive ? "currentColor" : "none"}
                />
                <Count value={wishlistCount} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("saved")}</span>
              {wishlistActive && (
                <span className="absolute top-[-6px] h-[2px] w-6 rounded-full bg-[#1769e8]" aria-hidden="true" />
              )}
            </Link>

            <Link
              to="/cart"
              className={tabClass(cartActive)}
              aria-current={cartActive ? "page" : undefined}
            >
              <span className={iconShellClass(cartActive)}>
                <ShoppingBag aria-hidden="true" className="size-[21px]" strokeWidth={2} />
                <Count value={cartCount} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("bag")}</span>
              {cartActive && (
                <span className="absolute top-[-6px] h-[2px] w-6 rounded-full bg-[#1769e8]" aria-hidden="true" />
              )}
            </Link>
          </div>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
