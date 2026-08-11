import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Home, LayoutGrid, Search, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

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
      "relative flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
      isActive ? "text-primary" : "text-muted-foreground",
    );

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
          <Link to="/" className={itemClass(pathname === "/")}>
            <Home className="h-5 w-5" />
            Home
          </Link>
          <button type="button" onClick={() => setSearchOpen(true)} className={itemClass()}>
            <Search className="h-5 w-5" />
            Search
          </button>
          <Link to="/shop" className={itemClass(pathname.startsWith("/shop"))}>
            <LayoutGrid className="h-5 w-5" />
            Shop
          </Link>
          <Link to="/wishlist" className={itemClass(pathname.startsWith("/wishlist"))}>
            <span className="relative">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {wishlistCount}
                </span>
              )}
            </span>
            Saved
          </Link>
          <Link to="/cart" className={itemClass(pathname.startsWith("/cart"))}>
            <span className="relative">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </span>
            Bag
          </Link>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
