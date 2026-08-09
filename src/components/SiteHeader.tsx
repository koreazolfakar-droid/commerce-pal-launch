import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Heart, Search, ShieldCheck, Truck, RotateCcw, User } from "lucide-react";
import { useState } from "react";

import { CartDrawer } from "@/components/CartDrawer";
import { SearchOverlay } from "@/components/SearchOverlay";
import { availableEntries, CATEGORIES, NAV_GROUPS } from "@/lib/catalog";
import { fetchCollections } from "@/lib/shopify";
import { useWishlistStore } from "@/stores/wishlistStore";

const TRUST = [
  { icon: Truck, text: "Free delivery on orders over $500" },
  { icon: ShieldCheck, text: "Official warranty • 100% authentic products" },
  { icon: RotateCcw, text: "Easy returns within 14 days" },
];

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const wishlistCount = useWishlistStore((state) => state.handles.length);

  const { data: collections } = useQuery({
    queryKey: ["shopify-collections"],
    queryFn: () => fetchCollections(50),
    staleTime: 5 * 60 * 1000,
  });
  const handles = new Set((collections ?? []).map((collection) => collection.handle));
  const mobileCategories = availableEntries(CATEGORIES, handles);

  return (
    <>
      <div className="border-b bg-surface text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4">
          <ul className="scroll-rail flex gap-6 py-2 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible">
            {TRUST.map((item, index) => (
              <li
                key={item.text}
                className={`flex shrink-0 items-center gap-2 ${
                  index === 1 ? "md:justify-center" : index === 2 ? "md:justify-end" : ""
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
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 lg:flex lg:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              S
            </span>
            <span className="truncate text-lg font-semibold tracking-tight">Space Cell</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              to="/"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: true }}
              className="rounded-md px-3 py-2 text-sm font-medium hover:text-primary"
            >
              Home
            </Link>
            {NAV_GROUPS.map((group) => {
              const children = group.children ? availableEntries(group.children, handles) : [];
              return (
                <div key={group.label} className="group relative">
                  <Link
                    to="/collections/$handle"
                    params={{ handle: group.handle ?? "" }}
                    className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium hover:text-primary"
                  >
                    {group.label}
                    {children.length > 0 && <ChevronDown className="h-3.5 w-3.5" />}
                  </Link>
                  {children.length > 0 && (
                    <div className="invisible absolute left-0 top-full z-40 min-w-48 translate-y-1 rounded-lg border bg-popover p-2 opacity-0 shadow-card-hover transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                      {children.map((child) => (
                        <Link
                          key={child.handle}
                          to="/collections/$handle"
                          params={{ handle: child.handle }}
                          className="block rounded-md px-3 py-2 text-sm hover:bg-surface hover:text-primary"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search products"
              className="hidden h-10 w-64 items-center gap-2 rounded-full border px-4 text-sm text-muted-foreground hover:border-primary lg:flex"
            >
              <Search className="h-4 w-4" />
              Search for products...
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search products"
              className="grid h-10 w-10 place-items-center rounded-md text-foreground hover:bg-surface lg:hidden"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label={`Wishlist, ${wishlistCount} items`}
              className="relative grid h-10 w-10 place-items-center rounded-md text-foreground hover:bg-surface"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {wishlistCount}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="Account"
              className="hidden h-10 w-10 place-items-center rounded-md text-foreground hover:bg-surface sm:grid"
            >
              <User className="h-5 w-5" />
            </button>
            <CartDrawer />
          </div>
        </div>

        {mobileCategories.length > 0 && (
          <nav className="border-t lg:hidden">
            <div className="scroll-rail mx-auto flex max-w-7xl gap-2 px-4 py-2">
              {mobileCategories.map((category) => (
                <Link
                  key={category.handle}
                  to="/collections/$handle"
                  params={{ handle: category.handle }}
                  className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {category.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
