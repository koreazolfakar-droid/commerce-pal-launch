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
    <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
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
      "press relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 pb-2 pt-2 text-center text-[11px] font-semibold leading-snug transition-colors duration-200",
      isActive ? "font-extrabold text-primary" : "text-muted-foreground",
    );

  const iconClass = (isActive?: boolean) =>
    cn(
      "grid h-9 w-12 max-w-full place-items-center rounded-2xl border border-transparent transition-all duration-200",
      isActive && "border-primary/10 bg-primary/10 shadow-sm",
    );

  const homeActive = pathname === "/";

  return (
    <>
      <nav
        ref={navRef}
        data-testid="bottom-nav"
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 shadow-[0_-12px_34px_-28px_rgba(15,23,42,.75)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex min-h-[5rem] max-w-md items-stretch px-2 pb-[env(safe-area-inset-bottom)] pt-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={itemClass(false)}
          >
            <span className={iconClass(false)}>
              <Search className="h-5 w-5" strokeWidth={1.9} />
            </span>
            {t("searchLabel")}
          </button>

          <Link to="/shop" className={itemClass(pathname.startsWith("/shop"))}>
            <span className={iconClass(pathname.startsWith("/shop"))}>
              <LayoutGrid className="h-5 w-5" strokeWidth={1.9} />
            </span>
            {t("shop")}
          </Link>

          <Link
            to="/"
            className="press relative flex min-w-0 flex-1 flex-col items-center justify-end pb-2 text-center text-[11px] font-extrabold leading-snug text-primary"
            aria-current={homeActive ? "page" : undefined}
          >
            <span
              className={cn(
                "relative -mt-5 grid h-14 w-14 shrink-0 place-items-center rounded-[1.35rem] border-4 border-background bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200",
                homeActive && "scale-[1.03] shadow-xl shadow-primary/30",
              )}
            >
              <Home className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <span className="mt-1">{t("home")}</span>
          </Link>

          <Link to="/wishlist" className={itemClass(pathname.startsWith("/wishlist"))}>
            <span className={cn(iconClass(pathname.startsWith("/wishlist")), "relative")}>
              <Heart className="h-5 w-5" strokeWidth={1.9} />
              <Count value={wishlistCount} />
            </span>
            {t("saved")}
          </Link>

          <Link to="/cart" className={itemClass(pathname.startsWith("/cart"))}>
            <span className={cn(iconClass(pathname.startsWith("/cart")), "relative")}>
              <ShoppingBag className="h-5 w-5" strokeWidth={1.9} />
              <Count value={cartCount} />
            </span>
            {t("bag")}
          </Link>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
