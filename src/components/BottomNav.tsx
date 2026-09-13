import { Link, useRouterState } from "@tanstack/react-router";
import { House, LayoutGrid, Search, ShoppingBag, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { SHOP_ACCOUNT_URL } from "@/lib/infoPages";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";

function Count({ value }: { value: number }) {
  if (value <= 0) return null;

  return (
    <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#1f6ff2] px-1 text-[9px] font-extrabold leading-none text-white shadow-[0_2px_8px_rgba(31,111,242,.22)] ring-2 ring-white dark:ring-[#10151d]">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Compact one-hand mobile navigation for the primary shopping journey. */
export function BottomNav() {
  const navRef = useRef<HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const { t } = useLanguage();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
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
  const categoriesActive =
    pathname === "/categories" ||
    pathname === "/shop" ||
    pathname.startsWith("/category/") ||
    pathname.startsWith("/collections") ||
    pathname === "/brands" ||
    pathname.startsWith("/brand/") ||
    pathname === "/used-phones";
  const cartActive = pathname.startsWith("/cart");

  const tabClass = (isActive?: boolean) =>
    cn(
      "press group relative flex min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-1 px-1 py-1 text-center text-[10px] font-semibold leading-none tracking-[-0.01em] transition-[color,transform] duration-150 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1f6ff2]/25",
      isActive
        ? "text-[#1f6ff2] dark:text-[#74a9ff]"
        : "text-[#5d6674] hover:text-[#2f3948] dark:text-[#aeb6c2] dark:hover:text-white",
    );

  const iconClass = (isActive?: boolean) =>
    cn(
      "relative grid h-9 w-11 place-items-center rounded-xl transition-[background-color,color,transform] duration-150",
      isActive
        ? "bg-[#eaf2ff] text-[#1f6ff2] dark:bg-[#1d2a40] dark:text-[#74a9ff]"
        : "text-[#596579] group-hover:bg-black/[.035] dark:text-[#aeb6c2] dark:group-hover:bg-white/[.05]",
    );

  return (
    <>
      <nav
        ref={navRef}
        data-testid="bottom-nav"
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
      >
        <div className="border-t border-black/[.06] bg-white/[.98] pb-[max(7px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_26px_-24px_rgba(15,23,42,.42)] backdrop-blur-xl dark:border-white/[.08] dark:bg-[#10151d]/[.98]">
          <div className="mx-auto grid h-[64px] max-w-[560px] grid-cols-5 px-1.5 sm:px-4">
            <Link
              to="/"
              className={tabClass(homeActive)}
              aria-current={homeActive ? "page" : undefined}
            >
              <span className={iconClass(homeActive)}>
                <House aria-hidden="true" className="size-[23px]" strokeWidth={2} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("home")}</span>
            </Link>

            <Link
              to="/categories"
              className={tabClass(categoriesActive)}
              aria-current={categoriesActive ? "page" : undefined}
            >
              <span className={iconClass(categoriesActive)}>
                <LayoutGrid aria-hidden="true" className="size-[23px]" strokeWidth={2} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("categoriesTitle")}</span>
            </Link>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={tabClass(searchOpen)}
              aria-label={t("searchLabel")}
              aria-expanded={searchOpen}
            >
              <span className={iconClass(searchOpen)}>
                <Search aria-hidden="true" className="size-[23px]" strokeWidth={2} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("searchLabel")}</span>
            </button>

            <Link
              to="/cart"
              className={tabClass(cartActive)}
              aria-current={cartActive ? "page" : undefined}
            >
              <span className={iconClass(cartActive)}>
                <ShoppingBag aria-hidden="true" className="size-[23px]" strokeWidth={2} />
                <Count value={cartCount} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("bag")}</span>
            </Link>

            <a href={SHOP_ACCOUNT_URL} className={tabClass()} aria-label={t("account")}>
              <span className={iconClass()}>
                <UserRound aria-hidden="true" className="size-[23px]" strokeWidth={2} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("account")}</span>
            </a>
          </div>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
