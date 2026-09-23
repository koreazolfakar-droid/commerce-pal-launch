import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import { CheckoutDetailsForm } from "@/components/CheckoutDetailsForm";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { useLanguage } from "@/lib/i18n";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import { useCartStore } from "@/stores/cartStore";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: `Checkout — ${STORE_NAME}` },
      {
        name: "description",
        content: `Complete delivery and payment details for your ${STORE_NAME} order.`,
      },
      { property: "og:title", content: `Checkout — ${STORE_NAME}` },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/checkout") },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [canonicalLink("/checkout")],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { language, t } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const { items, total: cartTotal, isLoading } = useCartStore();
  const [cartHydrated, setCartHydrated] = useState(() => useCartStore.persist.hasHydrated());

  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) {
      setCartHydrated(true);
      return;
    }

    return useCartStore.persist.onFinishHydration(() => setCartHydrated(true));
  }, []);

  const currency = cartTotal?.currencyCode ?? items[0]?.price.currencyCode ?? "USD";
  const subtotal = cartTotal
    ? Number(cartTotal.amount)
    : items.reduce((sum, item) => sum + Number(item.price.amount) * item.quantity, 0);
  const configuredDeliveryFee = Number(cms?.settings["delivery_fee"] ?? "2");
  const deliveryFee =
    Number.isFinite(configuredDeliveryFee) && configuredDeliveryFee >= 0
      ? configuredDeliveryFee
      : 2;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const isArabic = language === "ar";

  const copy = isArabic
    ? {
        title: "إتمام الطلب",
        subtitle: "أضف بيانات التوصيل والدفع لتأكيد طلبك.",
        back: "العودة إلى السلة",
        emptyTitle: "لا توجد منتجات لإتمام الطلب",
        emptyDescription: "أضف منتجات إلى السلة أولاً ثم تابع إلى إتمام الطلب.",
      }
    : {
        title: "Checkout",
        subtitle: "Add delivery and payment details to confirm your order.",
        back: "Back to bag",
        emptyTitle: "There is nothing to check out",
        emptyDescription:
          "Add products to your bag first, then continue to checkout.",
      };

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-[54rem] px-3 pb-12 pt-5 sm:px-5 sm:pb-16 sm:pt-7 lg:px-6">
        <div className="mb-4 sm:mb-6">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ms-2 mb-2 px-2 text-muted-foreground hover:bg-transparent hover:text-primary"
          >
            <Link to="/cart">
              <ArrowLeft className="rtl:rotate-180" />
              {copy.back}
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[1.75rem] font-black tracking-[-0.035em] sm:text-3xl">
              {copy.title}
            </h1>
            {items.length > 0 ? (
              <span className="rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-1 text-[11px] font-bold text-primary">
                {totalItems} {isArabic ? "منتج" : totalItems === 1 ? "product" : "products"}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>

        {!cartHydrated ? (
          <section
            className="min-h-[22rem] rounded-2xl border bg-card shadow-card"
            aria-busy="true"
            aria-label={isArabic ? "جار تحميل السلة" : "Loading cart"}
          />
        ) : items.length === 0 ? (
          <section className="flex min-h-[22rem] flex-col items-center justify-center rounded-2xl border bg-card px-6 py-14 text-center shadow-card">
            <div className="grid h-16 w-16 place-items-center rounded-full border bg-surface text-muted-foreground">
              <ShoppingBag className="h-7 w-7" strokeWidth={1.7} />
            </div>
            <h2 className="mt-5 text-lg font-bold">{copy.emptyTitle}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {copy.emptyDescription}
            </p>
            <Button asChild className="mt-6 min-h-11 px-6">
              <Link to="/shop">{t("startShopping")}</Link>
            </Button>
          </section>
        ) : (
          <CheckoutDetailsForm
            items={items}
            total={subtotal}
            deliveryFee={deliveryFee}
            currency={currency}
            disabled={isLoading}
          />
        )}
      </div>
    </StoreLayout>
  );
}
