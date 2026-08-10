import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { fetchCollections, type ShopifyCollection } from "@/lib/shopify";
import { CATEGORIES } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

function iconFor(handle: string) {
  return CATEGORIES.find((category) => handle.includes(category.handle))?.icon;
}

/** Mobile app style top bar: brand, quick actions, search field and category strip. */
export function MobileTopBar({ activeHandle }: { activeHandle?: string }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const wishlistCount = useWishlistStore((state) => state.handles.length);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  const { data: collections } = useQuery({
    queryKey: ["shopify-collections"],
    queryFn: () => fetchCollections(50),
    staleTime: 5 * 60 * 1000,
  });

  const list: ShopifyCollection[] = collections ?? [];

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              S
            </span>
            <span className="truncate text-base font-semibold tracking-tight">Space Cell</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/collections"
              aria-label={`Wishlist, ${wishlistCount} saved`}
              className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-surface"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => document.dispatchEvent(new CustomEvent("space-cell:open-cart"))}
              aria-label={`Cart, ${cartCount} items`}
              className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-surface"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-11 w-full items-center gap-3 rounded-xl border bg-card px-4 text-left text-sm text-muted-foreground"
          >
            <Search className="h-4 w-4" />
            Search phones, audio, accessories…
          </button>
        </div>

        {list.length > 0 && (
          <nav className="scroll-rail flex gap-4 px-4 pb-2">
            <Link
              to="/collections"
              className={cn(
                "flex w-16 shrink-0 flex-col items-center gap-1.5 pb-2 text-[11px] font-medium",
                !activeHandle ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-14 w-14 place-items-center rounded-xl border bg-card",
                  !activeHandle && "border-primary",
                )}
              >
                <Search className="h-5 w-5" />
              </span>
              <span className="truncate">All</span>
            </Link>
            {list.map((collection) => {
              const Icon = iconFor(collection.handle);
              const active = activeHandle === collection.handle;
              return (
                <Link
                  key={collection.id}
                  to="/collections/$handle"
                  params={{ handle: collection.handle }}
                  className={cn(
                    "flex w-16 shrink-0 flex-col items-center gap-1.5 pb-2 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-14 w-14 place-items-center overflow-hidden rounded-xl border bg-card",
                      active && "border-primary",
                    )}
                  >
                    {collection.image ? (
                      <img
                        src={collection.image.url}
                        alt={collection.image.altText ?? collection.title}
                        loading="lazy"
                        width={112}
                        height={112}
                        className="h-full w-full object-cover"
                      />
                    ) : Icon ? (
                      <Icon className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">
                        {collection.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="w-full truncate text-center">{collection.title}</span>
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
