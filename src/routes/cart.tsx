import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { StoreLayout } from "@/components/StoreLayout";
import { formatPrice, variantSummary } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your bag — Space Cell" },
      {
        name: "description",
        content: "Review your Space Cell bag and continue to secure Shopify checkout.",
      },
      { property: "og:title", content: "Your bag — Space Cell" },
      { property: "og:description", content: "Review your bag and check out securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, isLoading, isSyncing, updateQuantity, removeItem, getCheckoutUrl } =
    useCartStore();
  const currency = items[0]?.price.currencyCode ?? "USD";
  const total = items.reduce(
    (sum, item) => sum + parseFloat(item.price.amount) * item.quantity,
    0,
  );

  const checkout = () => {
    const url = getCheckoutUrl();
    if (url) window.open(url, "_blank");
  };

  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your bag</h1>

        {items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border bg-surface px-6 py-16 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Your bag is empty.</p>
            <Link
              to="/shop"
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 divide-y rounded-2xl border">
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
                          src={image.url}
                          alt={image.altText ?? item.product.node.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
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
                        aria-label="Remove item"
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-1 rounded-full border px-1">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
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

            <div className="mt-6 rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-semibold">{formatPrice(total, currency)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Taxes and shipping are calculated at Shopify checkout.
              </p>
              <button
                type="button"
                onClick={checkout}
                disabled={isLoading || isSyncing}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isLoading || isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Checkout with Shopify
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
