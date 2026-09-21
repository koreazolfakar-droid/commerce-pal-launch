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
      <div className="-mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        {BENEFITS.map((benefit) => (
          <article
            key={benefit.title}
            className="group flex min-h-[4.35rem] w-[64%] min-w-[13.5rem] max-w-[14.5rem] shrink-0 snap-start items-center gap-2.5 rounded-[1.15rem] border border-border/70 bg-card px-3 py-2.5 shadow-card transition duration-200 hover:border-primary/20 hover:shadow-card-hover sm:w-[14rem] sm:min-w-[14rem]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/[0.08] text-primary transition group-hover:bg-primary/15">
              <benefit.icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold leading-tight tracking-[-0.01em]">
                {t(benefit.title)}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-muted-foreground">
                {t(benefit.detail)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
