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
import { cdnImage } from "@/lib/image";
import { useLanguage } from "@/lib/i18n";
import { collectionsQueryOptions } from "@/lib/queries";
import { generalWhatsAppUrl } from "@/lib/whatsapp";
import { useRecentlyViewedStore } from "@/stores/recentlyViewedStore";
import type { ShopifyProduct } from "@/lib/shopify";

const BENEFITS = [
  { icon: Truck, title: "benefitFreeDelivery", detail: "benefitEligibleOrders" },
  { icon: ShieldCheck, title: "benefitWarranty", detail: "benefitAuthentic" },
  { icon: RotateCcw, title: "benefitReturns", detail: "benefitReturnsPolicy" },
  { icon: CreditCard, title: "benefitSecurePayment", detail: "benefitEncryptedCheckout" },
] as const;

export function BenefitsBar({ compact = false }: { compact?: boolean } = {}) {
  const { t } = useLanguage();
  const { data: collections = [] } = useQuery({
    ...collectionsQueryOptions(),
    enabled: !compact,
  });
  return (
    <>
      {!compact && collections.length > 0 && <ShopifyHeroCollections collections={collections} />}
      <section aria-label={t("shoppingBenefits")} data-testid="benefits-bar">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-border min-[360px]:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className={`flex min-w-0 flex-col items-start gap-2 bg-card ${compact ? "p-3" : "p-4"} sm:flex-row sm:gap-3`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <benefit.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="break-words text-sm font-bold leading-relaxed">{t(benefit.title)}</p>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">
                  {t(benefit.detail)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
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
