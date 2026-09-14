import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import type { ShopifyBrand } from "@/lib/brandDirectory";
import { useLanguage } from "@/lib/i18n";

/** Dense logo grid inspired by premium electronics retailers, still fully Shopify-driven. */
export function TopBrands({ brands }: { brands: ShopifyBrand[] }) {
  const { t } = useLanguage();
  if (!brands.length) return null;
  return (
    <section aria-labelledby="top-brands" data-testid="top-brands">
      <div className="home-section-header">
        <div>
          <h2 id="top-brands" className="text-lg font-extrabold tracking-tight">
            {t("topBrands")}
          </h2>
        </div>
        <Link
          to="/brands"
          className="inline-flex items-center gap-1 text-xs font-bold text-primary sm:text-sm"
        >
          {t("viewAll")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>
      <div className="scroll-rail brand-logo-rail">
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            to="/brand/$slug"
            params={{ slug: brand.slug }}
            className="brand-logo-tile group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={brand.label}
          >
            <span className="grid min-h-12 w-full place-items-center">
              <BrandLogo
                slug={brand.slug}
                label={brand.label}
                size={36}
                wordmark
                normalizeForRail
                {...(brand.image ? { imageUrl: brand.image } : {})}
              />
            </span>
            <span className="max-w-full break-words text-xs font-medium leading-snug text-black/70">
              {brand.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
