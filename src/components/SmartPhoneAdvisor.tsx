import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Globe2,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { askSmartPhoneAdvisor, type SmartAdvisorResult } from "@/lib/smartPhoneAdvisor.functions";
import { productsByHandlesQueryOptions } from "@/lib/queries";
import { STORE_NAME } from "@/lib/storeConfig";
import { cn } from "@/lib/utils";
import { useCompareStore } from "@/stores/compareStore";

export const OPEN_SMART_ADVISOR_EVENT = "spacecall:open-ai";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  result?: SmartAdvisorResult;
  failed?: boolean;
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

function welcomeMessage() {
  return {
    role: "assistant" as const,
    text: `Tell me what you need from your next phone. I can compare models, explain trade-offs, and match recommendations to the live ${STORE_NAME} catalogue.`,
  };
}

export function SmartPhoneAdvisor({ context = "" }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  const quickPrompts = useMemo(() => {
    if (isComparePage && compareHandles.length > 0) {
      return [
        "Which of these phones is better overall?",
        "Compare camera, battery and performance",
        "Which one gives the best value?",
        "Explain the biggest trade-offs",
      ];
    }
    if (context) {
      return [
        "What are this phone's main strengths?",
        "What are the biggest weaknesses?",
        "Compare it with a strong alternative",
        "Is it good value in this price range?",
      ];
    }
    return [
      "Best phone for my budget",
      "Best camera for the money",
      "Best battery phone in the store",
      "Help me compare two phones",
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

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    if (window.innerWidth < 1024) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => inputRef.current?.focus(), 180);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: messages.length > 1 ? "smooth" : "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [busy, messages, open]);

  const resetConversation = () => {
    setMessages([welcomeMessage()]);
    setInput("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

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
        { role: "assistant", text: result.answer, result, failed: !result.ok },
      ]);
    } catch (error) {
      console.error("Smart phone advisor UI error", error);
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: "I couldn't complete the AI request right now. Please try again.",
          failed: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const isWelcome = messages.length === 1;

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open smart phone advisor"
          onClick={() => setOpen(true)}
          className="group fixed bottom-[calc(var(--mobile-nav-height)+14px)] right-4 z-40 inline-flex h-12 w-12 items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary px-0 text-primary-foreground shadow-float transition-[transform,box-shadow,width] duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-95 sm:right-5 sm:w-auto sm:rounded-full sm:px-4 lg:bottom-6 lg:right-6"
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden text-sm font-extrabold sm:inline">Ask AI</span>
        </button>
      )}

      {open && (
        <>
          <button
            type="button"
            aria-label="Close smart advisor"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[49] hidden bg-black/15 backdrop-blur-[2px] lg:block"
          />

          <section
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-card shadow-2xl lg:inset-auto lg:bottom-6 lg:right-6 lg:h-[calc(100dvh-3rem)] lg:max-h-[760px] lg:w-[480px] lg:rounded-[2rem] lg:border lg:border-border/80"
            role="dialog"
            aria-modal="true"
            aria-label="Smart phone advisor"
          >
            <header className="relative border-b border-border/70 bg-card/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5 lg:pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    <Sparkles className="h-5 w-5" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[15px] font-black tracking-tight">
                        {STORE_NAME} AI Advisor
                      </h2>
                      <span className="hidden rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-primary sm:inline-flex">
                        Beta
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <Cpu className="h-3 w-3" /> NVIDIA AI · live store catalogue
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-muted-foreground"
                    aria-label="Start a new conversation"
                    onClick={resetConversation}
                    disabled={busy}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    aria-label="Close smart advisor"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {effectiveContext && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/[0.04] px-3 py-2 text-[10px] font-semibold text-muted-foreground">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {isComparePage
                    ? "Using the phones currently in your comparison"
                    : "Using this product as conversation context"}
                </div>
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-surface/35 via-background to-background px-3 py-4 sm:px-4">
              {isWelcome && (
                <div className="mx-auto flex max-w-sm flex-col items-center px-2 pb-4 pt-3 text-center sm:pt-5">
                  <div className="grid h-16 w-16 place-items-center rounded-[1.4rem] border border-primary/10 bg-primary/[0.06] text-primary shadow-sm">
                    <Bot className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-xl font-black tracking-tight text-foreground">
                    Find the right phone faster
                  </h3>
                  <p className="mt-2 max-w-[330px] text-xs leading-relaxed text-muted-foreground">
                    Tell me your budget and what matters most — camera, battery, gaming, display, or
                    value.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className="space-y-2.5">
                    <div
                      className={cn(
                        "flex items-end gap-2.5",
                        message.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      {message.role === "assistant" && (
                        <span className="mb-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl border bg-card text-primary shadow-sm">
                          <Sparkles className="h-3.5 w-3.5" />
                        </span>
                      )}

                      <div
                        className={cn(
                          "max-w-[86%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-[13px] leading-[1.55] shadow-sm",
                          message.role === "user"
                            ? "rounded-[1.2rem] rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-[1.2rem] rounded-bl-md border bg-card text-foreground",
                          message.failed &&
                            "border-destructive/25 bg-destructive/5 text-foreground",
                        )}
                      >
                        {message.text}
                      </div>
                    </div>

                    {message.role === "assistant" && message.result && (
                      <div className="ml-9 space-y-2.5">
                        {message.result.bestPick && (
                          <div className="flex items-start gap-2.5 rounded-2xl border border-primary/15 bg-primary/[0.05] p-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                              <Star className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary">
                                Best pick
                              </p>
                              <p className="mt-0.5 text-xs font-extrabold text-foreground">
                                {message.result.bestPick}
                              </p>
                            </div>
                          </div>
                        )}

                        {message.result.searchedWeb && (
                          <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[10px] font-bold text-primary">
                            <Search className="h-3 w-3" /> Live web verification used
                          </div>
                        )}

                        {message.result.comparison?.length > 0 && (
                          <div className="grid gap-2.5">
                            {message.result.comparison.map((phone) => (
                              <article
                                key={phone.name}
                                className="overflow-hidden rounded-2xl border bg-card shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-3 p-3.5">
                                  <div className="min-w-0">
                                    <h3 className="truncate text-sm font-black tracking-tight">
                                      {phone.name}
                                    </h3>
                                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                      {phone.verdict}
                                    </p>
                                  </div>
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary">
                                    <Star className="h-3 w-3" /> {Math.round(phone.score)}
                                  </span>
                                </div>

                                <dl className="grid grid-cols-2 border-y bg-surface/60 text-[10px]">
                                  {Object.entries(phone.specs)
                                    .filter(([, value]) => Boolean(value))
                                    .map(([label, value], specIndex) => (
                                      <div
                                        key={label}
                                        className={cn(
                                          "min-w-0 p-2.5",
                                          specIndex % 2 === 0 && "border-r",
                                          specIndex >= 2 && "border-t",
                                        )}
                                      >
                                        <dt className="text-[8px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                                          {label}
                                        </dt>
                                        <dd className="mt-1 break-words font-semibold leading-snug text-foreground">
                                          {value}
                                        </dd>
                                      </div>
                                    ))}
                                </dl>

                                {(phone.pros.length > 0 || phone.cons.length > 0) && (
                                  <div className="grid gap-2.5 p-3 sm:grid-cols-2">
                                    {phone.pros.length > 0 && (
                                      <div className="rounded-xl border border-success/20 bg-success/5 p-2.5">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-success">
                                          Strengths
                                        </p>
                                        <ul className="mt-1.5 space-y-1 text-[10px] leading-relaxed">
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
                                      <div className="rounded-xl border bg-surface/70 p-2.5">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-muted-foreground">
                                          Trade-offs
                                        </p>
                                        <ul className="mt-1.5 space-y-1 text-[10px] leading-relaxed text-muted-foreground">
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
                                    className="flex items-center justify-between border-t px-3.5 py-2.5 text-[11px] font-extrabold text-primary transition-colors hover:bg-primary/5"
                                  >
                                    <span className="inline-flex items-center gap-1.5">
                                      <ShoppingBag className="h-3.5 w-3.5" /> View product
                                    </span>
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </article>
                            ))}
                          </div>
                        )}

                        {message.result.storeRecommendations?.length > 0 && (
                          <div className="rounded-2xl border bg-card p-3 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                                Recommended in {STORE_NAME}
                              </p>
                              <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="mt-2.5 space-y-2">
                              {message.result.storeRecommendations.map((item) => (
                                <a
                                  key={item.handle}
                                  href={`/product/${item.handle}`}
                                  className="group flex items-start justify-between gap-3 rounded-xl border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.025]"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-[11px] font-black text-foreground group-hover:text-primary">
                                      {item.title}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-muted-foreground">
                                      {item.reason}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-[11px] font-black text-primary">
                                      {formatStorePrice(item.price, item.currency)}
                                    </p>
                                    <p
                                      className={cn(
                                        "mt-1 text-[8px] font-black uppercase tracking-wide",
                                        item.available ? "text-success" : "text-muted-foreground",
                                      )}
                                    >
                                      {item.available ? "In stock" : "Out of stock"}
                                    </p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {message.result.sources?.length > 0 && (
                          <div className="rounded-2xl border bg-card p-3 shadow-sm">
                            <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                              <Globe2 className="h-3 w-3" /> Sources
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {message.result.sources.slice(0, 6).map((source) => (
                                <a
                                  key={source.url}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex max-w-full items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[9px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                                >
                                  <span className="max-w-[220px] truncate">{source.title}</span>
                                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {message.result.followUps?.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {message.result.followUps.slice(0, 4).map((question) => (
                              <button
                                key={question}
                                type="button"
                                onClick={() => void send(question)}
                                disabled={busy}
                                className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-[9px] font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                              >
                                {question}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {busy && (
                  <div className="flex items-end gap-2.5">
                    <span className="mb-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl border bg-card text-primary shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex items-center gap-2 rounded-[1.2rem] rounded-bl-md border bg-card px-3.5 py-2.5 text-[11px] font-semibold text-muted-foreground shadow-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Thinking and checking the store…
                    </div>
                  </div>
                )}

                {isWelcome && (
                  <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                    {quickPrompts.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => void send(item)}
                        className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl border bg-card px-3.5 py-3 text-left shadow-sm transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.025]"
                      >
                        <span className="text-[11px] font-extrabold leading-snug text-foreground">
                          {item}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </button>
                    ))}
                  </div>
                )}

                <div ref={endRef} />
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
              className="border-t border-border/70 bg-card/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-4 lg:pb-4"
            >
              <div className="rounded-[1.3rem] border bg-background p-1.5 shadow-sm transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]">
                <div className="flex items-end gap-2">
                  <MessageCircle className="mb-3 ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    rows={1}
                    maxLength={1800}
                    placeholder="Ask about phones, prices, camera, battery…"
                    aria-label="Ask the smart phone advisor"
                    className="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-0 py-2.5 text-[13px] leading-5 outline-none placeholder:text-muted-foreground/70"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-2xl"
                    aria-label="Send question"
                    disabled={!input.trim() || busy}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-center text-[8px] font-medium text-muted-foreground/80">
                AI can make mistakes. Verify important specs before buying.
              </p>
            </form>
          </section>
        </>
      )}
    </>
  );
}
