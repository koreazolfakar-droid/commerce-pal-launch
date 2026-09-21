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
      <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        {BENEFITS.map((benefit) => (
          <article
            key={benefit.title}
            className="group flex min-h-[5rem] w-[72%] min-w-[15.75rem] max-w-[17rem] shrink-0 snap-start items-center gap-3 rounded-[1.4rem] border border-border/70 bg-card px-3.5 py-3 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-card-hover sm:w-[16rem] sm:min-w-[16rem] sm:px-4"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/15 bg-primary/[0.08] text-primary transition group-hover:bg-primary/15">
              <benefit.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-extrabold leading-tight tracking-[-0.015em]">
                {t(benefit.title)}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                {t(benefit.detail)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
