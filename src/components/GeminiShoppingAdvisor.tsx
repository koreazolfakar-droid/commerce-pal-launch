import { Bot, Check, ExternalLink, PlugZap, Shield, ShoppingCart, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { askGeminiShoppingAdvisor } from "@/lib/geminiAdvisor.functions";
import { Button } from "@/components/ui/button";
import { CompactProductCard } from "@/components/CompactProductCard";
import type { ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";
import { STORE_NAME } from "@/lib/storeConfig";

function recommendationLabel(product: ShopifyProduct, reason: string) {
  const text =
    `${product.node.title} ${product.node.productType ?? ""} ${(product.node.tags ?? []).join(" ")} ${reason}`.toLowerCase();
  if (/(charger|charging|power adapter|adapter|شاحن)/.test(text))
    return { label: "Compatible charger", icon: PlugZap };
  if (/(case|cover|casing|جراب|كفر|غطاء)/.test(text))
    return { label: "Protect your phone", icon: Shield };
  if (/(cable|usb|كابل|كيبل)/.test(text)) return { label: "Right cable", icon: PlugZap };
  return { label: "Recommended add-on", icon: Sparkles };
}

export function GeminiShoppingAdvisor({
  product,
  catalog,
}: {
  product?: ShopifyProduct;
  catalog?: { products: ShopifyProduct[] };
}) {
  const [open, setOpen] = useState(Boolean(product));
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ShopifyProduct[]>([]);
  const [recommendationReasons, setRecommendationReasons] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Array<{ title: string; url: string }>>([]);
  const [autoChecked, setAutoChecked] = useState(false);

  const productContext = useMemo(() => {
    if (!product) return "";
    const node = product.node;
    return JSON.stringify({
      title: node.title,
      brand: node.vendor,
      type: node.productType,
      description: node.description?.slice(0, 2200),
      tags: node.tags,
      price: node.priceRange.minVariantPrice,
      variants: node.variants.edges.slice(0, 10).map(({ node: variant }) => ({
        title: variant.title,
        price: variant.price,
        available: variant.availableForSale,
        options: variant.selectedOptions,
      })),
      inStoreImages: node.images.edges.slice(0, 4).map(({ node: image }) => image.url),
    });
  }, [product]);

  const ask = async (message: string) => {
    if (busy) return;
    setBusy(true);
    setOpen(true);
    try {
      const result = await askGeminiShoppingAdvisor({ data: { message, productContext } });
      setAnswer(result.answer);
      const map = new Map((catalog?.products ?? []).map((item) => [item.node.handle, item]));
      const reasons: Record<string, string> = {};
      result.recommendations.forEach((item) => {
        reasons[item.handle] = item.reason;
      });
      setRecommendationReasons(reasons);
      setRecommendations(
        result.recommendations
          .map((item) => map.get(item.handle))
          .filter(Boolean) as ShopifyProduct[],
      );
      setSources(result.sources ?? []);
      if (!result.ok) toast.error(result.answer);
    } catch {
      toast.error("The AI shopping advisor is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!product || !catalog?.products?.length || autoChecked) return;
    setAutoChecked(true);
    const timer = window.setTimeout(() => {
      void ask(
        `Automatically complete this purchase. Verify the official manufacturer information for what is included with this exact product. Identify only essential or strongly recommended accessories that are compatible and actually available in the ${STORE_NAME} catalogue. Prioritize a compatible charger if the box does not include one, then a compatible case/cover and the correct cable when relevant. Return the best 1-3 add-ons, with a short reason for each.`,
      );
    }, 450);
    return () => window.clearTimeout(timer);
    // Intentionally one automatic check per product view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.node.handle, catalog?.products?.length, autoChecked]);

  const quickActions = product
    ? [
        {
          label: "Compatible charger",
          message: `Find the correct compatible charger for this product. Verify whether a charger is included using the official manufacturer source, and only recommend a charger that exists in the ${STORE_NAME} catalogue.`,
        },
        {
          label: "Compatible case",
          message: `Find the best compatible phone case or cover for this exact product from the ${STORE_NAME} catalogue. Verify compatibility and only recommend an actually available product.`,
        },
        {
          label: "Right cable",
          message: `Find the correct compatible cable for this product from the ${STORE_NAME} catalogue. Recommend it only when useful and compatible.`,
        },
      ]
    : [
        {
          label: "Best for my budget",
          message: `Find the best product in the ${STORE_NAME} catalogue for my budget and priorities.`,
        },
        {
          label: "Best Samsung",
          message: `Compare Samsung products in the ${STORE_NAME} catalogue and recommend the best value choice.`,
        },
        {
          label: "Camera + gaming",
          message: `Find the best phone in the ${STORE_NAME} catalogue for camera and gaming, balancing price and performance.`,
        },
      ];

  return (
    <section
      className={cn(
        "rounded-[1.35rem] border bg-card shadow-card",
        product ? "p-4 sm:p-5" : "p-5 sm:p-6",
      )}
      aria-label="Gemini shopping advisor"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-extrabold tracking-tight">
              Complete your setup with Gemini
            </h2>
            <p className="truncate text-[11px] text-muted-foreground">
              AI checks compatibility, box contents and live store stock.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close shopping recommendations" : "Open shopping recommendations"}
        >
          {open ? <X className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </Button>
      </div>

      {open && (
        <div className="mt-4">
          {product && (
            <div className="mb-3 flex flex-wrap gap-2">
              {quickActions.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={busy}
                  onClick={() => void ask(item.message)}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-2 text-[11px] font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <PlugZap className="h-3.5 w-3.5" /> {item.label}
                </button>
              ))}
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" /> Checking the official
              product information and matching accessories…
            </div>
          )}

          {recommendations.length > 0 && !busy && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-extrabold">Recommended for this product</h3>
                <span className="text-[10px] text-muted-foreground">
                  Only real {STORE_NAME} products
                </span>
              </div>
              <div className="scroll-rail -mx-1 flex gap-3 px-1 pb-1">
                {recommendations.slice(0, 3).map((item) => {
                  const meta = recommendationLabel(
                    item,
                    recommendationReasons[item.node.handle] ?? "",
                  );
                  const Icon = meta.icon;
                  return (
                    <div
                      key={item.node.handle}
                      className="w-[15rem] shrink-0 rounded-2xl border bg-background p-2.5 sm:w-[17rem]"
                    >
                      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-1 text-[9px] font-extrabold text-accent-foreground">
                        <Icon className="h-3 w-3" /> {meta.label}
                      </div>
                      <CompactProductCard product={item} className="text-start" />
                      {recommendationReasons[item.node.handle] && (
                        <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-muted-foreground">
                          {recommendationReasons[item.node.handle]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!busy && !recommendations.length && answer && (
            <div className="rounded-xl bg-surface p-3 text-xs leading-5">{answer}</div>
          )}

          {sources.length > 0 && !busy && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                Verified sources
              </span>
              {sources.slice(0, 3).map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-[14rem] items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] hover:border-primary hover:text-primary"
                >
                  <Check className="h-3 w-3 shrink-0 text-success" />
                  <span className="truncate">{source.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
