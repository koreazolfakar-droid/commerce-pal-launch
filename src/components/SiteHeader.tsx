import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Heart, Search, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { useState } from "react";

import { CartDrawer } from "@/components/CartDrawer";
import { SearchOverlay } from "@/components/SearchOverlay";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { displayCollections } from "@/lib/taxonomy";
import { useWishlistStore } from "@/stores/wishlistStore";

const TRUST = [
  { icon: Truck, text: "Fast delivery on every order" },
  { icon: ShieldCheck, text: "100% authentic products with official warranty" },
  { icon: RotateCcw, text: "Easy returns and responsive support" },
];

/** Desktop header. Navigation is generated from the live Shopify catalog. */
export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const wishlistCount = useWishlistStore((state) => state.handles.length);

  const { data: catalog } = useQuery(catalogQueryOptions());
  const { data: collections } = useQuery(collectionsQueryOptions());

  const categories = catalog?.categories ?? [];
  const brands = catalog?.brands ?? [];
  const collectionList = displayCollections(collections ?? []);
  const primaryLinks = categories.slice(0, 4);

  return (
    <>
      <div className="border-b bg-surface text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4">
          <ul className="grid grid-cols-3 gap-4 py-2">
            {TRUST.map((item, index) => (
              <li
                key={item.text}
                className={`flex items-center gap-2 ${
                  index === 1 ? "justify-center" : index === 2 ? "justify-end" : ""
                }`}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              S
            </span>
            <span className="truncate text-lg font-semibold tracking-tight">Space Cell</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/shop"
              activeProps={{ className: "text-primary" }}
              className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary"
            >
              Shop all
            </Link>

            {categories.length > 0 && (
              <div className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary"
                >
                  Categories
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <div className="invisible absolute left-0 top-full z-40 w-[34rem] translate-y-1 rounded-xl border bg-popover p-4 opacity-0 shadow-card-hover transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="grid grid-cols-2 gap-1">
                    {categories.map((category) => (
                      <Link
                        key={category.slug}
                        to="/category/$slug"
                        params={{ slug: category.slug }}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface hover:text-primary"
                      >
                        {category.icon && <category.icon className="h-4 w-4 text-primary" />}
                        <span className="flex-1 truncate">{category.label}</span>
                        <span className="text-xs text-muted-foreground">{category.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {brands.length > 0 && (
              <div className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary"
                >
                  Brands
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <div className="invisible absolute left-0 top-full z-40 w-64 translate-y-1 rounded-xl border bg-popover p-2 opacity-0 shadow-card-hover transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {brands.map((brand) => (
                    <Link
                      key={brand.slug}
                      to="/brand/$slug"
                      params={{ slug: brand.slug }}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface hover:text-primary"
                    >
                      <span className="truncate">{brand.label}</span>
                      <span className="text-xs text-muted-foreground">{brand.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {collectionList.length > 0 && (
              <Link
                to="/collections"
                activeProps={{ className: "text-primary" }}
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary"
              >
                Collections
              </Link>
            )}

            {primaryLinks.map((category) => (
              <Link
                key={category.slug}
                to="/category/$slug"
                params={{ slug: category.slug }}
                activeProps={{ className: "text-primary" }}
                className="hidden rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary xl:block"
              >
                {category.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search products"
              className="flex h-10 w-56 items-center gap-2 rounded-full border px-4 text-sm text-muted-foreground transition-colors hover:border-primary"
            >
              <Search className="h-4 w-4" />
              Search products…
            </button>
            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishlistCount} items`}
              className="relative grid h-10 w-10 place-items-center rounded-md text-foreground transition-colors hover:bg-surface"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <CartDrawer />
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
