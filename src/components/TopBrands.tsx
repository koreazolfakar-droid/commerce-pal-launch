import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import type { ShopifyBrand } from "@/lib/brandDirectory";

/** Elegant brand pills: Shopify-served logo, product count, scroll rail on mobile. */
export function TopBrands({ brands }: { brands: ShopifyBrand[] }) {
  if (brands.length === 0) return null;

  return (
    <section aria-labelledby="top-brands">
      <div className="mb-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:mb-4 sm:px-0">
        <div className="min-w-0">
          <h2 id="top-brands" className="truncate text-base font-semibold tracking-tight sm:text-lg lg:text-xl">
            Top brands
          </h2>
          <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
            Official brands available in your store right now
          </p>
        </div>
        <Link
          to="/shop"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline sm:text-sm"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="scroll-rail flex snap-x snap-mandatory gap-3 px-4 pb-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:px-0 lg:grid-cols-6">
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            to="/brand/$slug"
            params={{ slug: brand.slug }}
            className="group flex w-20 shrink-0 snap-start flex-col items-center gap-1.5 text-center transition-transform active:scale-95 sm:w-auto sm:gap-2 sm:rounded-2xl sm:border sm:bg-card sm:px-4 sm:py-5 sm:shadow-card sm:hover:border-primary"
          >
            <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full border bg-logo-surface p-2 shadow-card transition-colors group-hover:border-primary sm:h-12 sm:w-12 sm:rounded-xl sm:p-1.5">
              <BrandLogo
                slug={brand.slug}
                label={brand.label}
                size={32}
                {...(brand.image ? { imageUrl: brand.image } : {})}
                className="max-h-10 max-w-10 object-contain sm:max-h-9 sm:max-w-9"
              />
            </span>
            <span className="w-full truncate text-[11px] font-bold sm:mt-1 sm:text-[13px]">
              {brand.label}
            </span>
            <span className="whitespace-nowrap text-[9px] font-medium text-muted-foreground sm:text-[11px]">
              {brand.count} product{brand.count === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
