import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  Heart,
  MessageCircle,
  PackageCheck,
  SearchCheck,
  Tag,
} from "lucide-react";

import { localizeSection } from "@/lib/cms";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { useLanguage } from "@/lib/i18n";
import { STORE_NAME } from "@/lib/storeConfig";
import { generalWhatsAppUrl } from "@/lib/whatsapp";

const REASONS = [
  {
    icon: Boxes,
    title: {
      en: "Live stock & pricing",
      ar: "مخزون وأسعار مباشرة",
    },
    detail: {
      en: "See current prices and availability before ordering.",
      ar: "اطّلع على الأسعار والتوفّر قبل الطلب.",
    },
  },
  {
    icon: SearchCheck,
    title: {
      en: "Easy product discovery",
      ar: "تصفّح أسهل للمنتجات",
    },
    detail: {
      en: "Browse by category, brand and available options.",
      ar: "تصفّح حسب الفئة والعلامة التجارية والخيارات المتاحة.",
    },
  },
  {
    icon: PackageCheck,
    title: {
      en: "Clear checkout",
      ar: "طلب واضح قبل التأكيد",
    },
    detail: {
      en: "Review items, options and totals before placing an order.",
      ar: "راجع المنتجات والخيارات والإجمالي قبل تأكيد الطلب.",
    },
  },
] as const;

const QUICK_ACTIONS = [
  {
    icon: Heart,
    title: "serviceSavedFavorites",
    cta: "serviceSavedAction",
    to: "/wishlist" as const,
  },
  {
    icon: Tag,
    title: "serviceDeals",
    cta: "serviceDealsAction",
    to: "/shop" as const,
  },
  {
    icon: MessageCircle,
    title: "serviceWhatsApp",
    cta: "serviceWhatsAppAction",
    to: undefined,
  },
] as const;

export function WhyShop() {
  const { t, language } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const section = cms?.sections.find(
    (item) => item.page_slug === "home" && item.section_key === "trust",
  );
  const localized = section ? localizeSection(section, language) : undefined;
  const title =
    localized?.title?.trim() ||
    (language === "ar" ? `لماذا تتسوّق من ${STORE_NAME}؟` : `Why shop with ${STORE_NAME}`);
  const subtitle =
    localized?.subtitle?.trim() ||
    (language === "ar"
      ? "توفر مباشر، أسعار واضحة ودعم عند الحاجة."
      : "Live availability, clear pricing and direct support.");
  const cmsStoreName = cms?.settings["site_name"];
  const cmsWhatsApp = cms?.settings["whatsapp_number"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const whatsappNumber =
    typeof cmsWhatsApp === "string" && cmsWhatsApp.trim() ? cmsWhatsApp : undefined;
  const whatsappHref = generalWhatsAppUrl(whatsappNumber, storeName);

  return (
    <section aria-labelledby="why-shop" data-testid="why-shop">
      <div className="max-w-2xl">
        <h2 id="why-shop" className="text-lg font-semibold tracking-[-0.02em] sm:text-xl">
          {title}
        </h2>
        <p className="mt-1 text-[13px] leading-6 text-muted-foreground sm:text-sm">{subtitle}</p>
      </div>

      <div
        className="mt-3 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        data-testid="why-shop-benefits"
      >
        <div className="divide-y divide-border/70 lg:grid lg:grid-cols-3 lg:divide-y-0">
          {REASONS.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <article
                key={reason.title.en}
                className={`flex min-w-0 items-start gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5 ${index > 0 ? "lg:border-s lg:border-border/70" : ""}`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/[0.08] text-primary">
                  <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-5 tracking-[-0.01em] text-foreground">
                    {reason.title[language]}
                  </h3>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
                    {reason.detail[language]}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <nav
        aria-labelledby="why-shop-quick-links"
        className="mt-4"
        data-testid="home-quick-actions"
      >
        <h3
          id="why-shop-quick-links"
          className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground"
        >
          {language === "ar" ? "روابط سريعة" : "Quick links"}
        </h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isSupport = !action.to;
            const className = [
              "group flex min-h-[104px] min-w-0 flex-col items-start justify-between gap-2.5 rounded-xl border border-border/70 bg-card p-3 text-start motion-safe:transition-colors hover:border-primary/30 hover:bg-primary/[0.025] active:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:p-3.5",
              isSupport
                ? "col-span-2 min-h-[72px] flex-row items-center md:col-span-1 md:min-h-[104px] md:flex-col md:items-start"
                : "",
            ].join(" ");
            const content = (
              <>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/[0.07] text-primary">
                    <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 text-[13px] font-semibold leading-5 text-foreground">
                    {t(action.title)}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-primary">
                  {t(action.cta)}
                  <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
                </span>
              </>
            );

            return action.to ? (
              <Link
                key={action.title}
                to={action.to}
                search={action.title === "serviceDeals" ? { availability: "on-sale" } : undefined}
                className={className}
              >
                {content}
              </Link>
            ) : (
              <a
                key={action.title}
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {content}
              </a>
            );
          })}
        </div>
      </nav>
    </section>
  );
}
