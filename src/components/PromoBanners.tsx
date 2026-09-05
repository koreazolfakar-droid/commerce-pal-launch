import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import { formatPrice, type ShopifyProduct } from "@/lib/shopify";
import type { CatalogFacet } from "@/lib/taxonomy";

export type PromoSlot = {
  kind: "brand" | "category";
  facet: CatalogFacet;
  product: ShopifyProduct | undefined;
};

/**
 * Wide promotional banners (Samsung, Laptops, Audio …). Every slot is resolved
 * from the live catalogue — label, product count, image and "from" price are real.
 */
export function PromoBanners({ slots }: { slots: PromoSlot[] }) {
  const visible = slots.filter((slot) => slot.facet.count > 0);
  if (visible.length === 0) return null;

  return (
    <section className="space-y-4 px-4 sm:px-0" aria-label="Featured collections">
      {visible.map((slot, index) => {
        const image = slot.product?.node.images.edges[0]?.node;
        const price = slot.product?.node.priceRange.minVariantPrice;
        const flip = index % 2 === 1;

        return (
          <Link
            key={`${slot.kind}-${slot.facet.slug}`}
            {...(slot.kind === "brand"
              ? ({ to: "/brand/$slug", params: { slug: slot.facet.slug } } as const)
              : ({ to: "/category/$slug", params: { slug: slot.facet.slug } } as const))}
            className="card-lift grid grid-cols-[minmax(0,1fr)_36%] items-center gap-4 overflow-hidden rounded-3xl border border-hero-border bg-hero p-5 text-hero-foreground shadow-card transition-all hover:shadow-float sm:grid-cols-[minmax(0,1fr)_30%] sm:p-9"
          >
            <div className={`min-w-0 ${flip ? "sm:order-2 sm:pl-6" : ""}`}>
              {slot.kind === "brand" ? (
                <span className="inline-grid h-11 w-16 place-items-center rounded-xl bg-background/95 px-2">
                  <BrandLogo slug={slot.facet.slug} label={slot.facet.label} size={28} />
                </span>
              ) : (
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  Collection
                </span>
              )}
              <h3 className="mt-3 truncate text-xl font-extrabold tracking-tight sm:text-2xl">
                {slot.facet.label}
              </h3>
              <p className="mt-1.5 text-xs text-hero-muted sm:text-[13px]">
                {slot.facet.count} product{slot.facet.count === 1 ? "" : "s"} available
                {price ? ` · from ${formatPrice(price.amount, price.currencyCode)}` : ""}
              </p>
              <span className="press mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground sm:text-[13px]">
                Shop {slot.facet.label} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>

            <span
              className={`block aspect-[4/3] max-h-52 ${flip ? "sm:order-1" : ""}`}
              aria-hidden={!image}
            >
              {image && (
                <img
                  src={cdnImage(image.url, 480)}
                  srcSet={cdnSrcSet(image.url, 480)}
                  sizes="(min-width: 640px) 300px, 36vw"
                  alt={image.altText ?? slot.facet.label}
                  loading="lazy"
                  decoding="async"
                  width={480}
                  height={480}
                  className="h-full w-full object-contain drop-shadow-2xl"
                />
              )}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
