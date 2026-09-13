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
    <span className="absolute -right-1.5 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#1f6ff2] px-1 text-[8px] font-black leading-none text-white shadow-[0_4px_10px_-4px_rgba(31,111,242,.75)] ring-2 ring-white dark:ring-[#111722]">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Compact, touch-friendly mobile dock with a unified modern icon language. */
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

  const itemClass = (isActive?: boolean) =>
    cn(
      "press group relative flex min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-1.5 text-center text-[10px] font-semibold leading-none tracking-[-0.015em] transition-[transform,color] duration-150 active:scale-[.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6ff2]/30",
      isActive
        ? "text-[#1f6ff2]"
        : "text-[#6f7a8b] hover:text-[#445064] dark:text-[#aeb7c4] dark:hover:text-white",
    );

  const iconClass = (isActive?: boolean) =>
    cn(
      "relative grid h-9 w-11 place-items-center rounded-[14px] transition-[background-color,color,box-shadow,transform] duration-150 group-hover:-translate-y-px",
      isActive
        ? "bg-[#eaf3ff] text-[#1f6ff2] shadow-[inset_0_0_0_1px_rgba(31,111,242,.07)] dark:bg-[#1d2a40] dark:text-[#6ca5ff]"
        : "text-[#536073] group-hover:bg-[#f4f6f9] dark:text-[#c3cad4] dark:group-hover:bg-white/[.05]",
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
        className="fixed inset-x-0 bottom-0 z-50 px-2.5 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 lg:hidden sm:px-4"
      >
        <div className="relative mx-auto grid min-h-[68px] max-w-[480px] grid-cols-5 items-stretch rounded-[25px] border border-black/[.06] bg-white/[.94] p-1.5 shadow-[0_14px_42px_-22px_rgba(15,23,42,.55),0_4px_16px_-10px_rgba(15,23,42,.22)] backdrop-blur-2xl dark:border-white/[.08] dark:bg-[#111722]/[.94] dark:shadow-[0_18px_44px_-24px_rgba(0,0,0,.82)]">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={itemClass(searchOpen)}
            aria-label={t("searchLabel")}
          >
            <span className={iconClass(searchOpen)}>
              <Search aria-hidden="true" className="size-[22px]" strokeWidth={2.15} />
            </span>
            <span className="max-w-full truncate whitespace-nowrap">{t("searchLabel")}</span>
          </button>

          <button
            type="button"
            onClick={openAi}
            className="press group relative flex min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-1.5 text-center text-[10px] font-semibold leading-none tracking-[-0.015em] text-[#7568df] transition-[transform,color] duration-150 active:scale-[.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7568df]/30 dark:text-[#aca2ff]"
            aria-label="Open AI assistant"
          >
            <span className="relative grid h-9 w-11 place-items-center overflow-hidden rounded-[14px] bg-[#f1efff] text-[#6d5cf3] shadow-[inset_0_0_0_1px_rgba(109,92,243,.08)] transition-transform duration-150 group-hover:-translate-y-px dark:bg-[#292440] dark:text-[#b7adff]">
              <span
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,.9),transparent_46%)] opacity-70 dark:opacity-10"
                aria-hidden="true"
              />
              <Sparkles aria-hidden="true" className="relative size-[22px]" strokeWidth={2.15} />
            </span>
            <span>AI</span>
          </button>

          <Link
            to="/"
            className={cn(
              "press group relative flex min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-1.5 text-center text-[10px] font-bold leading-none tracking-[-0.015em] transition-transform duration-150 active:scale-[.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6ff2]/30",
              homeActive ? "text-[#1f6ff2]" : "text-[#546173] dark:text-[#c3cad4]",
            )}
            aria-current={homeActive ? "page" : undefined}
          >
            <span
              className={cn(
                "relative grid h-11 w-12 place-items-center rounded-[17px] transition-[background-color,color,box-shadow,transform] duration-150 group-hover:-translate-y-px",
                homeActive
                  ? "bg-linear-to-br from-[#3789ff] to-[#1767e8] text-white shadow-[0_8px_20px_-10px_rgba(31,111,242,.95)]"
                  : "bg-[#f1f5fb] text-[#40506a] shadow-[inset_0_0_0_1px_rgba(15,23,42,.04)] dark:bg-white/[.06] dark:text-white",
              )}
            >
              <House
                aria-hidden="true"
                className="size-[23px]"
                strokeWidth={2.2}
                fill={homeActive ? "currentColor" : "none"}
              />
            </span>
            <span className="max-w-full truncate whitespace-nowrap">{t("home")}</span>
          </Link>

          <Link
            to="/wishlist"
            className={itemClass(wishlistActive)}
            aria-current={wishlistActive ? "page" : undefined}
          >
            <span className={cn(iconClass(wishlistActive), "relative")}>
              <Heart
                aria-hidden="true"
                className="size-[22px]"
                strokeWidth={2.15}
                fill={wishlistActive ? "currentColor" : "none"}
              />
              <Count value={wishlistCount} />
            </span>
            <span className="max-w-full truncate whitespace-nowrap">{t("saved")}</span>
          </Link>

          <Link
            to="/cart"
            className={itemClass(cartActive)}
            aria-current={cartActive ? "page" : undefined}
          >
            <span className={cn(iconClass(cartActive), "relative")}>
              <ShoppingBag aria-hidden="true" className="size-[22px]" strokeWidth={2.15} />
              <Count value={cartCount} />
            </span>
            <span className="max-w-full truncate whitespace-nowrap">{t("bag")}</span>
          </Link>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
