import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { brandMeta } from "@/lib/brands";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import type { ShopifyProduct } from "@/lib/shopify";
import type { CatalogFacet } from "@/lib/taxonomy";

/** Promotional brand banners generated from the live catalog (no fake brands). */
export function BrandBanners({
  brands,
  productOf,
}: {
  brands: CatalogFacet[];
  productOf: (slug: string) => ShopifyProduct | undefined;
}) {
  const featured = brands.slice(0, 2);
  if (featured.length === 0) return null;

  return (
    <section className="grid gap-4 px-4 sm:px-0 md:grid-cols-2" aria-label="Brand highlights">
      {featured.map((brand) => {
        const product = productOf(brand.slug);
        const image = product?.node.images.edges[0]?.node;
        const meta = brandMeta(brand.slug);

        return (
          <Link
            key={brand.slug}
            to="/brand/$slug"
            params={{ slug: brand.slug }}
            className="card-lift grid grid-cols-[minmax(0,1fr)_38%] items-center gap-3 overflow-hidden rounded-3xl border bg-surface p-5 shadow-card transition-all hover:border-primary sm:p-7"
          >
            <div className="min-w-0">
              <BrandLogo slug={brand.slug} label={brand.label} size={34} />
              <h3 className="mt-3 truncate text-lg font-extrabold tracking-tight sm:text-xl">
                {brand.label}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-[13px]">
                {meta.tagline ?? `${brand.count} product${brand.count === 1 ? "" : "s"} in stock`}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                Shop {brand.label} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <span className="media-frame block aspect-square rounded-2xl bg-transparent">
              {image && (
                <img
                  src={cdnImage(image.url, 360)}
                  srcSet={cdnSrcSet(image.url, 360)}
                  sizes="(min-width: 768px) 220px, 38vw"
                  alt={image.altText ?? brand.label}
                  loading="lazy"
                  decoding="async"
                  width={360}
                  height={360}
                  className="h-full w-full object-contain"
                />
              )}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
