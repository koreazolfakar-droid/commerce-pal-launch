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
        "press flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-start",
        className,
      )}
      aria-label={ar ? "اختيار عنوان التوصيل" : "Choose delivery address"}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <MapPin className="h-4.5 w-4.5" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {ar ? "التوصيل إلى" : "Deliver to"}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[13px] font-bold text-foreground">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
