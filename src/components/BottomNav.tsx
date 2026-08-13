import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Home, LayoutGrid, Search, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const wishlistCount = useWishlistStore((state) => state.handles.length);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  const itemClass = (isActive?: boolean) =>
    cn(
      "press relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[10px] font-semibold transition-colors",
      isActive ? "text-primary" : "text-muted-foreground",
    );

  const iconClass = (isActive?: boolean) =>
    cn(
      "grid h-8 w-14 place-items-center rounded-full transition-colors",
      isActive && "bg-accent",
    );

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/90 backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
          <Link to="/" className={itemClass(pathname === "/")} aria-current={pathname === "/" ? "page" : undefined}>
            <span className={iconClass(pathname === "/")}>
              <Home className="h-[19px] w-[19px]" strokeWidth={pathname === "/" ? 2.4 : 1.9} />
            </span>
            Home
          </Link>
          <button type="button" onClick={() => setSearchOpen(true)} className={itemClass()}>
            <span className={iconClass()}>
              <Search className="h-[19px] w-[19px]" strokeWidth={1.9} />
            </span>
            Search
          </button>
          <Link to="/shop" className={itemClass(pathname.startsWith("/shop"))}>
            <span className={iconClass(pathname.startsWith("/shop"))}>
              <LayoutGrid className="h-[19px] w-[19px]" strokeWidth={1.9} />
            </span>
            Shop
          </Link>
          <Link to="/wishlist" className={itemClass(pathname.startsWith("/wishlist"))}>
            <span className={cn(iconClass(pathname.startsWith("/wishlist")), "relative")}>
              <Heart className="h-[19px] w-[19px]" strokeWidth={1.9} />
              <Count value={wishlistCount} />
            </span>
            Saved
          </Link>
          <Link to="/cart" className={itemClass(pathname.startsWith("/cart"))}>
            <span className={cn(iconClass(pathname.startsWith("/cart")), "relative")}>
              <ShoppingBag className="h-[19px] w-[19px]" strokeWidth={1.9} />
              <Count value={cartCount} />
            </span>
            Bag
          </Link>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
