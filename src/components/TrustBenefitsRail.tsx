import { CreditCard, RotateCcw, ShieldCheck, Truck } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const BENEFITS = [
  { icon: Truck, title: "benefitFreeDelivery", detail: "benefitEligibleOrders" },
  { icon: ShieldCheck, title: "benefitWarranty", detail: "benefitAuthentic" },
  { icon: RotateCcw, title: "benefitReturns", detail: "benefitReturnsPolicy" },
  { icon: CreditCard, title: "benefitSecurePayment", detail: "benefitEncryptedCheckout" },
] as const;

export function TrustBenefitsRail() {
  const { t } = useLanguage();

  return (
    <section aria-label={t("shoppingBenefits")} data-testid="trust-benefits-rail" className="min-w-0">
      <div className="-mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        {BENEFITS.map((benefit) => (
          <article
            key={benefit.title}
            className="flex w-[78%] max-w-[18rem] shrink-0 snap-start items-center gap-3 rounded-2xl border border-border/70 bg-card px-3.5 py-3 shadow-card sm:w-[17rem]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-primary/15 bg-primary/10 text-primary">
              <benefit.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-tight tracking-[-0.01em]">
                {t(benefit.title)}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {t(benefit.detail)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
