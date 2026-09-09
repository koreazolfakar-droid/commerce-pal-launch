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

/** Brand/category campaign blocks powered by the live catalogue. */
export function PromoBanners({ slots }: { slots: PromoSlot[] }) {
  const visible = slots.filter((slot) => slot.facet.count > 0);
  if (!visible.length) return null;
  return (
    <section className="space-y-7" aria-label="Featured collections">
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
            className="group relative grid min-h-[300px] overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#111827] p-7 text-white shadow-float gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)] sm:p-10"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,rgba(208,156,41,.18),transparent_30%)]"
            />
            <div
              className={`relative z-10 flex min-w-0 flex-col justify-center ${flip ? "sm:order-2" : ""}`}
            >
              {slot.kind === "brand" ? (
                <BrandLogo
                  slug={slot.facet.slug}
                  label={slot.facet.label}
                  size={54}
                  className="rounded-xl bg-white/95 p-1.5"
                />
              ) : (
                <span className="text-[11px] font-black uppercase tracking-[.18em] text-primary">
                  Featured collection
                </span>
              )}
              <h3 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                {slot.facet.label}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
                Explore {slot.facet.count} products currently available
                {price ? `, starting from ${formatPrice(price.amount, price.currencyCode)}` : ""}.
              </p>
              <span className="mt-6 inline-flex max-w-full w-fit items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground">
                Explore {slot.facet.label} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div
              className={`relative z-10 flex min-h-[210px] items-center justify-center ${flip ? "sm:order-1" : ""}`}
            >
              {image && (
                <img
                  src={cdnImage(image.url, 760)}
                  srcSet={cdnSrcSet(image.url, 760)}
                  sizes="(min-width: 640px) 500px, 88vw"
                  alt={image.altText ?? slot.facet.label}
                  loading="lazy"
                  decoding="async"
                  width={760}
                  height={760}
                  className="h-[250px] w-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-[1.03] sm:h-[310px]"
                />
              )}
            </div>
          </Link>
        );
      })}
    </section>
  );
}
