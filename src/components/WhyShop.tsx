import { useQuery } from "@tanstack/react-query";
import { Boxes, MessageCircle, PackageCheck, SearchCheck } from "lucide-react";

import { localizeSection } from "@/lib/cms";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { useLanguage } from "@/lib/i18n";
import { STORE_NAME } from "@/lib/storeConfig";

const REASONS = [
  {
    icon: Boxes,
    title: {
      en: "Live stock & pricing",
      ar: "مخزون وأسعار مباشرة",
    },
    detail: {
      en: "Availability and current store prices come from the connected Space Call catalogue.",
      ar: "يتم عرض التوفر والأسعار الحالية من كتالوج Space Call المتصل.",
    },
  },
  {
    icon: SearchCheck,
    title: {
      en: "Easy product discovery",
      ar: "تصفّح أسهل للمنتجات",
    },
    detail: {
      en: "Categories, brands and available options make it easier to find the right product.",
      ar: "تساعدك الفئات والعلامات التجارية والخيارات المتاحة في الوصول إلى المنتج المناسب.",
    },
  },
  {
    icon: PackageCheck,
    title: {
      en: "Clear checkout",
      ar: "طلب واضح قبل التأكيد",
    },
    detail: {
      en: "Review products, options and totals before placing your order.",
      ar: "راجع المنتجات والخيارات والإجمالي قبل تأكيد الطلب.",
    },
  },
  {
    icon: MessageCircle,
    title: {
      en: "Direct support",
      ar: "دعم مباشر",
    },
    detail: {
      en: "Contact Space Call directly when you need help before or after ordering.",
      ar: "تواصل مباشرة مع Space Call عند الحاجة إلى مساعدة قبل الطلب أو بعده.",
    },
  },
] as const;

export function WhyShop() {
  const { language } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const section = cms?.sections.find(
    (item) => item.page_slug === "home" && item.section_key === "trust",
  );
  const localized = section ? localizeSection(section, language) : undefined;
  const title = localized?.title?.trim() || `Why shop with ${STORE_NAME}`;
  const subtitle =
    localized?.subtitle?.trim() ||
    (language === "ar"
      ? "توفر مباشر، أسعار واضحة ودعم عند الحاجة."
      : "Live availability, clear pricing and direct support.");

  return (
    <section aria-labelledby="why-shop" data-testid="why-shop">
      <div className="max-w-2xl">
        <h2
          id="why-shop"
          className="text-lg font-semibold tracking-[-0.02em] sm:text-xl"
        >
          {title}
        </h2>
        <p className="mt-1 text-[13px] leading-6 text-muted-foreground sm:text-sm">
          {subtitle}
        </p>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
        {REASONS.map((reason) => {
          const Icon = reason.icon;
          return (
            <article
              key={reason.title.en}
              className="group flex min-w-0 items-start gap-2.5 rounded-xl border border-border/65 bg-card px-3.5 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.035)] transition-[border-color,background-color] duration-150 hover:border-primary/20 hover:bg-card/95 sm:gap-3 sm:px-4 sm:py-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/[0.08] text-primary">
                <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-[13.5px] font-semibold leading-5 tracking-[-0.01em] text-foreground sm:text-sm">
                  {reason.title[language]}
                </h3>
                <p className="mt-0.5 text-[12px] leading-[1.55] text-muted-foreground sm:text-[13px]">
                  {reason.detail[language]}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
