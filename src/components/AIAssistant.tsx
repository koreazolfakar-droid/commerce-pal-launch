import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

import { askGeminiShoppingAdvisor } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/ProductCard";
import { productsByHandlesQueryOptions } from "@/lib/queries";
import { STORE_NAME } from "@/lib/storeConfig";
import { useCompareStore } from "@/stores/compareStore";

type Message = { role: "user" | "assistant"; text: string };

export function AIAssistant({ context = "" }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recommendationHandles, setRecommendationHandles] = useState<string[]>([]);
  const [sources, setSources] = useState<Array<{ title: string; url: string }>>([]);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const compareHandles = useCompareStore((state) => state.handles);
  const isComparePage = pathname === "/compare";
  const { data: comparedProducts = [] } = useQuery(
    productsByHandlesQueryOptions(isComparePage ? compareHandles : []),
  );
  const comparisonContext = useMemo(() => {
    if (!isComparePage || comparedProducts.length === 0) return "";
    return comparedProducts
      .map((product) => {
        const node = product.node;
        const price = node.variants.edges[0]?.node.price ?? node.priceRange.minVariantPrice;
        const options = node.variants.edges[0]?.node.selectedOptions
          ?.filter((option) => option.value !== "Default Title")
          .map((option) => `${option.name}: ${option.value}`)
          .join(", ");
        return [
          `Compared product: ${node.title}`,
          `Handle: ${node.handle}`,
          `Brand: ${node.vendor || "Not provided"}`,
          `Type: ${node.productType || "Not provided"}`,
          `Price: ${price.amount} ${price.currencyCode}`,
          `Availability: ${node.availableForSale ? "In stock" : "Out of stock"}`,
          options ? `Selected options: ${options}` : "",
          node.description ? `Description: ${node.description.slice(0, 700)}` : "",
          node.tags?.length ? `Tags: ${node.tags.slice(0, 20).join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n")
      .slice(0, 5000);
  }, [comparedProducts, isComparePage]);
  const effectiveContext = context || comparisonContext;
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `I can search the ${STORE_NAME} catalogue, compare products, work within your budget, and recommend compatible accessories.`,
    },
  ]);
  const suggested = useMemo(
    () =>
      isComparePage && compareHandles.length > 0
        ? [
            "Which of these phones is the best overall?",
            "Compare camera, battery and performance",
            "Which one is the best value for money?",
          ]
        : [
            "Find the best phone for my budget",
            "Compare the best options",
            "What should I buy with this phone?",
          ],
    [compareHandles.length, isComparePage],
  );
  const { data: recommendationProducts = [] } = useQuery(
    productsByHandlesQueryOptions(recommendationHandles),
  );

  const send = async (value = input) => {
    const message = value.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((items) => [...items, { role: "user", text: message }]);
    setBusy(true);
    try {
      const result = await askGeminiShoppingAdvisor({
        data: { message, productContext: effectiveContext },
      });
      setMessages((items) => [...items, { role: "assistant", text: result.answer }]);
      setRecommendationHandles(result.recommendations?.map((item) => item.handle) ?? []);
      setSources(result.sources ?? []);
      if (!result.ok) toast.message("AI assistant needs configuration");
    } catch {
      setMessages((items) => [
        ...items,
        { role: "assistant", text: "Sorry, I couldn't connect right now. Please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open AI shopping assistant"
          onClick={() => setOpen(true)}
          className="store-ai-launcher fixed z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform hover:scale-105"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div
          className="store-ai-panel fixed inset-x-3 z-50 flex flex-col overflow-hidden rounded-3xl border bg-card shadow-float sm:left-auto sm:right-6 sm:w-[390px]"
          role="region"
          aria-label="AI shopping assistant"
        >
          <div className="flex items-center justify-between border-b bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-extrabold">{STORE_NAME} AI</p>
                <p className="text-[10px] text-muted-foreground">
                  {isComparePage && compareHandles.length > 0
                    ? "Comparison-aware shopping assistant"
                    : "Real store-aware assistant"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close AI assistant"
              onClick={() => setOpen(false)}
            >
              <X />
            </Button>
          </div>
          <div
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "max-w-[88%] break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-surface text-foreground",
                )}
              >
                {message.text}
              </div>
            ))}
            {recommendationProducts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {recommendationProducts.slice(0, 4).map((item) => (
                  <ProductCard key={item.node.handle} product={item} />
                ))}
              </div>
            ) : null}
            {sources.length > 0 && (
              <div className="border-t pt-2 text-[10px] text-muted-foreground">
                {sources.slice(0, 4).map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mr-2 inline-flex items-center hover:text-primary"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            )}
            {busy && (
              <div className="w-fit rounded-2xl bg-surface px-3.5 py-2.5 text-xs text-muted-foreground">
                Thinking…
              </div>
            )}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggested.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => send(item)}
                    className="rounded-full border px-3 py-1.5 text-[11px] font-semibold hover:border-primary hover:text-primary"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="border-t p-3"
          >
            <div className="flex items-center gap-2 rounded-2xl border bg-background p-1.5 focus-within:border-primary">
              <MessageCircle className="ml-2 h-4 w-4 text-muted-foreground" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={1200}
                placeholder={
                  isComparePage && compareHandles.length > 0
                    ? "Ask which compared phone is better…"
                    : "Ask about phones, specs or deals…"
                }
                aria-label="Your question for the shopping assistant"
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
              />
              <Button
                type="submit"
                aria-label="Send question"
                size="icon"
                disabled={!input.trim() || busy}
                className="rounded-xl"
              >
                <Send />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
