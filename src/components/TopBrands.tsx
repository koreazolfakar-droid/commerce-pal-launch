import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import type { ShopifyBrand } from "@/lib/brandDirectory";

/** Elegant brand pills: Shopify-served logo, product count, scroll rail on mobile. */
export function TopBrands({ brands }: { brands: ShopifyBrand[] }) {
  if (brands.length === 0) return null;

  return (
    <section aria-labelledby="top-brands">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-4 sm:px-0">
        <div className="min-w-0">
          <h2 id="top-brands" className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            Top brands
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
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

      <div className="scroll-rail flex gap-3 px-4 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            to="/brand/$slug"
            params={{ slug: brand.slug }}
            className="card-lift flex w-36 shrink-0 flex-col items-center gap-2 rounded-2xl border bg-card px-4 py-5 text-center shadow-card transition-all hover:border-primary sm:w-auto"
          >
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white p-1.5">
              <BrandLogo
                slug={brand.slug}
                label={brand.label}
                size={36}
                {...(brand.image ? { imageUrl: brand.image } : {})}
                className="max-h-9 max-w-9 object-contain"
              />
            </span>
            <span className="mt-1 truncate text-[13px] font-semibold tracking-tight">
              {brand.label}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {brand.count} product{brand.count === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
