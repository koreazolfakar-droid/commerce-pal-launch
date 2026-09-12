import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CreditCard,
  Grid2x2,
  Heart,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Tag,
  Truck,
} from "lucide-react";
import { ArrowRight } from "lucide-react";

import { ShopifyHeroCollections } from "@/components/ShopifyHeroCollections";
import { useHydrated } from "@/hooks/useHydrated";
import { cdnImage } from "@/lib/image";
import { useLanguage } from "@/lib/i18n";
import { catalogQueryOptions, collectionsQueryOptions } from "@/lib/queries";
import { generalWhatsAppUrl } from "@/lib/whatsapp";
import { useRecentlyViewedStore } from "@/stores/recentlyViewedStore";
import type { ShopifyProduct } from "@/lib/shopify";

const BENEFITS = [
  { icon: Truck, title: "benefitFreeDelivery", detail: "benefitEligibleOrders" },
  { icon: ShieldCheck, title: "benefitWarranty", detail: "benefitAuthentic" },
  { icon: RotateCcw, title: "benefitReturns", detail: "benefitReturnsPolicy" },
  { icon: CreditCard, title: "benefitSecurePayment", detail: "benefitEncryptedCheckout" },
] as const;

function ProductFallbackHero({ product }: { product: ShopifyProduct }) {
  const { t } = useLanguage();
  const node = product.node;
  const image = node.images.edges[0]?.node;
  const price = node.priceRange.minVariantPrice;

  return (
    <section
      className="group relative isolate min-h-[15rem] overflow-hidden rounded-[1.65rem] border border-border/70 bg-card shadow-card sm:min-h-[22rem] sm:rounded-[2rem] lg:min-h-[26rem]"
      data-testid="product-fallback-hero"
      aria-label={node.title}
    >
      {image ? (
        <img
          src={cdnImage(image.url, 1400)}
          alt={image.altText ?? node.title}
          width={1400}
          height={900}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-y-0 end-0 h-full w-[58%] object-contain p-[5%] transition-transform duration-700 group-hover:scale-[1.02] sm:w-[55%]"
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/94 to-background/30 rtl:bg-gradient-to-l sm:via-background/86 sm:to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/35 via-transparent to-transparent" />

      <div className="relative z-10 flex min-h-[15rem] max-w-[70%] flex-col justify-center p-5 sm:min-h-[22rem] sm:max-w-[55%] sm:p-8 lg:min-h-[26rem] lg:max-w-[48%] lg:p-10">
        <span className="mb-3 w-fit rounded-full border border-border/70 bg-card/85 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground shadow-sm backdrop-blur sm:text-xs">
          {node.vendor || "Space Call"}
        </span>
        <h2 className="text-balance text-2xl font-black leading-[1.02] tracking-[-0.04em] text-foreground sm:text-4xl lg:text-5xl">
          {node.title}
        </h2>
        {node.description && (
          <p className="mt-3 line-clamp-3 max-w-lg text-xs font-medium leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
            {node.description}
          </p>
        )}
        <p className="mt-4 text-lg font-black tracking-tight text-foreground sm:text-2xl">
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: price.currencyCode,
            maximumFractionDigits: 2,
          }).format(Number(price.amount))}
        </p>
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          className="press mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:mt-6 sm:min-h-12 sm:px-6"
        >
          {t("viewAll")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export function BenefitsBar({ compact = false }: { compact?: boolean } = {}) {
  const { t } = useLanguage();
  const hydrated = useHydrated();
  const { data: collections = [] } = useQuery({
    ...collectionsQueryOptions(),
    enabled: !compact,
  });
  const { data: catalog } = useQuery({
    ...catalogQueryOptions(),
    enabled: !compact,
  });
  const fallbackProduct = catalog?.products[0];

  if (!compact) {
    return (
      <>
        {hydrated &&
          (collections.length > 0 ? (
            <ShopifyHeroCollections collections={collections} />
          ) : fallbackProduct ? (
            <ProductFallbackHero product={fallbackProduct} />
          ) : null)}
      </>
    );
  }

  return (
    <section
      aria-label={t("shoppingBenefits")}
      data-testid="benefits-bar"
      className="w-full"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {BENEFITS.map((benefit) => (
          <div
            key={benefit.title}
            className="group flex min-h-[5.75rem] min-w-0 items-start gap-2.5 rounded-2xl border border-border/70 bg-card p-3 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-card-hover sm:min-h-[6.25rem] sm:p-3.5"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground sm:h-10 sm:w-10">
              <benefit.icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="break-words text-[11px] font-extrabold leading-snug tracking-[-0.01em] sm:text-xs">
                {t(benefit.title)}
              </p>
              <p className="mt-1 break-words text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                {t(benefit.detail)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const SERVICES = [
  {
    icon: Grid2x2,
    title: "serviceComparePhones",
    detail: "serviceCompareDetail",
    cta: "serviceCompareAction",
    to: "/compare" as const,
  },
  {
    icon: Heart,
    title: "serviceSavedFavorites",
    detail: "serviceSavedDetail",
    cta: "serviceSavedAction",
    to: "/wishlist" as const,
  },
  {
    icon: Tag,
    title: "serviceDeals",
    detail: "serviceDealsDetail",
    cta: "serviceDealsAction",
    to: "/shop" as const,
  },
  {
    icon: MessageCircle,
    title: "serviceWhatsApp",
    detail: "serviceWhatsAppDetail",
    cta: "serviceWhatsAppAction",
    to: undefined,
  },
] as const;

export function ServicesStrip() {
  const { t } = useLanguage();
  return (
    <section aria-label={t("storeServices")}>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((service) => {
          const className =
            "group flex min-w-0 flex-col items-start gap-3 rounded-2xl border bg-card p-4 shadow-card transition hover:border-primary/50 sm:flex-row";
          const content = (
            <>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-primary">
                <service.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold leading-relaxed">
                  {t(service.title)}
                </p>
                <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                  {t(service.detail)}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {t(service.cta)}{" "}
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                </span>
              </div>
            </>
          );
          return service.to ? (
            <Link key={service.title} to={service.to} className={className}>
              {content}
            </Link>
          ) : (
            <a
              key={service.title}
              href={generalWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {content}
            </a>
          );
        })}
      </div>
    </section>
  );
}

/** Real products previously opened by this shopper; never invents history. */
export function RecentlyViewed({ products }: { products: ShopifyProduct[] }) {
  const { t } = useLanguage();
  const handles = useRecentlyViewedStore((state) => state.handles);
  const recent = handles
    .map((handle) => products.find((p) => p.node.handle === handle))
    .filter(Boolean) as ShopifyProduct[];
  if (!recent.length) return null;
  return (
    <section aria-labelledby="recently-viewed">
      <div className="home-section-header">
        <div>
          <h2 id="recently-viewed" className="text-lg font-extrabold tracking-tight">
            {t("homeRecentlyViewed")}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("homeRecentlyViewedDetail")}
          </p>
        </div>
      </div>
      <div className="scroll-rail flex gap-3 py-1 sm:grid sm:grid-cols-3 lg:grid-cols-6">
        {recent.slice(0, 6).map((product) => (
          <Link
            key={product.node.id}
            to="/product/$handle"
            params={{ handle: product.node.handle }}
            className="group w-[10.5rem] shrink-0 rounded-xl border bg-card p-3 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover sm:w-auto"
          >
            {product.node.images.edges[0]?.node && (
              <img
                src={cdnImage(product.node.images.edges[0].node.url, 320)}
                alt={product.node.images.edges[0].node.altText ?? product.node.title}
                loading="lazy"
                width={220}
                height={220}
                className="h-32 w-full object-contain"
              />
            )}
            <p className="mt-2 line-clamp-2 text-xs font-bold group-hover:text-primary">
              {product.node.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
