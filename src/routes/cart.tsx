import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";

import { useCustomerAccount } from "@/components/customer-account/CustomerAccountProvider";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { cdnImage } from "@/lib/image";
import { useLanguage } from "@/lib/i18n";
import { formatPrice, variantSummary } from "@/lib/productPricing";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import { cartItemMaxQuantity, useCartStore } from "@/stores/cartStore";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: `Your bag — ${STORE_NAME}` },
      {
        name: "description",
        content: `Review your ${STORE_NAME} bag before checkout.`,
      },
      { property: "og:title", content: `Your bag — ${STORE_NAME}` },
      { property: "og:description", content: "Review your bag before checkout." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/cart") },
      { name: "robots", content: "noindex, follow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `Your bag — ${STORE_NAME}` },
      { name: "twitter:description", content: "Review your bag before checkout." },
    ],
    links: [canonicalLink("/cart")],
  }),
  component: CartPage,
});

function CartPage() {
  const { t, language } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const { selectedAddress, openAddressBook } = useCustomerAccount();
  const { items, total: cartTotal, isLoading, updateQuantity, removeItem } = useCartStore();

  const currency = cartTotal?.currencyCode ?? items[0]?.price.currencyCode ?? "USD";
  const subtotal = cartTotal
    ? Number(cartTotal.amount)
    : items.reduce((sum, item) => sum + Number(item.price.amount) * item.quantity, 0);
  const configuredDeliveryFee = Number(cms?.settings["delivery_fee"] ?? "2");
  const deliveryFee =
    Number.isFinite(configuredDeliveryFee) && configuredDeliveryFee >= 0
      ? configuredDeliveryFee
      : 2;
  const grandTotal = subtotal + deliveryFee;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const isArabic = language === "ar";
  const copy = isArabic
    ? {
        title: "سلة التسوق",
        item: totalItems === 1 ? "منتج واحد" : `${totalItems} منتجات`,
        emptyTitle: "سلتك فارغة حالياً",
        emptyDescription: "اكتشف أحدث الهواتف والإكسسوارات وأضف ما يناسبك إلى السلة.",
        yourItems: "منتجاتك",
        summary: "ملخص الطلب",
        subtotal: "مجموع المنتجات",
        delivery: "رسوم التوصيل",
        deliveryNote: "توصيل سريع إلى مختلف المناطق اللبنانية",
        freeDelivery: "مجاني",
        finalTotal: "الإجمالي",
        secure: "يتم التحقق من السعر والمخزون على الخادم قبل تثبيت الطلب.",
        continueShopping: "متابعة التسوق",
        continueCheckout: "متابعة إلى الدفع",
        lineTotal: "المجموع",
        deliveringTo: "التوصيل إلى",
        chooseLocation: "اختر موقع التوصيل",
        locationHint: "يمكنك تحديد العنوان الآن أو أثناء إتمام الطلب",
        changeLocation: "تغيير",
      }
    : {
        title: "Shopping bag",
        item: totalItems === 1 ? "1 product" : `${totalItems} products`,
        emptyTitle: "Your bag is empty",
        emptyDescription:
          "Explore the latest phones and accessories, then add your favourites here.",
        yourItems: "Your items",
        summary: "Order summary",
        subtotal: "Items subtotal",
        delivery: "Delivery fee",
        deliveryNote: "Fast delivery across Lebanon",
        freeDelivery: "Free",
        finalTotal: "Total",
        secure: "Price and stock are verified server-side before the order is confirmed.",
        continueShopping: "Continue shopping",
        continueCheckout: "Continue to checkout",
        lineTotal: "Line total",
        deliveringTo: "Delivering to",
        chooseLocation: "Choose delivery location",
        locationHint: "Set an address now or during checkout",
        changeLocation: "Change",
      };

  const locationLabel =
    selectedAddress?.nickname ||
    selectedAddress?.areaStreet ||
    selectedAddress?.formattedAddress ||
    copy.chooseLocation;

  const locationDetail = selectedAddress
    ? selectedAddress.areaStreet || selectedAddress.formattedAddress || copy.deliveryNote
    : copy.locationHint;

  return (
    <StoreLayout>
      <div className="cart-page mx-auto w-full max-w-[72rem] px-3 pb-32 pt-5 sm:px-5 sm:pb-16 sm:pt-7 lg:px-6 xl:px-7">
        <header className="mb-4 flex items-end justify-between gap-4 sm:mb-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[1.75rem] font-black tracking-[-0.035em] sm:text-3xl">
                {copy.title}
              </h1>
              {items.length > 0 ? (
                <span className="rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-1 text-[11px] font-bold text-primary">
                  {copy.item}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {items.length === 0 ? (
          <section className="flex min-h-[24rem] flex-col items-center justify-center rounded-2xl border bg-card px-6 py-14 text-center shadow-card">
            <div className="grid h-20 w-20 place-items-center rounded-full border bg-surface text-muted-foreground">
              <ShoppingBag className="h-8 w-8" strokeWidth={1.6} />
            </div>
            <h2 className="mt-6 text-xl font-bold">{copy.emptyTitle}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {copy.emptyDescription}
            </p>
            <Button asChild size="lg" className="mt-7 min-h-12 px-7">
              <Link to="/shop">
                {t("startShopping")}
                <ArrowRight className="rtl:rotate-180" />
              </Link>
            </Button>
          </section>
        ) : (
          <>
            <button
              type="button"
              onClick={openAddressBook}
              className="mb-4 flex w-full items-center gap-3 rounded-xl border bg-card px-3.5 py-3 text-start shadow-card transition hover:border-primary/25 hover:bg-accent/25 sm:mb-5 sm:px-4"
              aria-label={`${copy.deliveringTo}: ${locationLabel}. ${copy.changeLocation}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <MapPin className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {copy.deliveringTo}
                </span>
                <span className="mt-0.5 block truncate text-sm font-extrabold">
                  {locationLabel}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {locationDetail}
                </span>
              </span>
              <span className="shrink-0 text-xs font-extrabold text-primary">
                {copy.changeLocation}
              </span>
            </button>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:gap-6">
              <section className="min-w-0" aria-labelledby="cart-items-title">
                <div className="mb-2.5 flex items-center justify-between gap-3 px-0.5">
                  <h2
                    id="cart-items-title"
                    className="text-sm font-bold tracking-[-0.01em] sm:text-base"
                  >
                    {copy.yourItems}
                  </h2>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {copy.item}
                  </span>
                </div>

                <ul
                  className="divide-y overflow-hidden rounded-xl border bg-card shadow-card"
                  aria-label={copy.title}
                >
                  {items.map((item) => {
                    const image = item.product.node.images?.edges?.[0]?.node;
                    const lineTotal = Number(item.price.amount) * item.quantity;
                    const maxQuantity = cartItemMaxQuantity(item);

                    return (
                      <li
                        key={item.variantId}
                        className="group relative flex gap-3 p-3 sm:gap-4 sm:p-4"
                      >
                        <Link
                          to="/product/$handle"
                          params={{ handle: item.product.node.handle }}
                          className="grid h-[5.25rem] w-[5.25rem] shrink-0 place-items-center overflow-hidden rounded-xl border bg-image-stage sm:h-24 sm:w-24"
                        >
                          {image ? (
                            <img
                              src={cdnImage(image.url, 180)}
                              alt={image.altText ?? item.product.node.title}
                              className="h-full w-full object-contain p-2"
                              loading="lazy"
                              decoding="async"
                              width={96}
                              height={96}
                            />
                          ) : null}
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex min-w-0 items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <Link
                                to="/product/$handle"
                                params={{ handle: item.product.node.handle }}
                                className="line-clamp-2 text-[13px] font-bold leading-[1.35] transition-colors hover:text-primary sm:text-[15px]"
                              >
                                {item.product.node.title}
                              </Link>
                              <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">
                                {variantSummary(item.selectedOptions)}
                              </p>
                              <p className="mt-1 text-xs font-bold tabular-nums text-primary sm:text-[13px]">
                                {formatPrice(item.price.amount, item.price.currencyCode)}
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => void removeItem(item.variantId)}
                              disabled={isLoading}
                              aria-label={t("removeItem")}
                              className="-me-1 -mt-1 h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                            <div className="flex h-9 items-center rounded-lg border bg-background p-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("decreaseQuantity")}
                                disabled={isLoading}
                                onClick={() =>
                                  void updateQuantity(item.variantId, item.quantity - 1)
                                }
                                className="h-8 w-8 rounded-md"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <span className="w-7 text-center text-xs font-bold tabular-nums">
                                {item.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("increaseQuantity")}
                                disabled={isLoading || item.quantity >= maxQuantity}
                                onClick={() =>
                                  void updateQuantity(item.variantId, item.quantity + 1)
                                }
                                className="h-8 w-8 rounded-md"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="text-end">
                              <p className="hidden text-[10px] font-medium text-muted-foreground min-[390px]:block">
                                {copy.lineTotal}
                              </p>
                              <p className="text-sm font-black tabular-nums sm:text-[15px]">
                                {formatPrice(lineTotal, item.price.currencyCode)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="mt-2 px-1 text-muted-foreground hover:bg-transparent hover:text-primary"
                >
                  <Link to="/shop">
                    <ArrowRight className="rtl:rotate-180" />
                    {copy.continueShopping}
                  </Link>
                </Button>
              </section>

              <aside
                className="overflow-hidden rounded-xl border bg-card shadow-card lg:sticky lg:top-[5.75rem]"
                aria-label={copy.summary}
              >
                <div className="px-4 py-4 sm:px-5">
                  <h2 className="text-sm font-bold">{copy.summary}</h2>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{copy.subtotal}</span>
                      <span className="font-bold tabular-nums">
                        {formatPrice(subtotal, currency)}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Truck className="h-4 w-4 shrink-0 text-primary" />
                          {copy.delivery}
                        </span>
                        <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
                          {copy.deliveryNote}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold tabular-nums">
                        {deliveryFee === 0 ? copy.freeDelivery : formatPrice(deliveryFee, currency)}
                      </span>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex items-end justify-between gap-4">
                        <span className="font-bold">{copy.finalTotal}</span>
                        <span
                          aria-live="polite"
                          aria-atomic="true"
                          className="text-xl font-black tracking-[-0.025em] tabular-nums text-primary"
                        >
                          {formatPrice(grandTotal, currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 flex items-start gap-2 text-[10px] leading-4 text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    {copy.secure}
                  </p>

                  <Button
                    asChild
                    className="mt-4 hidden min-h-11 w-full rounded-xl text-sm font-bold lg:flex"
                  >
                    <Link to="/checkout">
                      {copy.continueCheckout}
                      <ArrowRight className="rtl:rotate-180" />
                    </Link>
                  </Button>
                </div>
              </aside>
            </div>

            <div
              data-testid="mobile-cart-checkout-bar"
              className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 px-3 py-2.5 shadow-float backdrop-blur supports-[backdrop-filter]:bg-background/88 lg:hidden"
            >
              <div className="mx-auto w-full max-w-md">
                <Button
                  asChild
                  className="min-h-12 w-full rounded-xl px-5 text-sm font-extrabold"
                >
                  <Link to="/checkout">
                    {copy.continueCheckout}
                    <ArrowRight className="rtl:rotate-180" />
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </StoreLayout>
  );
}
