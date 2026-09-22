import { Bike, CreditCard, RotateCcw, ShieldCheck } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const BENEFITS = [
  {
    icon: Bike,
    title: "benefitFreeDelivery",
    detail: "benefitEligibleOrders",
    iconTone:
      "border-sky-500/20 bg-sky-500/10 text-blue-600 dark:text-sky-400",
  },
  {
    icon: ShieldCheck,
    title: "benefitWarranty",
    detail: "benefitAuthentic",
    iconTone:
      "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    icon: RotateCcw,
    title: "benefitReturns",
    detail: "benefitReturnsPolicy",
    iconTone:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  },
  {
    icon: CreditCard,
    title: "benefitSecurePayment",
    detail: "benefitEncryptedCheckout",
    iconTone:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
] as const;

export function TrustBenefitsRail() {
  const { t } = useLanguage();

  return (
    <section
      aria-label={t("shoppingBenefits")}
      data-testid="trust-benefits-rail"
      className="min-w-0"
    >
      <div className="-mx-2.5 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-2.5 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        {BENEFITS.map((benefit) => (
          <article
            key={benefit.title}
            className="group flex min-h-[3.9rem] w-[58%] min-w-[12.25rem] max-w-[13rem] shrink-0 snap-start items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-2 shadow-card transition-colors duration-150 hover:border-primary/20 sm:w-[12.75rem] sm:min-w-[12.75rem]"
          >
            <span
              className={`relative grid h-8.5 w-8.5 shrink-0 place-items-center overflow-hidden rounded-[0.7rem] border shadow-sm transition-colors duration-150 ${benefit.iconTone}`}
            >
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-current opacity-[0.08]"
              />
              <benefit.icon
                className="relative z-10 h-[17px] w-[17px]"
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-extrabold leading-tight tracking-[-0.01em]">
                {t(benefit.title)}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[10px] leading-tight text-muted-foreground">
                {t(benefit.detail)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
