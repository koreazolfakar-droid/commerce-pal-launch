import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Columns2,
  Headphones,
  Heart,
  LifeBuoy,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
} from "lucide-react";
import { useState } from "react";

import { CartDrawer } from "@/components/CartDrawer";
import { BrandLogo } from "@/components/BrandLogo";
import { SearchOverlay } from "@/components/SearchOverlay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useHydrated } from "@/hooks/useHydrated";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { displayCollections, type CatalogFacet } from "@/lib/taxonomy";
import { useWishlistStore } from "@/stores/wishlistStore";

const UTILITY = [
  { icon: Truck, text: "Free delivery on eligible orders" },
  { icon: ShieldCheck, text: "Official warranty" },
  { icon: RotateCcw, text: "Easy returns" },
  { icon: ShieldCheck, text: "Secure checkout" },
];

/** Requested navigation order, resolved against the live Shopify taxonomy. */
const NAV_ORDER: Array<{ label: string; slugs: string[] }> = [
  { label: "Smartphones", slugs: ["smartphones"] },
  { label: "Tablets", slugs: ["tablets"] },
  { label: "Laptops", slugs: ["laptops"] },
  { label: "Audio", slugs: ["audio", "headphones"] },
  { label: "Accessories", slugs: ["accessories", "cases", "chargers", "cables", "power-banks"] },
  { label: "Smart Home", slugs: ["smart-home", "tv-displays"] },
  { label: "Wearables", slugs: ["smartwatches", "wearables"] },
];

function orderedNav(categories: CatalogFacet[]) {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const nav: Array<{ label: string; slug: string }> = [];
  for (const entry of NAV_ORDER) {
    const match = entry.slugs.map((slug) => bySlug.get(slug)).find(Boolean);
    if (match) nav.push({ label: entry.label, slug: match.slug });
  }
  return nav;
}

/** Desktop header: black utility bar, main bar with search, then category navigation. */
export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const hydrated = useHydrated();
  const wishlistCount = useWishlistStore((state) => state.handles.length);

  const { data: catalog } = useQuery(catalogQueryOptions());
  const { data: collections } = useQuery(collectionsQueryOptions());

  // Dynamic navigation waits one client frame so SSR and the first client render match.
  const categories = hydrated ? catalog?.categories ?? [] : [];
  const brands = hydrated ? catalog?.brands ?? [] : [];
  const collectionList = hydrated ? displayCollections(collections ?? []) : [];
  const nav = orderedNav(categories);

  return (
    <>
      <div className="bg-hero text-hero-muted">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-2 text-[11.5px]">
          <ul className="flex items-center gap-5">
            {UTILITY.map((item, index) => (
              <li key={index} className="flex items-center gap-1.5 whitespace-nowrap">
                <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                {item.text}
              </li>
            ))}
          </ul>
          <ul className="flex items-center gap-5 font-semibold">
            <li>
              <Link to="/cart" className="flex items-center gap-1.5 whitespace-nowrap hover:text-primary">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.7} /> Track order
              </Link>
            </li>
            <li>
              <Link to="/collections" className="flex items-center gap-1.5 whitespace-nowrap hover:text-primary">
                <LifeBuoy className="h-3.5 w-3.5" strokeWidth={1.7} /> Help
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-6 px-4 py-3.5">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-card">
              S
            </span>
            <span className="truncate text-xl font-extrabold tracking-tight">Space Cell</span>
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search products"
            className="flex h-11 w-full items-center gap-2.5 rounded-full border bg-surface px-5 text-[13px] text-muted-foreground transition-colors hover:border-primary"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Search phones, tablets, audio, accessories…</span>
          </button>

          <div className="flex items-center justify-end gap-1">
            <ThemeToggle />
            <Link
              to="/compare"
              search={{ products: undefined }}
              aria-label="Compare smartphones"
              className="press grid h-10 w-10 place-items-center rounded-full text-foreground transition-colors hover:bg-surface"
            >
              <Columns2 className="h-5 w-5" strokeWidth={1.8} />
            </Link>
            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishlistCount} items`}
              className="press relative grid h-10 w-10 place-items-center rounded-full text-foreground transition-colors hover:bg-surface"
            >
              <Heart className="h-5 w-5" strokeWidth={1.8} />
              {wishlistCount > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link
              to="/wishlist"
              aria-label="Your account area"
              className="press grid h-10 w-10 place-items-center rounded-full text-foreground transition-colors hover:bg-surface"
            >
              <User className="h-5 w-5" strokeWidth={1.8} />
            </Link>
            <CartDrawer />
          </div>
        </div>

        <nav className="border-t" aria-label="Primary">
          <div className="mx-auto flex max-w-7xl items-center gap-0.5 px-4 py-1.5">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-surface"
            >
              Home
            </Link>

            {nav.map((item) => (
              <Link
                key={item.slug}
                to="/category/$slug"
                params={{ slug: item.slug }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-surface"
              >
                {item.label}
              </Link>
            ))}

            {brands.length > 0 && (
              <div className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-surface"
                >
                  Brands
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <div className="invisible absolute left-0 top-full z-40 w-64 translate-y-1 rounded-2xl border bg-popover p-2 opacity-0 shadow-float transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {brands.map((brand) => (
                    <Link
                      key={brand.slug}
                      to="/brand/$slug"
                      params={{ slug: brand.slug }}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors hover:bg-surface hover:text-primary"
                    >
                      <BrandLogo slug={brand.slug} label={brand.label} size={24} className="rounded-md" />
                      <span className="min-w-0 flex-1 truncate">{brand.label}</span>
                      <span className="text-xs text-muted-foreground">{brand.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {categories.length > 0 && (
              <div className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-surface"
                >
                  All categories
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <div className="invisible absolute left-0 top-full z-40 w-[34rem] translate-y-1 rounded-2xl border bg-popover p-3 opacity-0 shadow-float transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="grid grid-cols-2 gap-1">
                    {categories.map((category) => (
                      <Link
                        key={category.slug}
                        to="/category/$slug"
                        params={{ slug: category.slug }}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-surface hover:text-primary"
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

            {collectionList.length > 0 && (
              <Link
                to="/collections"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-surface"
              >
                Collections
              </Link>
            )}

            <Link
              to="/shop"
              search={{ availability: "on-sale" } as never}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-[13px] font-bold text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Sparkles className="h-3.5 w-3.5" /> Deals
            </Link>
            <Link
              to="/collections"
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-surface"
            >
              <Headphones className="h-3.5 w-3.5" /> Support
            </Link>
          </div>
        </nav>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
