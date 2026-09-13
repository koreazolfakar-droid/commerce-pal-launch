import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";

import { TrustBenefitsRail } from "@/components/TrustBenefitsRail";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import { useLanguage } from "@/lib/i18n";
import { formatPrice, productDiscountPercent, type ShopifyProduct } from "@/lib/shopify";

function featuredProduct(products: ShopifyProduct[]) {
  return (
    products.find(
      (product) =>
        product.node.availableForSale !== false && Boolean(product.node.images.edges[0]?.node.url),
    ) ??
    products.find((product) => Boolean(product.node.images.edges[0]?.node.url)) ??
    products[0] ??
    null
  );
}

export function HomeHero({ products }: { products: ShopifyProduct[] }) {
  const { t, language } = useLanguage();
  const featured = featuredProduct(products);

  if (!featured) return <TrustBenefitsRail />;

  const node = featured.node;
  const image = node.images.edges[0]?.node;
  const price = node.priceRange.minVariantPrice;
  const discount = productDiscountPercent(featured);
  const inStock = node.availableForSale !== false;
  const intro =
    language === "ar"
      ? "اختيار مميز من Space Call — جهاز واحد، تركيز أوضح، وتجربة شراء أسرع."
      : "A Space Call spotlight — one featured device, clearer focus, faster shopping.";

  return (
    <>
      <section
        aria-label={t("featuredTechnology")}
        data-testid="home-hero"
        data-hero-handle={node.handle}
        className="group relative isolate min-h-[22rem] min-w-0 overflow-hidden rounded-[clamp(1.25rem,3vw,2rem)] border border-hero-border bg-hero text-hero-foreground shadow-float sm:min-h-[25rem] lg:min-h-[28rem]"
      >
        {image?.url ? (
          <Link
            to="/product/$handle"
            params={{ handle: node.handle }}
            aria-label={node.title}
            className="absolute inset-0"
          >
            <img
              src={cdnImage(image.url, 1400)}
              srcSet={cdnSrcSet(image.url, 1400)}
              sizes="(max-width: 767px) 100vw, (min-width: 1280px) 760px, 62vw"
              alt={image.altText ?? node.title}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              className="h-full w-full object-cover object-[72%_center] opacity-70 transition duration-700 ease-out group-hover:scale-[1.015] sm:opacity-80 md:absolute md:end-0 md:w-[64%] md:object-[66%_center] md:opacity-100"
            />
          </Link>
        ) : null}

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hero/45 md:hidden" />

        <div className="relative z-10 flex min-h-[22rem] w-[76%] flex-col justify-center bg-hero/85 px-5 py-6 backdrop-blur-[2px] sm:min-h-[25rem] sm:w-[62%] sm:px-8 sm:py-8 md:w-[48%] md:bg-hero/95 lg:min-h-[28rem] lg:px-10 lg:py-10">
          <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hero-border bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-hero-muted backdrop-blur sm:text-[11px]">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t("featuredTechnology")}
            </span>
            {discount !== null && (
              <span className="rounded-full bg-primary px-2.5 py-1.5 text-[10px] font-black text-primary-foreground sm:px-3 sm:text-[11px]">
                -{discount}%
              </span>
            )}
          </div>

          {node.vendor && (
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-hero-muted sm:mb-2 sm:text-xs">
              {node.vendor}
            </p>
          )}

          <h2 className="line-clamp-3 text-[clamp(1.65rem,7vw,3.8rem)] font-black leading-[1.01] tracking-[-0.045em] text-hero-foreground">
            {node.title}
          </h2>

          <p className="mt-3 line-clamp-2 max-w-xl text-xs leading-5 text-hero-muted sm:mt-4 sm:text-sm sm:leading-6 lg:text-base">
            {node.description?.trim() || intro}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-5 sm:gap-3">
            <span className="text-xl font-black tracking-tight sm:text-2xl">
              {formatPrice(price.amount, price.currencyCode)}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-hero-muted sm:text-xs">
              <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
              {t(inStock ? "inStock" : "outOfStock")}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 sm:mt-6 sm:gap-2.5">
            <Link
              to="/product/$handle"
              params={{ handle: node.handle }}
              className="press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-lg transition hover:brightness-105 sm:gap-2 sm:px-5 sm:text-sm"
            >
              {t("shopNow")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link
              to="/shop"
              className="press inline-flex min-h-11 items-center justify-center rounded-full border border-hero-border bg-white/5 px-4 py-2.5 text-xs font-bold text-hero-foreground backdrop-blur transition hover:bg-white/10 sm:px-5 sm:text-sm"
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-3 sm:mt-4">
        <TrustBenefitsRail />
      </div>
    </>
  );
}
