import { Link, useRouterState } from "@tanstack/react-router";
import { House, Search, ShoppingBag, Store, UserRound } from "lucide-react";
import { useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";

function Count({ value }: { value: number }) {
  if (value <= 0) return null;

  return (
    <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#1f6ff2] px-1 text-[9px] font-extrabold leading-none text-white shadow-[0_2px_8px_rgba(31,111,242,.18)] ring-2 ring-white dark:ring-[#10151d]">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Fast, thumb-friendly mobile navigation for the five primary shopping destinations. */
export function BottomNav() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { t } = useLanguage();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  const homeActive = pathname === "/";
  const shopActive =
    pathname.startsWith("/shop") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/category/") ||
    pathname.startsWith("/collections") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/used-phones");
  const cartActive = pathname.startsWith("/cart");
  const accountActive = pathname.startsWith("/help");

  const tabClass = (isActive?: boolean) =>
    cn(
      "press group relative flex min-h-14 min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-1 px-1 py-1 text-center text-[10px] font-semibold leading-none tracking-[-0.01em] transition-[color,background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1f6ff2]/25",
      isActive
        ? "text-[#1f6ff2] dark:text-[#74a9ff]"
        : "text-[#5d6674] hover:text-[#2f3948] dark:text-[#aeb6c2] dark:hover:text-white",
    );

  const iconClass = (isActive?: boolean) =>
    cn(
      "relative grid h-9 w-11 place-items-center rounded-full transition-[background-color,color,transform] duration-150",
      isActive
        ? "bg-[#eaf2ff] text-[#1f6ff2] dark:bg-[#1d2a40] dark:text-[#74a9ff]"
        : "text-[#596579] dark:text-[#aeb6c2]",
    );

  return (
    <>
      <nav
        data-testid="bottom-nav"
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
      >
        <div className="border-t border-black/[.06] bg-white/[.99] pb-[max(7px,env(safe-area-inset-bottom))] pt-1 shadow-[0_-7px_22px_-22px_rgba(15,23,42,.36)] dark:border-white/[.08] dark:bg-[#10151d]/[.99]">
          <div className="mx-auto grid h-16 max-w-[560px] grid-cols-5 px-1 sm:px-4">
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
              to="/shop"
              className={tabClass(shopActive)}
              aria-current={shopActive ? "page" : undefined}
            >
              <span className={iconClass(shopActive)}>
                <Store aria-hidden="true" className="size-[23px]" strokeWidth={2} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("shop")}</span>
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

            <Link
              to="/help"
              className={tabClass(accountActive)}
              aria-current={accountActive ? "page" : undefined}
            >
              <span className={iconClass(accountActive)}>
                <UserRound aria-hidden="true" className="size-[23px]" strokeWidth={2} />
              </span>
              <span className="max-w-full truncate whitespace-nowrap">{t("account")}</span>
            </Link>
          </div>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
