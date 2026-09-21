import { Bike, CreditCard, RotateCcw, ShieldCheck } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const BENEFITS = [
  { icon: Bike, title: "benefitFreeDelivery", detail: "benefitEligibleOrders" },
  { icon: ShieldCheck, title: "benefitWarranty", detail: "benefitAuthentic" },
  { icon: RotateCcw, title: "benefitReturns", detail: "benefitReturnsPolicy" },
  { icon: CreditCard, title: "benefitSecurePayment", detail: "benefitEncryptedCheckout" },
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
            className="group flex min-h-[3.9rem] w-[58%] min-w-[12.25rem] max-w-[13rem] shrink-0 snap-start items-center gap-2 rounded-2xl border border-border/70 bg-card px-2.5 py-2 shadow-card transition duration-200 hover:border-primary/20 hover:shadow-card-hover sm:w-[12.75rem] sm:min-w-[12.75rem]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-primary/15 bg-primary/[0.08] text-primary transition group-hover:bg-primary/15">
              <benefit.icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
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
