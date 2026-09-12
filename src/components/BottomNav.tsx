import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

const NAV_BLUE = "#1f6ff2";

function Count({ value }: { value: number }) {
  if (value <= 0) return null;

  return (
    <span className="absolute -right-2.5 -top-2.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#1f6ff2] px-1 text-[10px] font-extrabold leading-none text-white shadow-[0_2px_8px_rgba(31,111,242,.26)] ring-2 ring-white dark:ring-[#151922]">
      {value > 99 ? "99+" : value}
    </span>
  );
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-7 w-7" fill="none">
      <circle cx="12" cy="12" r="7.4" stroke="currentColor" strokeWidth="2.15" />
      <path d="m17.45 17.45 5.25 5.25" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" />
    </svg>
  );
}

function ShopGlyph() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-[27px] w-[27px]" fill="none">
      <rect x="4" y="4" width="7.2" height="7.2" rx="1.55" stroke="currentColor" strokeWidth="2.05" />
      <rect x="16.8" y="4" width="7.2" height="7.2" rx="1.55" stroke="currentColor" strokeWidth="2.05" />
      <rect x="4" y="16.8" width="7.2" height="7.2" rx="1.55" stroke="currentColor" strokeWidth="2.05" />
      <rect x="16.8" y="16.8" width="7.2" height="7.2" rx="1.55" stroke="currentColor" strokeWidth="2.05" />
    </svg>
  );
}

function HomeGlyph() {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className="h-[30px] w-[30px]">
      <path
        d="M4.2 12.65 13.16 5a2.84 2.84 0 0 1 3.68 0l8.96 7.65c.63.54 1 1.33 1 2.16v8.33A2.86 2.86 0 0 1 23.94 26H6.06a2.86 2.86 0 0 1-2.86-2.86v-8.33c0-.83.37-1.62 1-2.16Z"
        fill={NAV_BLUE}
      />
      <path d="M12 26v-6.35c0-.96.78-1.74 1.74-1.74h2.52c.96 0 1.74.78 1.74 1.74V26" fill="white" />
    </svg>
  );
}

function HeartGlyph({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-7 w-7" fill={active ? "currentColor" : "none"}>
      <path
        d="M14 23.55S4.2 18.1 4.2 10.92A5.47 5.47 0 0 1 14 7.58a5.47 5.47 0 0 1 9.8 3.34C23.8 18.1 14 23.55 14 23.55Z"
        stroke="currentColor"
        strokeWidth="2.05"
        strokeLinecap="round"
        strokeLinejoin="round"
        fillOpacity={active ? 0.1 : 0}
      />
    </svg>
  );
}

function BagGlyph() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-7 w-7" fill="none">
      <path
        d="M6.1 10.1h15.8l1.2 13.1c.1 1.05-.73 1.96-1.79 1.96H6.69c-1.06 0-1.89-.91-1.79-1.96l1.2-13.1Z"
        stroke="currentColor"
        strokeWidth="2.05"
        strokeLinejoin="round"
      />
      <path d="M10.05 11V8.1a3.95 3.95 0 0 1 7.9 0V11" stroke="currentColor" strokeWidth="2.05" strokeLinecap="round" />
    </svg>
  );
}

/** Mobile bottom navigation tuned to the approved Space Call reference. */
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
  const shopActive = pathname.startsWith("/shop");
  const wishlistActive = pathname.startsWith("/wishlist");
  const cartActive = pathname.startsWith("/cart");

  const itemClass = (isActive?: boolean) =>
    cn(
      "press group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-[6px] px-0.5 py-2.5 text-center text-[12px] font-semibold leading-none tracking-[-0.01em] transition-colors duration-150 active:scale-[.98]",
      isActive ? "text-[#1f6ff2]" : "text-[#5b6573] dark:text-[#b7bec8]",
    );

  const iconClass = (isActive?: boolean) =>
    cn(
      "relative grid h-9 w-10 place-items-center transition-colors duration-150",
      isActive ? "text-[#1f6ff2]" : "text-[#56606e] dark:text-[#c5cbd4]",
    );

  return (
    <>
      <nav
        ref={navRef}
        data-testid="bottom-nav"
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 overflow-visible border-t border-[#edf0f4] bg-white/[.985] shadow-[0_-8px_22px_-20px_rgba(15,23,42,.28)] backdrop-blur-xl dark:border-white/[.08] dark:bg-[#151922]/[.985] lg:hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white to-transparent opacity-80 dark:via-white/10"
        />

        <div className="mx-auto flex min-h-[5.55rem] max-w-md items-stretch px-1.5 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={itemClass(searchOpen)}
            aria-label={t("searchLabel")}
          >
            <span className={iconClass(searchOpen)}>
              <SearchGlyph />
            </span>
            <span>{t("searchLabel")}</span>
          </button>

          <Link
            to="/shop"
            className={itemClass(shopActive)}
            aria-current={shopActive ? "page" : undefined}
          >
            <span className={iconClass(shopActive)}>
              <ShopGlyph />
            </span>
            <span>{t("shop")}</span>
          </Link>

          <Link
            to="/"
            className="press relative flex min-w-0 flex-1 flex-col items-center justify-center gap-[6px] px-0.5 py-2 text-center text-[12px] font-bold leading-none tracking-[-0.01em] text-[#1f6ff2] active:scale-[.985]"
            aria-current={homeActive ? "page" : undefined}
          >
            <span
              className={cn(
                "grid h-[58px] w-[76px] place-items-center rounded-[1.45rem] border border-[#dce7fb] bg-[#edf3ff] shadow-[0_4px_12px_-9px_rgba(31,111,242,.3)] transition-colors duration-150 dark:border-[#2b4771] dark:bg-[#1d2a40]",
                homeActive && "border-[#d8e5fb] bg-[#eaf2ff] dark:bg-[#20304a]",
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
            <span className={cn(iconClass(wishlistActive), "relative")}>
              <HeartGlyph active={wishlistActive} />
              <Count value={wishlistCount} />
            </span>
            <span>{t("saved")}</span>
          </Link>

          <Link
            to="/cart"
            className={itemClass(cartActive)}
            aria-current={cartActive ? "page" : undefined}
          >
            <span className={cn(iconClass(cartActive), "relative")}>
              <BagGlyph />
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
