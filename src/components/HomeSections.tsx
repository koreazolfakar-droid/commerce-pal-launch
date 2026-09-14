import { Link } from "@tanstack/react-router";
import {
  Bike,
  CreditCard,
  Heart,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { ArrowRight } from "lucide-react";

import { cdnImage } from "@/lib/image";
import { useLanguage } from "@/lib/i18n";
import { generalWhatsAppUrl } from "@/lib/whatsapp";
import { useRecentlyViewedStore } from "@/stores/recentlyViewedStore";
import type { ShopifyProduct } from "@/lib/shopify";

const BENEFITS = [
  { icon: Bike, title: "benefitFreeDelivery", detail: "benefitEligibleOrders", fastDelivery: true },
  { icon: ShieldCheck, title: "benefitWarranty", detail: "benefitAuthentic", fastDelivery: false },
  { icon: RotateCcw, title: "benefitReturns", detail: "benefitReturnsPolicy", fastDelivery: false },
  { icon: CreditCard, title: "benefitSecurePayment", detail: "benefitEncryptedCheckout", fastDelivery: false },
] as const;

export function BenefitsBar({ compact = false }: { compact?: boolean } = {}) {
  const { t, language } = useLanguage();

  return (
    <section
      aria-label={t("shoppingBenefits")}
      data-testid="benefits-bar"
      className="w-full"
      data-compact={compact ? "true" : "false"}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {BENEFITS.map((benefit) => (
          <div
            key={benefit.title}
            className="group flex min-h-[5.75rem] min-w-0 items-start gap-2.5 rounded-2xl border border-border/70 bg-card p-3 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-card-hover sm:min-h-[6.25rem] sm:p-3.5"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground sm:h-10 sm:w-10">
              <benefit.icon
                className="h-[18px] w-[18px] sm:h-5 sm:w-5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="break-words text-[11px] font-extrabold leading-snug tracking-[-0.01em] sm:text-xs">
                {benefit.fastDelivery
                  ? language === "ar"
                    ? "توصيل سريع"
                    : "Fast delivery"
                  : t(benefit.title)}
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
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3">
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
