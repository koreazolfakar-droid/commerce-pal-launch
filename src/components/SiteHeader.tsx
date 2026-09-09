import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  BatteryCharging,
  Cable,
  Grid2x2,
  Headphones,
  Laptop,
  Smartphone,
  Tablet,
  Tag,
  Watch,
  PlugZap,
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

import { SHOP_ACCOUNT_URL } from "@/lib/infoPages";
import { CartDrawer } from "@/components/CartDrawer";
import { BrandLogo } from "@/components/BrandLogo";
import { SearchOverlay } from "@/components/SearchOverlay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { useHydrated } from "@/hooks/useHydrated";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { STORE_NAME } from "@/lib/storeConfig";
import { displayCollections, type CatalogFacet } from "@/lib/taxonomy";
import { useWishlistStore } from "@/stores/wishlistStore";

const UTILITY = [
  { icon: Truck, key: "freeDelivery" as const },
  { icon: ShieldCheck, key: "warranty" as const },
  { icon: RotateCcw, key: "returns" as const },
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

const NAV_ICONS: Record<string, typeof Smartphone> = {
  Smartphones: Smartphone,
  Tablets: Tablet,
  Laptops: Laptop,
  Audio: Headphones,
  Accessories: PlugZap,
  "Smart Home": Grid2x2,
  Wearables: Watch,
};

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
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { t, direction, language } = useLanguage();
  const hydrated = useHydrated();
  const wishlistCount = useWishlistStore((state) => state.handles.length);

  const { data: catalog } = useQuery(catalogQueryOptions());
  const { data: collections } = useQuery(collectionsQueryOptions());

  // Dynamic navigation waits one client frame so SSR and the first client render match.
  const categories = hydrated ? (catalog?.categories ?? []) : [];
  const brands = hydrated ? (catalog?.brands ?? []) : [];
  const collectionList = hydrated ? displayCollections(collections ?? []) : [];
  const nav = orderedNav(categories);

  return (
    <>
      <div className="bg-hero text-hero-muted">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-2 text-[11px]">
          <ul className="flex items-center gap-5">
            {UTILITY.map((item, index) => (
              <li key={index} className="flex items-center gap-1.5 whitespace-nowrap">
                <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                {t(item.key)}
              </li>
            ))}
          </ul>
          <ul className="flex items-center gap-5 font-semibold">
            <li>
              <a
                href={SHOP_ACCOUNT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 whitespace-nowrap hover:text-primary"
              >
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.7} /> {t("trackOrder")}
              </a>
            </li>
            <li>
              <a
                href={SHOP_ACCOUNT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 whitespace-nowrap hover:text-primary"
              >
                <User className="h-3.5 w-3.5" strokeWidth={1.7} /> {t("account")}
              </a>
            </li>
            <li>
              <Link
                to="/help"
                className="flex items-center gap-1.5 whitespace-nowrap hover:text-primary"
              >
                <LifeBuoy className="h-3.5 w-3.5" strokeWidth={1.7} /> {t("help")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 px-4 py-2">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src="/logo.png"
              alt={STORE_NAME}
              width={32}
              height={32}
              className="h-8 w-auto shrink-0 object-contain"
            />
            <span className="truncate text-[19px] font-extrabold tracking-tight">{STORE_NAME}</span>
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={t("search")}
            className="flex h-10 w-full items-center gap-2.5 rounded-full border bg-surface px-5 text-[13px] text-muted-foreground transition-colors hover:border-primary"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("search")}</span>
          </button>

          <div className="flex items-center justify-end gap-1">
            <LanguageToggle compact />
            <ThemeToggle />
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
            <CartDrawer />
          </div>
        </div>

        <nav className="border-t" aria-label="Primary">
          <div className="mx-auto flex max-w-7xl min-w-0 items-center gap-0.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-semibold transition-colors hover:bg-surface"
            >
              <Grid2x2 className="h-3.5 w-3.5" /> {t("all")}
            </Link>

            {nav.map((item) => (
              <Link
                key={item.slug}
                to="/category/$slug"
                params={{ slug: item.slug }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-semibold transition-colors hover:bg-surface"
              >
                {(() => {
                  const Icon = NAV_ICONS[item.label];
                  return Icon ? <Icon className="h-3.5 w-3.5" /> : null;
                })()}
                {(
                  {
                    Smartphones: t("smartphones"),
                    Tablets: t("tablets"),
                    Laptops: t("laptops"),
                    Audio: t("audio"),
                    Accessories: t("accessories"),
                    "Smart Home": t("smartHome"),
                    Wearables: t("wearables"),
                  } as Record<string, string>
                )[item.label] ?? item.label}
              </Link>
            ))}

            {brands.length > 0 && (
              <DropdownMenu dir={direction} open={brandsOpen} onOpenChange={setBrandsOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={brandsOpen}
                    className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold hover:bg-surface focus-within:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:bg-accent"
                  >
                    <Tag className="h-4 w-4" aria-hidden="true" /> {t("brands")}
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 rounded-2xl p-2">
                  {brands.map((brand) => (
                    <DropdownMenuItem key={brand.slug} asChild>
                      <Link
                        to="/brand/$slug"
                        params={{ slug: brand.slug }}
                        className="flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm"
                      >
                        <BrandLogo slug={brand.slug} label={brand.label} size={24} />
                        <span className="min-w-0 flex-1 truncate">{brand.label}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {brand.count}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {categories.length > 0 && (
              <DropdownMenu dir={direction} open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={categoriesOpen}
                    className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold hover:bg-surface focus-within:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:bg-accent"
                  >
                    {t("allCategories")}
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="grid w-[min(34rem,calc(100vw-2rem))] grid-cols-2 gap-1 rounded-2xl p-3"
                >
                  {categories.map((category) => (
                    <DropdownMenuItem key={category.slug} asChild>
                      <Link
                        to="/category/$slug"
                        params={{ slug: category.slug }}
                        className="flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm"
                      >
                        {category.icon && (
                          <category.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        )}
                        <span className="min-w-0 flex-1 whitespace-normal break-words">
                          {categoryLabel(category, language)}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {category.count}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {collectionList.length > 0 && (
              <Link
                to="/collections"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-surface"
              >
                {t("collections")}
              </Link>
            )}

            <Link
              to="/used-phones"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold transition-colors hover:bg-surface"
            >
              {t("usedPhones")}
            </Link>

            <Link
              to="/shop"
              search={{ availability: "on-sale" } as never}
              className="ms-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-[12px] font-bold text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Sparkles className="h-3.5 w-3.5" /> {t("deals")}
            </Link>
            <Link
              to="/help"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-surface"
            >
              <Headphones className="h-3.5 w-3.5" /> {t("support")}
            </Link>
          </div>
        </nav>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
