import { Link, useRouterState } from "@tanstack/react-router";
import { Grid2X2, Heart, House, Search, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

function Count({ value }: { value: number }) {
  if (value <= 0) return null;

  return (
    <span className="absolute -right-2 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold leading-none text-primary-foreground shadow-[0_2px_8px_rgba(37,99,235,.28)] ring-2 ring-background">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Premium mobile bottom navigation. Every item performs a real action. */
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
        layout.style.setProperty("--mobile-nav-height", `${nav.offsetHeight + 12}px`);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  const itemClass = (isActive?: boolean) =>
    cn(
      "press group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-0.5 pb-2.5 pt-3 text-center text-[11px] font-semibold leading-none transition-all duration-200",
      isActive ? "text-primary" : "text-muted-foreground",
    );

  const iconClass = (isActive?: boolean) =>
    cn(
      "relative grid h-8 w-10 place-items-center rounded-xl transition-all duration-200 group-active:scale-95",
      isActive ? "text-primary" : "text-foreground/70 group-hover:text-foreground",
    );

  const homeActive = pathname === "/";
  const shopActive = pathname.startsWith("/shop");
  const wishlistActive = pathname.startsWith("/wishlist");
  const cartActive = pathname.startsWith("/cart");

  return (
    <>
      <nav
        ref={navRef}
        data-testid="bottom-nav"
        aria-label="Primary"
        className="fixed bottom-2 left-2 right-2 z-40 mx-auto max-w-md rounded-[1.9rem] border border-border/70 bg-background/96 shadow-[0_16px_42px_-24px_rgba(15,23,42,.45),0_4px_14px_-8px_rgba(15,23,42,.18)] backdrop-blur-2xl lg:hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent"
        />

        <div className="flex min-h-[5.35rem] items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={itemClass(searchOpen)}
            aria-label={t("searchLabel")}
          >
            <span className={iconClass(searchOpen)}>
              <Search className="h-[22px] w-[22px]" strokeWidth={1.9} />
            </span>
            <span>{t("searchLabel")}</span>
          </button>

          <Link
            to="/shop"
            className={itemClass(shopActive)}
            aria-current={shopActive ? "page" : undefined}
          >
            <span className={iconClass(shopActive)}>
              <Grid2X2 className="h-[21px] w-[21px]" strokeWidth={1.9} />
            </span>
            <span>{t("shop")}</span>
          </Link>

          <Link
            to="/"
            className="press group relative flex min-w-0 flex-1 flex-col items-center justify-end pb-2 text-center text-[11px] font-extrabold leading-none text-primary"
            aria-current={homeActive ? "page" : undefined}
          >
            <span
              className={cn(
                "relative -mt-5 grid h-[3.75rem] w-[3.75rem] shrink-0 place-items-center overflow-hidden rounded-[1.28rem] border border-primary/25 bg-linear-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_12px_24px_-10px_rgba(37,99,235,.55)] ring-4 ring-background transition-all duration-200 group-active:scale-95",
                homeActive && "shadow-[0_14px_28px_-10px_rgba(37,99,235,.65)]",
              )}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-1.5 top-1 h-5 rounded-[1rem] bg-white/14 blur-[1px]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-blue-700/20 to-transparent"
              />
              <House className="relative h-[27px] w-[27px]" strokeWidth={2.15} />
            </span>
            <span className="mt-1.5">{t("home")}</span>
          </Link>

          <Link
            to="/wishlist"
            className={itemClass(wishlistActive)}
            aria-current={wishlistActive ? "page" : undefined}
          >
            <span className={cn(iconClass(wishlistActive), "relative")}>
              <Heart
                className={cn("h-[22px] w-[22px]", wishlistActive && "fill-primary/10")}
                strokeWidth={1.9}
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
            <span className={cn(iconClass(cartActive), "relative")}>
              <ShoppingBag className="h-[22px] w-[22px]" strokeWidth={1.9} />
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
