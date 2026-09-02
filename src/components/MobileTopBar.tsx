import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, LayoutGrid, Search, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useHydrated } from "@/hooks/useHydrated";
import { catalogQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

function Badge({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Mobile app style top bar: brand, quick actions, search field and category strip. */
export function MobileTopBar({ activeSlug }: { activeSlug?: string }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const hydrated = useHydrated();
  const wishlistCount = useWishlistStore((state) => state.handles.length);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  const { data: catalog, isLoading } = useQuery(catalogQueryOptions());
  const list = hydrated ? catalog?.categories ?? [] : [];

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-card">
              S
            </span>
            <span className="truncate text-[17px] font-extrabold tracking-tight">Space Cell</span>
          </Link>
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishlistCount} saved`}
              className="press relative grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-surface"
            >
              <Heart className="h-[21px] w-[21px]" strokeWidth={1.9} />
              <Badge value={wishlistCount} />
            </Link>
            <button
              type="button"
              onClick={() => document.dispatchEvent(new CustomEvent("space-cell:open-cart"))}
              aria-label={`Cart, ${cartCount} items`}
              className="press relative grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-surface"
            >
              <ShoppingBag className="h-[21px] w-[21px]" strokeWidth={1.9} />
              <Badge value={cartCount} />
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="press flex h-11 w-full items-center gap-2.5 rounded-2xl bg-surface px-4 text-left text-[13px] text-muted-foreground transition-colors hover:bg-accent"
          >
            <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="truncate">Search phones, audio, accessories…</span>
          </button>
        </div>

        {(list.length > 0 || isLoading) && (
          <nav aria-label="Product categories" className="scroll-rail flex gap-3 px-4 pb-3">
            {isLoading && list.length === 0
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="w-16 shrink-0" aria-hidden>
                    <div className="shimmer h-14 w-14 rounded-2xl bg-surface" />
                    <div className="mx-auto mt-1.5 h-2 w-10 rounded-full bg-surface" />
                  </div>
                ))
              : null}
            {list.length > 0 && (
              <Link
                to="/shop"
                className={cn(
                  "press flex w-16 shrink-0 flex-col items-center gap-1.5 text-[10px] font-semibold",
                  !activeSlug ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-14 w-14 place-items-center rounded-2xl bg-surface transition-colors",
                    !activeSlug && "bg-accent text-primary",
                  )}
                >
                  <LayoutGrid className="h-[21px] w-[21px]" strokeWidth={1.9} />
                </span>
                <span className="truncate">All</span>
              </Link>
            )}
            {list.map((category) => {
              const Icon = category.icon;
              const active = activeSlug === category.slug;
              return (
                <Link
                  key={category.slug}
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className={cn(
                    "press flex w-16 shrink-0 flex-col items-center gap-1.5 text-[10px] font-semibold",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-14 w-14 place-items-center rounded-2xl bg-surface transition-colors",
                      active ? "bg-accent text-primary" : "hover:bg-accent",
                    )}
                  >
                    {Icon ? <Icon className="h-[21px] w-[21px]" strokeWidth={1.9} /> : null}
                  </span>
                  <span className="w-full truncate text-center">{category.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
