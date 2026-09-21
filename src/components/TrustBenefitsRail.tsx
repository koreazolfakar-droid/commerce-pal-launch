import { Bike, CreditCard, RotateCcw, ShieldCheck } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const BENEFITS = [
  {
    icon: Bike,
    title: "benefitFreeDelivery",
    detail: "benefitEligibleOrders",
    iconTone:
      "border-sky-500/20 bg-gradient-to-br from-sky-500/20 via-blue-500/10 to-violet-500/15 text-blue-600 dark:text-sky-400",
  },
  {
    icon: ShieldCheck,
    title: "benefitWarranty",
    detail: "benefitAuthentic",
    iconTone:
      "border-violet-500/20 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-purple-500/15 text-violet-600 dark:text-violet-400",
  },
  {
    icon: RotateCcw,
    title: "benefitReturns",
    detail: "benefitReturnsPolicy",
    iconTone:
      "border-cyan-500/20 bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-blue-500/15 text-cyan-700 dark:text-cyan-400",
  },
  {
    icon: CreditCard,
    title: "benefitSecurePayment",
    detail: "benefitEncryptedCheckout",
    iconTone:
      "border-emerald-500/20 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/15 text-emerald-700 dark:text-emerald-400",
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
            className="group flex min-h-[3.9rem] w-[58%] min-w-[12.25rem] max-w-[13rem] shrink-0 snap-start items-center gap-2 rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.025] px-2.5 py-2 shadow-card transition duration-200 hover:border-primary/20 hover:shadow-card-hover sm:w-[12.75rem] sm:min-w-[12.75rem]"
          >
            <span
              className={`relative grid h-8.5 w-8.5 shrink-0 place-items-center overflow-hidden rounded-[0.7rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_4px_10px_rgba(37,99,235,0.08)] transition duration-200 group-hover:-translate-y-px group-hover:scale-[1.03] ${benefit.iconTone}`}
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
