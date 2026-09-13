import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Columns2, Heart, LayoutGrid, Search, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { SearchOverlay } from "@/components/SearchOverlay";
import { MobileMenu } from "@/components/MobileMenu";
import { categoryLabel, useLanguage } from "@/lib/i18n";
import { useHydrated } from "@/hooks/useHydrated";
import { catalogQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { STORE_NAME } from "@/lib/storeConfig";

function Badge({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Mobile app style top bar: brand, quick actions, search field and category strip. */
export function MobileTopBar({
  activeSlug,
  showCategoryRail = true,
}: {
  activeSlug?: string;
  showCategoryRail?: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { t, language } = useLanguage();
  const hydrated = useHydrated();
  const wishlistCount = useWishlistStore((state) => state.handles.length);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  const { data: catalog, isLoading } = useQuery(catalogQueryOptions());
  const list = hydrated ? (catalog?.categories ?? []) : [];

  return (
    <>
      {/* Only the main header row stays sticky. */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 shadow-[0_8px_24px_-22px_rgba(15,23,42,.55)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-3 py-2.5">
          <MobileMenu />
          <Link
            to="/"
            aria-label={`${STORE_NAME} home`}
            className="flex min-w-0 flex-1 items-center justify-center gap-2"
          >
            <img
              src="/logo.svg"
              alt={STORE_NAME}
              width={51}
              height={34}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-[34px] w-auto shrink-0 object-contain drop-shadow-sm"
            />
            <span className="truncate text-[17px] font-black tracking-[-0.025em]">
              {STORE_NAME}
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-0.5">
            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishlistCount} saved`}
              className="press relative hidden h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-surface sm:grid"
            >
              <Heart className="h-[21px] w-[21px]" strokeWidth={1.9} />
              <Badge value={wishlistCount} />
            </Link>
            <button
              type="button"
              onClick={() => document.dispatchEvent(new CustomEvent("space-cell:open-cart"))}
              aria-label={`Cart, ${cartCount} items`}
              className="press relative grid h-10 w-10 place-items-center rounded-full border border-transparent transition-colors hover:border-border hover:bg-surface"
            >
              <ShoppingBag className="h-[21px] w-[21px]" strokeWidth={1.9} />
              <Badge value={cartCount} />
            </button>
          </div>
        </div>
      </header>

      {/* Search + compact category rail scroll away with the page. */}
      <div className="border-b border-border/50 bg-background lg:hidden">
        <div className="mx-auto flex max-w-md min-w-0 items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="press flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-4 text-start text-sm text-muted-foreground shadow-sm transition hover:border-primary/20 hover:bg-accent/60"
          >
            <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="truncate">{t("search")}</span>
          </button>
          <Link
            to="/compare"
            search={{ products: undefined }}
            aria-label="Compare smartphones"
            className="press grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border/70 bg-card shadow-sm transition hover:border-primary/20 hover:bg-accent/60"
          >
            <Columns2 className="h-5 w-5" strokeWidth={1.9} />
          </Link>
        </div>

        {showCategoryRail && (list.length > 0 || isLoading) && (
          <nav aria-label="Product categories" className="scroll-rail flex gap-2 px-4 pb-2">
            {isLoading && list.length === 0
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="shimmer h-8 w-20 shrink-0 rounded-full bg-surface"
                    aria-hidden
                  />
                ))
              : null}
            {list.length > 0 && (
              <Link
                to="/shop"
                className={cn(
                  "press flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                  !activeSlug
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-surface text-muted-foreground hover:bg-accent",
                )}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                {t("all")}
              </Link>
            )}
            <Link
              to="/used-phones"
              className="press flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-accent px-3 text-[12px] font-semibold text-accent-foreground"
            >
              {t("usedPhones")}
            </Link>
            {list.map((category) => {
              const Icon = category.icon;
              const active = activeSlug === category.slug;
              return (
                <Link
                  key={category.slug}
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className={cn(
                    "press flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-surface text-muted-foreground hover:bg-accent",
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} /> : null}
                  <span className="max-w-28 truncate">{categoryLabel(category, language)}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
