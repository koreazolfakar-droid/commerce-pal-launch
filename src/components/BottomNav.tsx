import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

function Count({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="absolute -right-2.5 -top-2 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-[#1f6ff2] px-1 text-[10px] font-extrabold leading-none text-white shadow-[0_2px_7px_rgba(31,111,242,.3)] ring-2 ring-white dark:ring-[#151922]">
      {value > 99 ? "99+" : value}
    </span>
  );
}

function ShopIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[23px] w-[23px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.05 : 1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function HomeGlyph() {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      className="h-7 w-7 drop-shadow-[0_2px_3px_rgba(31,111,242,.18)]"
    >
      <path
        d="M3.7 12.1 12.35 4.7a2.55 2.55 0 0 1 3.3 0l8.65 7.4a2.55 2.55 0 0 1 .9 1.94v8.35A2.61 2.61 0 0 1 22.59 25H5.41a2.61 2.61 0 0 1-2.61-2.61v-8.35c0-.75.33-1.46.9-1.94Z"
        fill="#1f6ff2"
      />
      <path d="M11.25 25v-6.2c0-.9.73-1.63 1.63-1.63h2.24c.9 0 1.63.73 1.63 1.63V25" fill="white" />
    </svg>
  );
}

/** Mobile bottom navigation styled to match the refined Space Call reference. */
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
      if (nav.offsetHeight > 0)
        layout.style.setProperty("--mobile-nav-height", `${nav.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  const homeActive = pathname === "/";
  const shopActive = pathname.startsWith("/shop");
  const wishlistActive = pathname.startsWith("/wishlist");
  const cartActive = pathname.startsWith("/cart");

  const itemClass = (isActive?: boolean) =>
    cn(
      "press group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-0.5 py-2.5 text-center text-[11px] font-semibold leading-none transition-colors duration-200",
      isActive ? "text-[#1f6ff2]" : "text-[#5d6675] dark:text-[#aeb6c3]",
    );

  const iconWrapClass = (isActive?: boolean) =>
    cn(
      "relative grid h-8 w-10 place-items-center transition-colors duration-200",
      isActive ? "text-[#1f6ff2]" : "text-[#555f6d] dark:text-[#c1c8d2]",
    );

  return (
    <>
      <nav
        ref={navRef}
        data-testid="bottom-nav"
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e8ecf2] bg-white/98 shadow-[0_-8px_24px_-22px_rgba(15,23,42,.4)] backdrop-blur-xl dark:border-white/10 dark:bg-[#151922]/98 lg:hidden"
      >
        <div className="mx-auto flex min-h-[5.35rem] max-w-md items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={itemClass(searchOpen)}
            aria-label={t("searchLabel")}
          >
            <span className={iconWrapClass(searchOpen)}>
              <Search className="h-[23px] w-[23px]" strokeWidth={1.85} />
            </span>
            <span>{t("searchLabel")}</span>
          </button>

          <Link
            to="/shop"
            className={itemClass(shopActive)}
            aria-current={shopActive ? "page" : undefined}
          >
            <span className={iconWrapClass(shopActive)}>
              <ShopIcon active={shopActive} />
            </span>
            <span>{t("shop")}</span>
          </Link>

          <Link
            to="/"
            className="press relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-0.5 py-2 text-center text-[11px] font-bold leading-none text-[#1f6ff2]"
            aria-current={homeActive ? "page" : undefined}
          >
            <span
              className={cn(
                "grid h-[54px] w-[72px] place-items-center rounded-[1.35rem] border border-[#dce8ff] bg-[#eaf2ff] shadow-[0_5px_14px_-10px_rgba(31,111,242,.5)] transition-all duration-200 dark:border-[#2a4f8a] dark:bg-[#1d2d48]",
                homeActive && "bg-[#e6f0ff] dark:bg-[#203352]",
              )}
            >
              <HomeGlyph />
            </span>
            <span>{t("home")}</span>
          </Link>

          <Link
            to="/wishlist"
            className={itemClass(wishlistActive)}
            aria-current={wishlistActive ? "page" : undefined}
          >
            <span className={cn(iconWrapClass(wishlistActive), "relative")}>
              <Heart
                className={cn("h-[23px] w-[23px]", wishlistActive && "fill-[#1f6ff2]/8")}
                strokeWidth={1.85}
              />
              <Count value={wishlistCount} />
            </span>
            <span>{t("saved")}</span>
          </Link>

          <Link
            to="/cart"
            className={itemClass(cartActive)}
            aria-current={cartActive ? "page" : undefined}
          >
            <span className={cn(iconWrapClass(cartActive), "relative")}>
              <ShoppingBag className="h-[23px] w-[23px]" strokeWidth={1.85} />
              <Count value={cartCount} />
            </span>
            <span>{t("bag")}</span>
          </Link>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
