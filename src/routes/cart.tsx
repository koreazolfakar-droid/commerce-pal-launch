import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";

import { CheckoutDetailsForm } from "@/components/CheckoutDetailsForm";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
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
  const { items, total: cartTotal, isLoading, updateQuantity, removeItem } = useCartStore();
  const currency = cartTotal?.currencyCode ?? items[0]?.price.currencyCode ?? "USD";
  const total = cartTotal
    ? Number(cartTotal.amount)
    : items.reduce((sum, item) => sum + Number(item.price.amount) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const copy = language === "ar"
    ? {
        title: "سلة التسوق",
        item: totalItems === 1 ? "منتج واحد" : `${totalItems} منتجات`,
        review: "راجع منتجاتك وأكمل بيانات التوصيل بأمان.",
        emptyTitle: "سلتك فارغة حالياً",
        emptyDescription: "اكتشف أحدث الهواتف والإكسسوارات وأضف ما يناسبك إلى السلة.",
        summary: "ملخص الطلب",
        secure: "طلب آمن ومتابعة مباشرة عبر واتساب",
        continueShopping: "متابعة التسوق",
      }
    : {
        title: "Shopping bag",
        item: totalItems === 1 ? "1 product" : `${totalItems} products`,
        review: "Review your products, then complete your delivery details securely.",
        emptyTitle: "Your bag is empty",
        emptyDescription: "Explore the latest phones and accessories, then add your favourites here.",
        summary: "Order summary",
        secure: "Secure ordering with direct WhatsApp follow-up",
        continueShopping: "Continue shopping",
      };

  return (
    <StoreLayout>
      <div className="cart-page mx-auto w-full max-w-4xl px-3 pb-8 pt-5 sm:px-5 sm:pb-12 sm:pt-8 lg:px-6">
        <header className="mb-5 flex items-end justify-between gap-4 border-b pb-5 sm:mb-7 sm:pb-6">
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-primary">Space Call</p>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{copy.title}</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{copy.review}</p>
          </div>
          {items.length > 0 ? (
            <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              {copy.item}
            </span>
          ) : null}
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
          <div className="space-y-5">
            <ul className="space-y-3" aria-label={copy.title}>
              {items.map((item) => {
                const image = item.product.node.images?.edges?.[0]?.node;
                return (
                  <li
                    key={item.variantId}
                    className="group relative flex gap-3 rounded-2xl border bg-card p-3 shadow-card transition-[border-color,box-shadow] duration-200 hover:border-primary/20 hover:shadow-card-hover sm:gap-5 sm:p-4"
                  >
                    <Link
                      to="/product/$handle"
                      params={{ handle: item.product.node.handle }}
                      className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border bg-image-stage sm:h-28 sm:w-28"
                    >
                      {image && (
                        <img
                          src={cdnImage(image.url, 160)}
                          alt={image.altText ?? item.product.node.title}
                          className="h-full w-full object-contain p-2.5"
                          loading="lazy"
                          decoding="async"
                          width={80}
                          height={80}
                        />
                      )}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link
                        to="/product/$handle"
                        params={{ handle: item.product.node.handle }}
                        className="line-clamp-2 pe-8 text-sm font-bold leading-5 transition-colors hover:text-primary sm:text-base"
                      >
                        {item.product.node.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {variantSummary(item.selectedOptions)}
                      </p>
                      <p className="mt-2 text-base font-extrabold text-primary">
                        {formatPrice(item.price.amount, item.price.currencyCode)}
                      </p>
                      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                        <div className="flex h-10 items-center rounded-xl border bg-background p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("decreaseQuantity")}
                            onClick={() => void updateQuantity(item.variantId, item.quantity - 1)}
                            className="h-8 w-8 rounded-lg"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("increaseQuantity")}
                            onClick={() => void updateQuantity(item.variantId, item.quantity + 1)}
                            className="h-8 w-8 rounded-lg"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground sm:text-sm">
                          {formatPrice(Number(item.price.amount) * item.quantity, item.price.currencyCode)}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void removeItem(item.variantId)}
                      aria-label={t("removeItem")}
                      className="absolute end-2 top-2 h-9 w-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:end-3 sm:top-3"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>

            <section className="rounded-2xl border bg-card p-4 shadow-card sm:p-6" aria-label={copy.summary}>
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h2 className="text-sm font-extrabold">{copy.summary}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" />
                    {copy.secure}
                  </p>
                </div>
                <div className="text-end">
                  <span className="block text-xs text-muted-foreground">{t("subtotal")}</span>
                  <span className="mt-1 block text-2xl font-extrabold tabular-nums text-primary">
                  {formatPrice(total, currency)}
                  </span>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="mt-4 px-0 text-muted-foreground hover:bg-transparent hover:text-primary">
                <Link to="/shop">
                  <ArrowRight className="rtl:rotate-180" />
                  {copy.continueShopping}
                </Link>
              </Button>
            </section>

            <CheckoutDetailsForm
              items={items}
              total={total}
              currency={currency}
              disabled={isLoading}
            />
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
