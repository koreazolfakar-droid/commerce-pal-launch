import {
  Bot,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Loader2,
  MessageCircle,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  askSmartPhoneAdvisor,
  type SmartAdvisorResult,
} from "@/lib/smartPhoneAdvisor.functions";
import { productsByHandlesQueryOptions } from "@/lib/queries";
import { STORE_NAME } from "@/lib/storeConfig";
import { cn } from "@/lib/utils";
import { useCompareStore } from "@/stores/compareStore";

export const OPEN_SMART_ADVISOR_EVENT = "spacecall:open-ai";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  result?: SmartAdvisorResult;
};

function formatStorePrice(price: string | null, currency: string | null) {
  if (!price) return "";
  const value = Number(price);
  if (!Number.isFinite(value)) return `${price} ${currency ?? ""}`.trim();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${price} ${currency ?? ""}`.trim();
  }
}

export function SmartPhoneAdvisor({ context = "" }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const compareHandles = useCompareStore((state) => state.handles);
  const isComparePage = pathname === "/compare";
  const { data: comparedProducts = [] } = useQuery(
    productsByHandlesQueryOptions(isComparePage ? compareHandles : []),
  );

  const compareContext = useMemo(() => {
    if (!isComparePage || comparedProducts.length === 0) return "";
    return comparedProducts
      .map((product) => {
        const node = product.node;
        const price = node.priceRange.minVariantPrice;
        return [
          `Compared product: ${node.title}`,
          `Handle: ${node.handle}`,
          `Brand: ${node.vendor ?? ""}`,
          `Type: ${node.productType ?? ""}`,
          `Price: ${price.amount} ${price.currencyCode}`,
          `Availability: ${node.availableForSale ? "in stock" : "out of stock"}`,
          `Description: ${(node.description ?? "").slice(0, 700)}`,
        ].join("\n");
      })
      .join("\n\n")
      .slice(0, 6000);
  }, [comparedProducts, isComparePage]);

  const effectiveContext = context || compareContext;
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: `I can research phones on the live web, compare real specifications, and match the best option to the ${STORE_NAME} catalogue.`,
    },
  ]);

  const quickPrompts = useMemo(() => {
    if (isComparePage && compareHandles.length > 0) {
      return [
        "Research these phones online and tell me which one is better overall",
        "Compare camera, battery, display and performance",
        "Which one is the best value for money?",
      ];
    }
    if (context) {
      return [
        "Research this phone online and tell me its real strengths and weaknesses",
        "Compare this phone with the best alternative in the same class",
        "Is this phone a good buy for its price?",
      ];
    }
    return [
      "Find the best phone for my budget",
      "Compare two phones for me",
      "Best camera phone for the money",
      "Best battery phone available now",
    ];
  }, [compareHandles.length, context, isComparePage]);

  useEffect(() => {
    const listener = (event: Event) => {
      setOpen(true);
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      if (detail?.prompt) setInput(detail.prompt);
    };
    window.addEventListener(OPEN_SMART_ADVISOR_EVENT, listener);
    return () => window.removeEventListener(OPEN_SMART_ADVISOR_EVENT, listener);
  }, []);

  const send = async (value = input) => {
    const message = value.trim();
    if (!message || busy) return;

    const history = messages.slice(-8).map((item) => ({ role: item.role, text: item.text }));
    setInput("");
    setMessages((items) => [...items, { role: "user", text: message }]);
    setBusy(true);

    try {
      const result = await askSmartPhoneAdvisor({
        data: {
          message,
          ...(effectiveContext ? { productContext: effectiveContext } : {}),
          history,
        },
      });
      setMessages((items) => [
        ...items,
        { role: "assistant", text: result.answer, result },
      ]);
    } catch (error) {
      console.error("Smart phone advisor UI error", error);
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: "I couldn't complete the web research right now. Please try again.",
        },
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
          aria-label="Open smart phone advisor"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(var(--mobile-nav-height)+14px)] right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform hover:scale-105 lg:bottom-6 lg:right-6"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {open && (
        <section
          className="fixed inset-x-3 bottom-[calc(var(--mobile-nav-height)+10px)] z-50 flex max-h-[78dvh] flex-col overflow-hidden rounded-[1.75rem] border bg-card shadow-float lg:bottom-6 lg:left-auto lg:right-6 lg:w-[440px]"
          role="region"
          aria-label="Smart phone advisor"
        >
          <header className="flex items-center justify-between border-b bg-surface px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{STORE_NAME} Smart Advisor</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                  <Globe2 className="h-3 w-3" /> Live web phone research
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              aria-label="Close smart advisor"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3.5">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className="space-y-2.5">
                <div
                  className={cn(
                    "max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-surface text-foreground",
                  )}
                >
                  {message.text}
                </div>

                {message.result?.searchedWeb && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[10px] font-bold text-primary">
                    <Search className="h-3 w-3" /> Researched on the live web
                  </div>
                )}

                {message.result?.comparison?.length ? (
                  <div className="grid gap-2.5">
                    {message.result.comparison.map((phone) => (
                      <article key={phone.name} className="rounded-2xl border bg-background p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-extrabold">{phone.name}</h3>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {phone.verdict}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary">
                            <Star className="h-3 w-3" /> {Math.round(phone.score)}
                          </span>
                        </div>

                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                          {Object.entries(phone.specs)
                            .filter(([, value]) => Boolean(value))
                            .map(([label, value]) => (
                              <div key={label} className="min-w-0 rounded-xl bg-surface px-2.5 py-2">
                                <dt className="capitalize text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                                  {label}
                                </dt>
                                <dd className="mt-0.5 break-words font-semibold text-foreground">{value}</dd>
                              </div>
                            ))}
                        </dl>

                        {(phone.pros.length > 0 || phone.cons.length > 0) && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {phone.pros.length > 0 && (
                              <div className="rounded-xl border border-success/20 bg-success/5 p-2.5">
                                <p className="text-[10px] font-bold text-success">Strengths</p>
                                <ul className="mt-1.5 space-y-1 text-[11px]">
                                  {phone.pros.slice(0, 3).map((item) => (
                                    <li key={item} className="flex gap-1.5">
                                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {phone.cons.length > 0 && (
                              <div className="rounded-xl border bg-surface p-2.5">
                                <p className="text-[10px] font-bold text-muted-foreground">Trade-offs</p>
                                <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
                                  {phone.cons.slice(0, 3).map((item) => (
                                    <li key={item}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {phone.storeHandle && (
                          <a
                            href={`/product/${phone.storeHandle}`}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" /> View in {STORE_NAME}
                          </a>
                        )}
                      </article>
                    ))}
                  </div>
                ) : null}

                {message.result?.storeRecommendations?.length ? (
                  <div className="rounded-2xl border bg-background p-3.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                      Available from {STORE_NAME}
                    </p>
                    <div className="mt-2.5 space-y-2">
                      {message.result.storeRecommendations.map((item) => (
                        <a
                          key={item.handle}
                          href={`/product/${item.handle}`}
                          className="flex items-start justify-between gap-3 rounded-xl border p-3 transition-colors hover:border-primary/50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-extrabold">{item.title}</p>
                            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                              {item.reason}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-extrabold text-primary">
                              {formatStorePrice(item.price, item.currency)}
                            </p>
                            <p className={cn("mt-1 text-[9px] font-bold", item.available ? "text-success" : "text-muted-foreground")}> 
                              {item.available ? "In stock" : "Out of stock"}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {message.result?.sources?.length ? (
                  <div className="rounded-2xl border bg-background p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                      <Globe2 className="h-3 w-3" /> Sources
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.result.sources.slice(0, 6).map((source) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <span className="max-w-[220px] truncate">{source.title}</span>
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {message.result?.followUps?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {message.result.followUps.slice(0, 3).map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => void send(question)}
                        disabled={busy}
                        className="rounded-full border bg-background px-3 py-1.5 text-[10px] font-semibold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {busy && (
              <div className="flex w-fit items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 text-xs font-medium text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Researching the web and checking the store…
              </div>
            )}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {quickPrompts.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => void send(item)}
                    className="rounded-full border bg-background px-3 py-1.5 text-[11px] font-semibold transition-colors hover:border-primary hover:text-primary"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="border-t bg-card p-3"
          >
            <div className="flex items-center gap-2 rounded-2xl border bg-background p-1.5 focus-within:border-primary">
              <MessageCircle className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={1800}
                placeholder="Ask about any phone or compare models…"
                aria-label="Ask the smart phone advisor"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none"
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-xl"
                aria-label="Send question"
                disabled={!input.trim() || busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
