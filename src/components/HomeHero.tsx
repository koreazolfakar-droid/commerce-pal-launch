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
        className="group relative isolate min-h-[22.5rem] min-w-0 overflow-hidden rounded-[1.25rem] border border-hero-border bg-hero text-hero-foreground shadow-float sm:min-h-[25rem] sm:rounded-[clamp(1.25rem,3vw,2rem)] lg:min-h-[28rem]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-[-16%] w-[68%] rounded-full bg-primary/15 blur-3xl sm:end-[-8%] sm:w-[55%]"
        />

        {image?.url ? (
          <Link
            to="/product/$handle"
            params={{ handle: node.handle }}
            aria-label={node.title}
            data-testid="home-hero-media"
            className="absolute inset-y-0 end-0 w-[60%] overflow-hidden sm:inset-0 sm:w-full"
          >
            <img
              src={cdnImage(image.url, 1400)}
              srcSet={cdnSrcSet(image.url, 1400)}
              sizes="(max-width: 639px) 60vw, (max-width: 767px) 100vw, (min-width: 1280px) 760px, 62vw"
              alt={image.altText ?? node.title}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              className="absolute inset-y-0 end-0 h-full w-full object-cover object-[68%_center] opacity-95 transition duration-700 ease-out group-hover:scale-[1.015] sm:w-[64%] sm:object-[66%_center] sm:opacity-100"
            />
          </Link>
        ) : null}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 w-[68%] bg-gradient-to-r from-hero via-hero/95 to-transparent rtl:bg-gradient-to-l sm:w-[66%] md:w-[64%]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-hero/90 to-transparent sm:hidden"
        />

        <div
          data-testid="home-hero-content"
          className="relative z-10 flex min-h-[22.5rem] w-[66%] flex-col justify-center px-4 py-5 sm:min-h-[25rem] sm:w-[62%] sm:px-8 sm:py-8 md:w-[52%] lg:min-h-[28rem] lg:w-[50%] lg:px-10 lg:py-10"
        >
          <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:mb-4 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hero-border bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-hero-muted backdrop-blur sm:px-3 sm:py-1.5 sm:text-[11px]">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t("featuredTechnology")}
            </span>
            {discount !== null && (
              <span className="rounded-full bg-primary px-2.5 py-1 text-[9px] font-black text-primary-foreground sm:px-3 sm:py-1.5 sm:text-[11px]">
                -{discount}%
              </span>
            )}
          </div>

          {node.vendor && (
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-hero-muted sm:mb-2 sm:text-xs">
              {node.vendor}
            </p>
          )}

          <h2 className="line-clamp-3 max-w-[15rem] text-[clamp(1.6rem,7.4vw,2.3rem)] font-black leading-[0.98] tracking-[-0.045em] text-hero-foreground sm:max-w-none sm:text-[clamp(2rem,5vw,3.8rem)] sm:leading-[1.01]">
            {node.title}
          </h2>

          <p className="mt-2 line-clamp-2 max-w-[15rem] text-[10px] leading-4 text-hero-muted sm:mt-4 sm:max-w-xl sm:text-sm sm:leading-6 lg:text-base">
            {node.description?.trim() || intro}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-hero-muted sm:text-xs">
              <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
              {t(inStock ? "inStock" : "outOfStock")}
            </span>
          </div>

          <div className="mt-2 text-xl font-black tracking-tight sm:mt-3 sm:text-2xl">
            {formatPrice(price.amount, price.currencyCode)}
          </div>

          <div className="mt-4 grid max-w-[15rem] grid-cols-[1.18fr_0.9fr] gap-2 sm:mt-6 sm:flex sm:max-w-none sm:flex-wrap sm:gap-2.5">
            <Link
              to="/product/$handle"
              params={{ handle: node.handle }}
              className="press inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-full bg-primary px-3 py-2.5 text-[11px] font-extrabold text-primary-foreground shadow-lg transition hover:brightness-105 sm:w-auto sm:gap-2 sm:px-5 sm:text-sm"
            >
              {t("shopNow")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link
              to="/shop"
              className="press inline-flex min-h-11 w-full items-center justify-center rounded-full border border-hero-border bg-white/5 px-3 py-2.5 text-[11px] font-bold text-hero-foreground backdrop-blur transition hover:bg-white/10 sm:w-auto sm:px-5 sm:text-sm"
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
