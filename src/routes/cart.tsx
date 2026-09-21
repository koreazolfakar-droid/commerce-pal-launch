import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";

import { CheckoutDetailsForm } from "@/components/CheckoutDetailsForm";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { cdnImage } from "@/lib/image";
import { formatPrice, variantSummary } from "@/lib/productPricing";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import { useLanguage } from "@/lib/i18n";
import { useCartStore } from "@/stores/cartStore";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: `Your bag — ${STORE_NAME}` },
      {
        name: "description",
        content: `Review your ${STORE_NAME} bag and complete your order directly with the store.`,
      },
      { property: "og:title", content: `Your bag — ${STORE_NAME}` },
      { property: "og:description", content: "Review your bag and complete your order directly." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/cart") },
      { name: "robots", content: "noindex, follow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `Your bag — ${STORE_NAME}` },
      { name: "twitter:description", content: "Review your bag and complete your order directly." },
    ],
    links: [canonicalLink("/cart")],
  }),
  component: CartPage,
});

function CartPage() {
  const { t, language } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
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

  const copy =
    language === "ar"
      ? {
          title: "سلة التسوق",
          item: totalItems === 1 ? "منتج واحد" : `${totalItems} منتجات`,
          review: "راجع منتجاتك، رسوم التوصيل، ثم أكمل بياناتك لإرسال الطلب.",
          emptyTitle: "سلتك فارغة حالياً",
          emptyDescription: "اكتشف أحدث الهواتف والإكسسوارات وأضف ما يناسبك إلى السلة.",
          yourItems: "منتجاتك",
          summary: "ملخص الطلب",
          subtotal: "مجموع المنتجات",
          delivery: "رسوم التوصيل",
          deliveryNote: "توصيل سريع إلى مختلف المناطق اللبنانية",
          freeDelivery: "مجاني",
          finalTotal: "الإجمالي",
          secure: "السعر والمخزون يتم التحقق منهما على الخادم قبل تثبيت الطلب.",
          continueShopping: "متابعة التسوق",
          continueCheckout: "إكمال بيانات التوصيل",
          reviewStep: "مراجعة السلة",
          deliveryStep: "بيانات التوصيل",
          whatsappStep: "تأكيد واتساب",
          fastDelivery: "توصيل سريع",
          lebanon: "مناطق لبنان",
          protected: "طلب محمي",
          serverChecked: "تحقق خادمي",
          whatsapp: "واتساب",
          afterSave: "بعد حفظ الطلب",
          lineTotal: "المجموع",
        }
      : {
          title: "Shopping bag",
          item: totalItems === 1 ? "1 product" : `${totalItems} products`,
          review:
            "Review your products and delivery fee, then add your details to place the order.",
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
          continueCheckout: "Continue to delivery details",
          reviewStep: "Review bag",
          deliveryStep: "Delivery details",
          whatsappStep: "WhatsApp confirmation",
          fastDelivery: "Fast delivery",
          lebanon: "Across Lebanon",
          protected: "Protected order",
          serverChecked: "Server verified",
          whatsapp: "WhatsApp",
          afterSave: "After order save",
          lineTotal: "Line total",
        };

  const steps = [
    { number: "1", label: copy.reviewStep, active: true },
    { number: "2", label: copy.deliveryStep, active: false },
    { number: "3", label: copy.whatsappStep, active: false },
  ];

  return (
    <StoreLayout>
      <div className="cart-page mx-auto w-full max-w-[74rem] px-3 pb-10 pt-3.5 sm:px-5 sm:pb-14 sm:pt-6 lg:px-6 xl:px-7">
        <header className="mb-3.5 overflow-hidden rounded-[1.25rem] border bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-card sm:mb-5 sm:rounded-2xl">
          <div className="flex flex-col gap-3.5 px-3.5 py-3.5 min-[390px]:px-4 sm:gap-4 sm:px-5 sm:py-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary">
                  Space Call
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.title}</h1>
                {items.length > 0 ? (
                  <span className="rounded-full border border-primary/15 bg-primary/[0.07] px-2.5 py-1 text-[11px] font-extrabold text-primary">
                    {copy.item}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 max-w-xl text-xs leading-5 text-muted-foreground sm:text-sm">
                {copy.review}
              </p>
            </div>

            {items.length > 0 ? (
              <div className="grid w-full grid-cols-3 gap-1.5 lg:w-auto lg:min-w-[25rem]">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className={`min-w-0 rounded-xl border px-2 py-2 transition sm:px-2.5 ${
                      step.active
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-border/70 bg-background/70 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${
                          step.active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step.number}
                      </span>
                      <span className="line-clamp-1 text-[9px] font-bold leading-tight min-[390px]:text-[10px] sm:text-[11px]">
                        {step.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        {items.length === 0 ? (
          <section className="flex min-h-[24rem] flex-col items-center justify-center rounded-2xl border bg-card px-6 py-14 text-center shadow-card">
            <div className="relative grid h-20 w-20 place-items-center rounded-full border bg-surface text-muted-foreground">
              <span className="absolute inset-2 rounded-full border border-primary/10" />
              <ShoppingBag className="relative h-8 w-8" strokeWidth={1.6} />
            </div>
            <h2 className="mt-6 text-xl font-extrabold">{copy.emptyTitle}</h2>
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
            <section
              aria-label={language === "ar" ? "مزايا الطلب" : "Order benefits"}
              className="-mx-3 mb-3.5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mb-5 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0"
            >
              <div className="flex min-w-[9.75rem] flex-1 snap-start items-center gap-2 rounded-xl border bg-card px-2.5 py-2 shadow-card sm:min-w-0">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Truck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-extrabold sm:text-xs">
                    {copy.fastDelivery}
                  </p>
                  <p className="truncate text-[9px] text-muted-foreground sm:text-[10px]">
                    {copy.lebanon}
                  </p>
                </div>
              </div>

              <div className="flex min-w-[9.75rem] flex-1 snap-start items-center gap-2 rounded-xl border bg-card px-2.5 py-2 shadow-card sm:min-w-0">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-extrabold sm:text-xs">{copy.protected}</p>
                  <p className="truncate text-[9px] text-muted-foreground sm:text-[10px]">
                    {copy.serverChecked}
                  </p>
                </div>
              </div>

              <div className="flex min-w-[9.75rem] flex-1 snap-start items-center gap-2 rounded-xl border bg-card px-2.5 py-2 shadow-card sm:min-w-0">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-success/10 text-success">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-extrabold sm:text-xs">{copy.whatsapp}</p>
                  <p className="truncate text-[9px] text-muted-foreground sm:text-[10px]">
                    {copy.afterSave}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:gap-6">
              <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                <div className="mb-2 flex items-center justify-between gap-3 px-0.5 sm:mb-2.5 sm:px-1">
                  <h2 className="text-sm font-extrabold tracking-tight sm:text-base">
                    {copy.yourItems}
                  </h2>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {copy.item}
                  </span>
                </div>

                <ul className="space-y-2.5" aria-label={copy.title}>
                  {items.map((item) => {
                    const image = item.product.node.images?.edges?.[0]?.node;
                    const lineTotal = Number(item.price.amount) * item.quantity;

                    return (
                      <li
                        key={item.variantId}
                        className="group relative flex gap-2.5 rounded-[1.1rem] border bg-card p-2.5 shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-primary/20 hover:shadow-card-hover min-[390px]:gap-3 min-[390px]:p-3 sm:gap-4 sm:rounded-2xl sm:p-3.5"
                      >
                        <Link
                          to="/product/$handle"
                          params={{ handle: item.product.node.handle }}
                          className="grid h-[4.75rem] w-[4.75rem] shrink-0 place-items-center overflow-hidden rounded-[0.8rem] border bg-image-stage min-[390px]:h-[5.25rem] min-[390px]:w-[5.25rem] sm:h-24 sm:w-24 sm:rounded-xl"
                        >
                          {image ? (
                            <img
                              src={cdnImage(image.url, 160)}
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
                          <Link
                            to="/product/$handle"
                            params={{ handle: item.product.node.handle }}
                            className="line-clamp-2 pe-7 text-[12px] font-extrabold leading-[1.3] transition-colors hover:text-primary min-[390px]:pe-8 min-[390px]:text-[13px] sm:text-[15px]"
                          >
                            {item.product.node.title}
                          </Link>

                          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="max-w-full truncate text-[10px] text-muted-foreground sm:text-[11px]">
                              {variantSummary(item.selectedOptions)}
                            </p>
                            <span className="text-[10px] text-border">•</span>
                            <p className="text-[11px] font-bold tabular-nums text-primary sm:text-xs">
                              {formatPrice(item.price.amount, item.price.currencyCode)}
                            </p>
                          </div>

                          <div className="mt-auto flex items-end justify-between gap-2 pt-2 min-[390px]:pt-2.5">
                            <div className="flex h-8.5 items-center rounded-xl border bg-background p-0.5 shadow-sm sm:h-9">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("decreaseQuantity")}
                                onClick={() =>
                                  void updateQuantity(item.variantId, item.quantity - 1)
                                }
                                className="h-7.5 w-7.5 rounded-[0.6rem] sm:h-8 sm:w-8"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <span className="w-7 text-center text-xs font-extrabold tabular-nums">
                                {item.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("increaseQuantity")}
                                onClick={() =>
                                  void updateQuantity(item.variantId, item.quantity + 1)
                                }
                                className="h-7.5 w-7.5 rounded-[0.6rem] sm:h-8 sm:w-8"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="text-end">
                              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {copy.lineTotal}
                              </p>
                              <p className="mt-0.5 text-sm font-extrabold tabular-nums sm:text-[15px]">
                                {formatPrice(lineTotal, item.price.currencyCode)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void removeItem(item.variantId)}
                          disabled={isLoading}
                          aria-label={t("removeItem")}
                          className="absolute end-2 top-2 h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
              </div>

              <aside
                className="overflow-hidden rounded-[1.1rem] border bg-card shadow-card sm:rounded-2xl lg:sticky lg:top-[5.75rem] lg:col-start-2 lg:row-span-2 lg:row-start-1"
                aria-label={copy.summary}
              >
                <div className="border-b bg-gradient-to-r from-primary/[0.08] via-primary/[0.03] to-transparent px-3.5 py-3 sm:px-4 sm:py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/15 bg-background/80 text-primary shadow-sm">
                      <ReceiptText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-extrabold">{copy.summary}</h2>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{copy.item}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{copy.subtotal}</span>
                      <span className="font-bold tabular-nums">
                        {formatPrice(subtotal, currency)}
                      </span>
                    </div>

                    <div className="rounded-xl border border-sky-500/15 bg-sky-500/[0.05] p-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex min-w-0 items-center gap-2 font-semibold">
                          <Truck className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                          <span className="truncate">{copy.delivery}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-background px-2 py-1 text-xs font-extrabold tabular-nums text-primary shadow-sm">
                          {deliveryFee === 0
                            ? copy.freeDelivery
                            : formatPrice(deliveryFee, currency)}
                        </span>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] leading-4 text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {copy.deliveryNote}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-surface/70 p-3">
                      <div className="flex items-end justify-between gap-4">
                        <span className="pb-0.5 text-sm font-extrabold">{copy.finalTotal}</span>
                        <span
                          aria-live="polite"
                          aria-atomic="true"
                          className="text-2xl font-black tracking-tight tabular-nums text-primary"
                        >
                          {formatPrice(grandTotal, currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-success/15 bg-success/[0.06] px-3 py-2.5 text-[10px] leading-4 text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    {copy.secure}
                  </p>

                  <Button
                    asChild
                    className="mt-3 min-h-11 w-full rounded-xl px-3 text-[13px] font-extrabold shadow-sm sm:px-4 sm:text-sm"
                  >
                    <a href="#whatsapp-checkout">
                      {copy.continueCheckout}
                      <ArrowRight className="rtl:rotate-180" />
                    </a>
                  </Button>
                </div>
              </aside>

              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <CheckoutDetailsForm
                  items={items}
                  total={subtotal}
                  deliveryFee={deliveryFee}
                  currency={currency}
                  disabled={isLoading}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </StoreLayout>
  );
}
