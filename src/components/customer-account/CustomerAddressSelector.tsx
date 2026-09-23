import { ChevronDown, MapPin } from "lucide-react";

import { useCustomerAccount } from "@/components/customer-account/CustomerAccountProvider";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function CustomerAddressSelector({
  variant = "mobile",
  className,
}: {
  variant?: "mobile" | "desktop";
  className?: string;
}) {
  const { language } = useLanguage();
  const { selectedAddress, loading, openAddressBook } = useCustomerAccount();
  const ar = language === "ar";

  const label = loading
    ? ar
      ? "موقع التوصيل"
      : "Delivery location"
    : selectedAddress?.nickname ||
      selectedAddress?.areaStreet ||
      selectedAddress?.formattedAddress ||
      (ar ? "اختر موقع التوصيل" : "Choose delivery location");

  if (variant === "desktop") {
    return (
      <button
        type="button"
        onClick={openAddressBook}
        data-testid="desktop-customer-address-selector"
        className={cn(
          "flex min-w-0 items-center gap-1.5 whitespace-nowrap transition-colors hover:text-primary",
          className,
        )}
        aria-label={ar ? "اختيار عنوان التوصيل" : "Choose delivery address"}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
        <span className="max-w-[11rem] truncate font-semibold">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openAddressBook}
      data-testid="mobile-customer-address-selector"
      className={cn(
        "press flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border border-border/65 bg-card px-3.5 py-2.5 text-start shadow-sm transition hover:border-primary/25 hover:bg-accent/45",
        className,
      )}
      aria-label={ar ? "اختيار عنوان التوصيل" : "Choose delivery address"}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <MapPin className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.075em] text-muted-foreground">
          {ar ? "التوصيل إلى" : "Deliver to"}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm font-extrabold leading-5 text-foreground">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
