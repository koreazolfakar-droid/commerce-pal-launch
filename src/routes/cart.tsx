import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { StoreLayout } from "@/components/StoreLayout";
import { WhatsAppCheckoutForm } from "@/components/WhatsAppCheckoutForm";
import { cdnImage } from "@/lib/image";
import { formatPrice, variantSummary } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { absoluteUrl, canonicalLink } from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: `Your bag — ${STORE_NAME}` },
      {
        name: "description",
        content: `Review your ${STORE_NAME} bag and continue to secure Shopify checkout.`,
      },
      { property: "og:title", content: `Your bag — ${STORE_NAME}` },
      { property: "og:description", content: "Review your bag and check out securely." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/cart") },
      { name: "robots", content: "noindex, follow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `Your bag — ${STORE_NAME}` },
      { name: "twitter:description", content: "Review your bag and check out securely." },
    ],
    links: [canonicalLink("/cart")],
  }),
  component: CartPage,
});

function CartPage() {
  const { t, language } = useLanguage();
  const {
    items,
    total: shopifyTotal,
    isLoading,
    isSyncing,
    updateQuantity,
    removeItem,
    getCheckoutUrl,
  } = useCartStore();
  const currency = shopifyTotal?.currencyCode ?? items[0]?.price.currencyCode ?? "USD";
  const total = shopifyTotal
    ? Number(shopifyTotal.amount)
    : items.reduce((sum, item) => sum + Number(item.price.amount) * item.quantity, 0);

  const checkout = () => {
    const url = getCheckoutUrl();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">{t("yourBag")}</h1>

        {items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border bg-surface px-6 py-16 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("bagEmpty")}</p>
            <Link
              to="/shop"
              className="press rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              {t("startShopping")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 divide-y rounded-2xl border bg-card shadow-card">
              {items.map((item) => {
                const image = item.product.node.images?.edges?.[0]?.node;
                return (
                  <li key={item.variantId} className="flex gap-4 p-4">
                    <Link
                      to="/product/$handle"
                      params={{ handle: item.product.node.handle }}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface"
                    >
                      {image && (
                        <img
                          src={cdnImage(image.url, 160)}
                          alt={image.altText ?? item.product.node.title}
                          className="h-full w-full object-contain p-1.5"
                          loading="lazy"
                          decoding="async"
                          width={80}
                          height={80}
                        />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/product/$handle"
                        params={{ handle: item.product.node.handle }}
                        className="line-clamp-2 text-sm font-medium hover:text-primary"
                      >
                        {item.product.node.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {variantSummary(item.selectedOptions)}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatPrice(item.price.amount, item.price.currencyCode)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => removeItem(item.variantId)}
                        aria-label={t("removeItem")}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-1 rounded-full border px-1">
                        <button
                          type="button"
                          aria-label={t("decreaseQuantity")}
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={t("increaseQuantity")}
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("subtotal")}</span>
                <span className="text-xl font-extrabold tracking-tight">
                  {formatPrice(total, currency)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {language === "ar"
                  ? "اختر الطلب عبر واتساب لتعبئة بيانات التوصيل، أو تابع إلى Shopify للدفع الإلكتروني."
                  : "Order through WhatsApp with your delivery details, or continue to Shopify for online checkout."}
              </p>
            </div>

            <WhatsAppCheckoutForm
              items={items}
              total={total}
              currency={currency}
              disabled={isLoading || isSyncing}
            />

            <div className="mt-4 rounded-2xl border bg-card p-5 shadow-card lg:sticky lg:bottom-4">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {language === "ar" ? "أو" : "or"}
              </p>
              <p className="mt-2 text-center text-xs text-muted-foreground">{t("taxesShippingCheckout")}</p>
              <button
                type="button"
                onClick={checkout}
                disabled={isLoading || isSyncing}
                className="press mt-4 flex w-full items-center justify-center gap-2 rounded-full border bg-background px-6 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-surface disabled:opacity-60"
              >
                {isLoading || isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    {t("checkoutShopify")}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </StoreLayout>
  );
}
