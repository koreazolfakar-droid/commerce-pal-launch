import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Home, LayoutGrid, Search, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

function Count({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border border-background/80 bg-destructive px-1 text-[10px] font-extrabold leading-none text-destructive-foreground shadow-sm ring-2 ring-background">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Mobile bottom navigation. Every item performs a real action. */
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

  const itemClass = (isActive?: boolean) =>
    cn(
      "press group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 pb-2 pt-2 text-center text-[11px] font-semibold leading-snug transition-all duration-200",
      isActive
        ? "font-extrabold text-primary"
        : "text-muted-foreground hover:text-foreground",
    );

  const iconClass = (isActive?: boolean) =>
    cn(
      "relative grid h-9 w-12 max-w-full place-items-center rounded-2xl border border-transparent transition-all duration-200 group-active:scale-95",
      isActive
        ? "border-primary/15 bg-gradient-to-br from-accent to-primary/10 text-primary shadow-[0_7px_18px_-13px_var(--primary)]"
        : "text-muted-foreground group-hover:bg-muted/70 group-hover:text-foreground",
    );

  const activeIndicator = (isActive?: boolean) => (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary opacity-0 shadow-[0_0_8px_var(--primary)] transition-all duration-200",
        isActive && "w-4 opacity-100",
      )}
    />
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
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 shadow-[0_-16px_38px_-30px_rgba(15,23,42,.8)] backdrop-blur-2xl lg:hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/35 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-14 w-28 -translate-x-1/2 -translate-y-5 rounded-full bg-primary/8 blur-2xl"
        />

        <div className="mx-auto flex min-h-[5.15rem] max-w-md items-stretch px-2 pb-[env(safe-area-inset-bottom)] pt-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={itemClass(searchOpen)}
            aria-label={t("searchLabel")}
          >
            <span className={iconClass(searchOpen)}>
              <Search className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" strokeWidth={2} />
            </span>
            <span>{t("searchLabel")}</span>
            {activeIndicator(searchOpen)}
          </button>

          <Link
            to="/shop"
            className={itemClass(shopActive)}
            aria-current={shopActive ? "page" : undefined}
          >
            <span className={iconClass(shopActive)}>
              <LayoutGrid
                className="h-5 w-5 transition-transform duration-200 group-hover:scale-105"
                strokeWidth={shopActive ? 2.25 : 1.9}
              />
            </span>
            <span>{t("shop")}</span>
            {activeIndicator(shopActive)}
          </Link>

          <Link
            to="/"
            className="press group relative flex min-w-0 flex-1 flex-col items-center justify-end pb-2 text-center text-[11px] font-extrabold leading-snug text-primary"
            aria-current={homeActive ? "page" : undefined}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 h-12 w-20 rounded-full bg-primary/12 blur-xl transition-opacity duration-300 group-active:opacity-70"
            />
            <span
              className={cn(
                "relative -mt-6 grid h-[3.75rem] w-[3.75rem] shrink-0 place-items-center overflow-hidden rounded-[1.45rem] border-[3px] border-background bg-gradient-to-br from-primary via-primary to-accent-foreground text-primary-foreground shadow-[0_12px_26px_-12px_var(--primary)] ring-1 ring-primary/20 transition-all duration-200 group-active:scale-95",
                homeActive && "scale-[1.035] shadow-[0_15px_30px_-12px_var(--primary)]",
              )}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-2 top-1 h-3 rounded-full bg-primary-foreground/20 blur-md"
              />
              <span
                aria-hidden="true"
                className="absolute -right-3 -top-3 h-8 w-8 rounded-full border border-primary-foreground/20 bg-primary-foreground/10"
              />
              <Home className="relative h-[26px] w-[26px] drop-shadow-sm" strokeWidth={2.45} />
            </span>
            <span className="mt-1.5 tracking-[-0.01em]">{t("home")}</span>
            <span
              aria-hidden="true"
              className={cn(
                "mt-1 h-1 rounded-full bg-primary transition-all duration-200",
                homeActive ? "w-5 opacity-100" : "w-1 opacity-50",
              )}
            />
          </Link>

          <Link
            to="/wishlist"
            className={itemClass(wishlistActive)}
            aria-current={wishlistActive ? "page" : undefined}
          >
            <span className={cn(iconClass(wishlistActive), "relative")}>
              <Heart
                className={cn(
                  "h-5 w-5 transition-all duration-200 group-hover:scale-105",
                  wishlistActive && "fill-primary/15",
                )}
                strokeWidth={wishlistActive ? 2.25 : 1.9}
              />
              <Count value={wishlistCount} />
            </span>
            <span>{t("saved")}</span>
            {activeIndicator(wishlistActive)}
          </Link>

          <Link
            to="/cart"
            className={itemClass(cartActive)}
            aria-current={cartActive ? "page" : undefined}
          >
            <span className={cn(iconClass(cartActive), "relative")}>
              <ShoppingBag
                className="h-5 w-5 transition-transform duration-200 group-hover:scale-105"
                strokeWidth={cartActive ? 2.25 : 1.9}
              />
              <Count value={cartCount} />
            </span>
            <span>{t("bag")}</span>
            {activeIndicator(cartActive)}
          </Link>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
