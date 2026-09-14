import { Link } from "@tanstack/react-router";

import { BrandLogo } from "@/components/BrandLogo";
import type { ShopifyBrand } from "@/lib/brandDirectory";
import { useLanguage } from "@/lib/i18n";

/**
 * Premium, minimal brand strip for the homepage.
 *
 * Keep this component presentation-only: each logo still links to the existing
 * brand route, while the strip stays horizontally scrollable on touch devices.
 */
export function TopBrands({ brands }: { brands: ShopifyBrand[] }) {
  const { t } = useLanguage();
  if (!brands.length) return null;

  return (
    <section aria-labelledby="top-brands" data-testid="top-brands">
      <div className="home-section-header">
        <h2 id="top-brands" className="text-lg font-extrabold tracking-tight">
          {t("topBrands")}
        </h2>
        <Link
          to="/brands"
          className="inline-flex min-h-11 items-center text-xs font-bold text-primary transition-colors hover:text-primary/80 hover:underline sm:text-sm"
        >
          {t("viewAll")}
        </Link>
      </div>

      <div className="relative -mx-4 sm:mx-0">
        <div
          className="flex touch-pan-x snap-x snap-proximity items-center gap-6 overflow-x-auto px-4 py-3 pe-12 scroll-smooth overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-8 sm:px-0 sm:pe-0 lg:gap-10"
          role="list"
          aria-label={t("topBrands")}
        >
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              to="/brand/$slug"
              params={{ slug: brand.slug }}
              role="listitem"
              aria-label={brand.label}
              className="group flex h-16 w-[6.75rem] shrink-0 snap-start select-none items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:h-[4.5rem] sm:w-[7.5rem] md:transition-transform md:duration-[260ms] md:ease-out md:hover:-translate-y-0.5 md:hover:scale-[1.08] active:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <BrandLogo
                slug={brand.slug}
                label={brand.label}
                size={42}
                wordmark
                frameless
                normalizeForRail
                {...(brand.image ? { imageUrl: brand.image } : {})}
              />
            </Link>
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 end-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
