import {
  ArrowLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Bot,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Flame,
  Globe2,
  Loader2,
  MessageCircle,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Square,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { productCompareAt, productPrimaryVariant } from "@/lib/productPricing";
import { productsByHandlesQueryOptions } from "@/lib/queries";
import { askSmartPhoneAdvisor, type SmartAdvisorResult } from "@/lib/smartPhoneAdvisor.functions";
import { discountPercent, formatPrice, variantSummary, type ShopifyProduct } from "@/lib/shopify";
import { STORE_NAME } from "@/lib/storeConfig";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useCompareStore } from "@/stores/compareStore";

export const OPEN_SMART_ADVISOR_EVENT = "spacecall:open-ai";

const CHAT_STORAGE_KEY = "spacecall-ai-chat-v2";
const PROFILE_STORAGE_KEY = "spacecall-ai-profile-v1";

const BUDGET_OPTIONS = ["Under $200", "$200–$400", "$400–$700", "$700+", "مش مهم السعر"];
const PRIORITY_OPTIONS = [
  "Camera",
  "Gaming",
  "Battery",
  "Performance",
  "Social Media",
  "Work",
  "All-rounder",
];

type GuidedStep = "budget" | "priority" | null;

type ShopperProfile = {
  budget?: string;
  priority?: string;
  brand?: string;
  storage?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  result?: SmartAdvisorResult;
  failed?: boolean;
  quickOptions?: string[];
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

function welcomeMessage(): ChatMessage {
  return {
    role: "assistant",
    text: "شو الهاتف المناسب إلك؟ خبرني عن ميزانيتك أو استخدامك وأنا بساعدك تختار.",
  };
}

function isBroadPhoneRequest(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 80) return false;
  return /^(بدي|اريد|أريد|بدّي|need|want|looking for).*(تلفون|هاتف|phone|mobile)|^(تلفون|هاتف|phone)\s*(منيح|جيد|good|best)?$/iu.test(
    normalized,
  );
}

export function SmartPhoneAdvisor({ context = "" }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusStage, setStatusStage] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const [profile, setProfile] = useState<ShopperProfile>({});
  const [guidedStep, setGuidedStep] = useState<GuidedStep>(null);
  const [hydrated, setHydrated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const requestSeqRef = useRef(0);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const compareHandles = useCompareStore((state) => state.handles);
  const addCompare = useCompareStore((state) => state.add);
  const addCartItem = useCartStore((state) => state.addItem);
  const cartLoading = useCartStore((state) => state.isLoading);
  const isComparePage = pathname === "/compare";

  const { data: comparedProducts = [] } = useQuery(
    productsByHandlesQueryOptions(isComparePage ? compareHandles : []),
  );

  const recommendationHandles = useMemo(
    () =>
      [
        ...new Set(
          messages.flatMap(
            (message) => message.result?.storeRecommendations.map((item) => item.handle) ?? [],
          ),
        ),
      ].slice(-16),
    [messages],
  );
  const { data: recommendedProducts = [] } = useQuery(
    productsByHandlesQueryOptions(recommendationHandles),
  );
  const recommendationByHandle = useMemo(
    () => new Map(recommendedProducts.map((product) => [product.node.handle, product])),
    [recommendedProducts],
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

  const profileContext = useMemo(() => {
    const parts = [
      profile.budget ? `Shopper budget: ${profile.budget}` : "",
      profile.priority ? `Main priority: ${profile.priority}` : "",
      profile.brand ? `Preferred brand: ${profile.brand}` : "",
      profile.storage ? `Preferred storage: ${profile.storage}` : "",
    ].filter(Boolean);
    return parts.join("\n");
  }, [profile]);

  const effectiveContext = [context || compareContext, profileContext].filter(Boolean).join("\n\n");

  const quickPrompts = useMemo(() => {
    const lastFollowUps = [...messages]
      .reverse()
      .find((message) => message.result?.followUps?.length)?.result?.followUps;
    if (lastFollowUps?.length) return lastFollowUps.slice(0, 4);
    if (isComparePage && compareHandles.length > 0) {
      return [
        "مين الأفضل بشكل عام؟",
        "قارن الكاميرا والبطارية والأداء",
        "مين بيعطيني أفضل قيمة؟",
        "شو أكبر فرق بينهم؟",
      ];
    }
    if (context) {
      return ["شو أهم نقاط قوته؟", "شو أبرز عيوبه؟", "قارنه مع بديل قوي", "هل سعره مستاهل؟"];
    }
    return [
      "أفضل هاتف تحت $300",
      "بدي هاتف للتصوير",
      "أفضل هاتف للألعاب",
      "iPhone أو Samsung؟",
      "قارن بين هاتفين",
      "بدي بطارية قوية",
      "أفضل هاتف للجامعة",
      "شو أفضل عرض حالياً؟",
    ];
  }, [compareHandles.length, context, isComparePage, messages]);

  const placeholder = useMemo(() => {
    if (guidedStep === "budget") return "اكتب ميزانيتك مثلاً $300…";
    if (guidedStep === "priority") return "شو أهم شيء بالنسبة إلك؟";
    if (isComparePage) return "قارن الهواتف الموجودة…";
    if (messages.length > 3) return "اسأل سؤال متابعة…";
    return "اسأل عن أي هاتف أو اكتب ميزانيتك…";
  }, [guidedStep, isComparePage, messages.length]);

  useEffect(() => {
    try {
      const savedMessages = window.localStorage.getItem(CHAT_STORAGE_KEY);
      const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed.slice(-20));
      }
      if (savedProfile) setProfile(JSON.parse(savedProfile) as ShopperProfile);
    } catch (error) {
      console.warn("Could not restore AI conversation", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-20)));
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.warn("Could not save AI conversation", error);
    }
  }, [hydrated, messages, profile]);

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
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: messages.length > 1 ? "smooth" : "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [busy, messages, open]);

  useEffect(() => {
    if (!busy) {
      setStatusStage(0);
      return;
    }
    const first = window.setTimeout(() => setStatusStage(1), 850);
    const second = window.setTimeout(() => setStatusStage(2), 2200);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [busy]);

  const resetConversation = () => {
    requestSeqRef.current += 1;
    setBusy(false);
    setGuidedStep(null);
    setMessages([welcomeMessage()]);
    setProfile({});
    setInput("");
    try {
      window.localStorage.removeItem(CHAT_STORAGE_KEY);
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // Ignore unavailable storage.
    }
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const stopGeneration = () => {
    requestSeqRef.current += 1;
    setBusy(false);
  };

  const beginFinder = () => {
    setOpen(true);
    setGuidedStep("budget");
    setMessages((items) => [
      ...items,
      {
        role: "assistant",
        text: "أكيد 👌 خلّيني ضيّق الخيارات شوي. شو ميزانيتك تقريباً؟",
        quickOptions: BUDGET_OPTIONS,
      },
    ]);
  };

  const send = async (value = input) => {
    const message = value.trim();
    if (!message || busy) return;

    setInput("");

    if (guidedStep === "budget") {
      setProfile((current) => ({ ...current, budget: message }));
      setGuidedStep("priority");
      setMessages((items) => [
        ...items,
        { role: "user", text: message },
        {
          role: "assistant",
          text: "ممتاز. شو أهم شيء بالنسبة إلك بالهاتف؟",
          quickOptions: PRIORITY_OPTIONS,
        },
      ]);
      return;
    }

    let requestMessage = message;
    if (guidedStep === "priority") {
      const nextProfile = { ...profile, priority: message };
      setProfile(nextProfile);
      setGuidedStep(null);
      requestMessage = `Recommend the best phones for me. Budget: ${nextProfile.budget ?? "not fixed"}. Main priority: ${message}. Give me Best Match, Alternative, and Best Value from the live store catalogue.`;
    } else if (isBroadPhoneRequest(message) && !profile.budget) {
      setGuidedStep("budget");
      setMessages((items) => [
        ...items,
        { role: "user", text: message },
        {
          role: "assistant",
          text: "أكيد 👌 خلّيني ضيّق الخيارات شوي. شو ميزانيتك تقريباً؟",
          quickOptions: BUDGET_OPTIONS,
        },
      ]);
      return;
    }

    const history = messages.slice(-8).map((item) => ({ role: item.role, text: item.text }));
    setMessages((items) => [...items, { role: "user", text: message }]);
    setBusy(true);
    const requestId = ++requestSeqRef.current;

    try {
      const result = await askSmartPhoneAdvisor({
        data: {
          message: requestMessage,
          ...(effectiveContext ? { productContext: effectiveContext } : {}),
          history,
        },
      });
      if (requestSeqRef.current !== requestId) return;
      setMessages((items) => [
        ...items,
        { role: "assistant", text: result.answer, result, failed: !result.ok },
      ]);
    } catch (error) {
      if (requestSeqRef.current !== requestId) return;
      console.error("Smart phone advisor UI error", error);
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: "ما قدرت أوصل للمساعد حالياً. جرّب مرة ثانية، وبيانات المتجر رح تضل المرجع للسعر والمخزون.",
          failed: true,
        },
      ]);
    } finally {
      if (requestSeqRef.current === requestId) setBusy(false);
    }
  };

  const handleAddRecommendation = async (product: ShopifyProduct) => {
    const variant = productPrimaryVariant(product);
    if (!variant) return;
    const success = await addCartItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions ?? [],
    });
    if (success) toast.success(`${product.node.title} added to cart`, { position: "top-center" });
    else toast.error("Could not add this product to cart", { position: "top-center" });
  };

  const handleCompare = (handle: string) => {
    const result = addCompare(handle);
    if (result === "full") {
      toast.error("You can compare up to 4 products", { position: "top-center" });
      return;
    }
    if (result === "exists") {
      window.location.href = "/compare";
      return;
    }
    toast.success("Added to comparison", { position: "top-center" });
  };

  const isWelcome = messages.length === 1;
  const loadingText = [
    "Space Call AI is searching the store…",
    "Comparing specifications…",
    "Preparing the best recommendation…",
  ][statusStage];

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open Space Call AI"
          onClick={() => setOpen(true)}
          className="group fixed bottom-[calc(var(--mobile-nav-height)+14px)] right-4 z-40 inline-flex h-12 w-12 items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary px-0 text-primary-foreground shadow-float transition-[transform,box-shadow,width] duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 sm:right-5 sm:w-auto sm:rounded-full sm:px-4 lg:bottom-6 lg:right-6"
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden text-sm font-extrabold sm:inline">Space Call AI</span>
        </button>
      )}

      {open && (
        <>
          <button
            type="button"
            aria-label="Close Space Call AI"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[49] hidden bg-black/15 backdrop-blur-[2px] lg:block"
          />

          <section
            className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-background sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(82dvh,760px)] sm:w-[440px] sm:rounded-[var(--sc-card-radius)] sm:border sm:border-border/80 sm:bg-card sm:shadow-2xl lg:bottom-6 lg:right-6 lg:w-[500px]"
            role="dialog"
            aria-modal="true"
            aria-label="Space Call AI smart shopping assistant"
          >
            <header className="shrink-0 border-b border-border/70 bg-card/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-4 sm:pt-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-[var(--sc-control-radius)] sm:hidden"
                    aria-label="Back"
                    onClick={() => setOpen(false)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-[var(--sc-control-radius)] bg-primary text-primary-foreground shadow-card">
                    <Sparkles className="h-4.5 w-4.5" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-black tracking-tight">
                      Space Call AI
                    </h2>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online · shopping
                      assistant
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 rounded-[var(--sc-control-radius)] px-3 text-[11px] font-bold text-muted-foreground"
                    aria-label="Start a new conversation"
                    onClick={resetConversation}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> New Chat
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden h-10 w-10 rounded-[var(--sc-control-radius)] sm:inline-flex"
                    aria-label="Close smart assistant"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {effectiveContext && (
                <div className="mt-2.5 flex items-center gap-2 rounded-[var(--sc-control-radius)] border border-primary/10 bg-primary/[0.04] px-3 py-2 text-[10px] font-semibold text-muted-foreground">
                  <Cpu className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {isComparePage
                    ? "عم استخدم الهواتف الموجودة حالياً بالمقارنة"
                    : profile.budget || profile.priority
                      ? `متذكّر تفضيلاتك${profile.budget ? ` · ${profile.budget}` : ""}${profile.priority ? ` · ${profile.priority}` : ""}`
                      : "Using this product as conversation context"}
                </div>
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background px-3 py-4 sm:px-4">
              {isWelcome && (
                <div className="mx-auto max-w-md pb-4 pt-1 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-primary/10 bg-primary/[0.06] text-primary shadow-card">
                    <Bot className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-lg font-black tracking-tight text-foreground">
                    شو الهاتف المناسب إلك؟
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-[340px] text-[12px] leading-relaxed text-muted-foreground">
                    خبرني عن ميزانيتك أو استخدامك وأنا بساعدك تختار.
                  </p>
                  <button
                    type="button"
                    onClick={beginFinder}
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-[11px] font-extrabold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
                  >
                    <Search className="h-3.5 w-3.5" /> Find a phone for me
                  </button>
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
                      {message.role === "assistant" && index !== 0 && (
                        <span className="mb-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl border bg-card text-primary shadow-sm">
                          <Sparkles className="h-3.5 w-3.5" />
                        </span>
                      )}

                      {(index !== 0 || !isWelcome) && (
                        <div
                          className={cn(
                            "max-w-[88%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-[13px] leading-[1.55] shadow-sm",
                            message.role === "user"
                              ? "rounded-[var(--sc-card-radius)] rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-[var(--sc-card-radius)] rounded-bl-md border bg-card text-foreground",
                            message.failed &&
                              "border-destructive/25 bg-destructive/5 text-foreground",
                          )}
                        >
                          {message.text}
                          {message.failed && (
                            <button
                              type="button"
                              onClick={() => {
                                const lastUser = [...messages]
                                  .slice(0, index)
                                  .reverse()
                                  .find((item) => item.role === "user");
                                if (lastUser) void send(lastUser.text);
                              }}
                              className="mt-2 flex items-center gap-1.5 text-[11px] font-extrabold text-primary"
                            >
                              <RefreshCw className="h-3 w-3" /> Try again
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {message.quickOptions?.length ? (
                      <div className="ml-9 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {message.quickOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => void send(option)}
                            className="shrink-0 rounded-full border bg-card px-3 py-2 text-[10px] font-extrabold text-foreground shadow-sm transition-colors hover:border-primary/45 hover:text-primary"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {message.role === "assistant" && message.result && (
                      <div className="ml-0 space-y-2.5 sm:ml-9">
                        {message.result.bestPick && (
                          <div className="flex items-start gap-2.5 rounded-[var(--sc-card-radius)] border border-primary/15 bg-primary/[0.05] p-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                              <Star className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-primary">
                                AI Recommendation
                              </p>
                              <p className="mt-0.5 text-xs font-extrabold text-foreground">
                                {message.result.bestPick}
                              </p>
                            </div>
                          </div>
                        )}

                        {message.result.comparison?.length > 0 && (
                          <div className="grid gap-2.5">
                            {message.result.comparison.map((phone) => (
                              <article
                                key={phone.name}
                                className="overflow-hidden rounded-[var(--sc-card-radius)] border bg-card shadow-card"
                              >
                                <div className="flex items-start justify-between gap-3 p-3.5">
                                  <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                                      AI match
                                    </p>
                                    <h3 className="mt-0.5 truncate text-sm font-black tracking-tight">
                                      {phone.name}
                                    </h3>
                                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                      {phone.verdict}
                                    </p>
                                  </div>
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                                    {Math.round(phone.score)}%
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
                                        <dt className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                                          {label}
                                        </dt>
                                        <dd className="mt-1 break-words text-[11px] font-semibold leading-snug text-foreground">
                                          {value}
                                        </dd>
                                      </div>
                                    ))}
                                </dl>

                                {(phone.pros.length > 0 || phone.cons.length > 0) && (
                                  <div className="grid gap-2.5 p-3 sm:grid-cols-2">
                                    {phone.pros.length > 0 && (
                                      <div className="rounded-[var(--sc-control-radius)] border border-success/20 bg-success/5 p-2.5">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-success">
                                          Strengths
                                        </p>
                                        <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed">
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
                                      <div className="rounded-[var(--sc-control-radius)] border bg-surface/70 p-2.5">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-muted-foreground">
                                          Trade-offs
                                        </p>
                                        <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                                          {phone.cons.slice(0, 3).map((item) => (
                                            <li key={item}>• {item}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {phone.storeHandle && (
                                  <div className="flex border-t">
                                    <a
                                      href={`/product/${phone.storeHandle}`}
                                      className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-extrabold text-primary hover:bg-primary/5"
                                    >
                                      View product <ArrowUpRight className="h-3.5 w-3.5" />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleCompare(phone.storeHandle!)}
                                      className="flex flex-1 items-center justify-center gap-1.5 border-l px-3 py-2.5 text-[11px] font-extrabold hover:bg-surface"
                                    >
                                      <Scale className="h-3.5 w-3.5" /> Compare
                                    </button>
                                  </div>
                                )}
                              </article>
                            ))}
                          </div>
                        )}

                        {message.result.storeRecommendations?.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-[9px] font-black uppercase tracking-[0.13em] text-muted-foreground">
                                Available at {STORE_NAME}
                              </p>
                              <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                              {message.result.storeRecommendations.map((item) => {
                                const product = recommendationByHandle.get(item.handle);
                                if (!product) {
                                  return (
                                    <a
                                      key={item.handle}
                                      href={`/product/${item.handle}`}
                                      className="w-[78%] max-w-[300px] shrink-0 snap-start rounded-[var(--sc-card-radius)] border bg-card p-3 shadow-card"
                                    >
                                      <p className="truncate text-xs font-black">{item.title}</p>
                                      <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                                        {item.reason}
                                      </p>
                                      <div className="mt-3 flex items-center justify-between">
                                        <bdi className="text-sm font-black text-primary">
                                          {formatStorePrice(item.price, item.currency)}
                                        </bdi>
                                        <span
                                          className={cn(
                                            "text-[9px] font-black uppercase",
                                            item.available
                                              ? "text-success"
                                              : "text-muted-foreground",
                                          )}
                                        >
                                          {item.available ? "In stock" : "Out of stock"}
                                        </span>
                                      </div>
                                    </a>
                                  );
                                }

                                const node = product.node;
                                const variant = productPrimaryVariant(product);
                                const image = node.images.edges[0]?.node;
                                const price = variant?.price ?? node.priceRange.minVariantPrice;
                                const compareAt = productCompareAt(product);
                                const discount = discountPercent(price.amount, compareAt);
                                const summary = variantSummary(variant?.selectedOptions);
                                const inStock = variant?.availableForSale ?? node.availableForSale;

                                return (
                                  <article
                                    key={item.handle}
                                    className="w-[78%] max-w-[310px] shrink-0 snap-start overflow-hidden rounded-[var(--sc-card-radius)] border bg-card shadow-card"
                                  >
                                    <div className="relative bg-white">
                                      <a href={`/product/${item.handle}`} className="block">
                                        <ProductImage
                                          url={image?.url}
                                          alt={image?.altText ?? node.title}
                                          size={300}
                                          sizes="300px"
                                        />
                                      </a>
                                      {discount !== null && (
                                        <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[9px] font-black text-destructive-foreground">
                                          -{discount}%
                                        </span>
                                      )}
                                    </div>
                                    <div className="p-3">
                                      <a href={`/product/${item.handle}`} className="block">
                                        <h3 className="line-clamp-2 text-[13px] font-black leading-snug">
                                          {node.title}
                                        </h3>
                                      </a>
                                      {summary && (
                                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                                          {summary}
                                        </p>
                                      )}
                                      <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                                        {item.reason}
                                      </p>
                                      <div className="mt-2.5 flex items-end justify-between gap-2">
                                        <div>
                                          <div className="flex items-baseline gap-1.5">
                                            <bdi className="text-sm font-black text-primary">
                                              {formatPrice(price.amount, price.currencyCode)}
                                            </bdi>
                                            {discount !== null && compareAt && (
                                              <bdi className="text-[9px] text-muted-foreground line-through">
                                                {formatPrice(compareAt, price.currencyCode)}
                                              </bdi>
                                            )}
                                          </div>
                                          <p
                                            className={cn(
                                              "mt-0.5 text-[9px] font-black uppercase",
                                              inStock ? "text-success" : "text-muted-foreground",
                                            )}
                                          >
                                            {inStock ? "In stock" : "Out of stock"}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="mt-3 grid grid-cols-3 gap-1.5">
                                        <a
                                          href={`/product/${item.handle}`}
                                          className="flex h-9 items-center justify-center rounded-xl border text-[9px] font-extrabold"
                                        >
                                          View
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => handleCompare(item.handle)}
                                          className="flex h-9 items-center justify-center gap-1 rounded-xl border text-[9px] font-extrabold"
                                        >
                                          <Scale className="h-3 w-3" /> Compare
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleAddRecommendation(product)}
                                          disabled={cartLoading || !variant || !inStock}
                                          className="flex h-9 items-center justify-center gap-1 rounded-xl bg-primary text-[9px] font-extrabold text-primary-foreground disabled:opacity-40"
                                        >
                                          {cartLoading ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <ShoppingCart className="h-3 w-3" />
                                          )}
                                          Add
                                        </button>
                                      </div>
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {message.result.sources?.length > 0 && (
                          <div className="rounded-[var(--sc-card-radius)] border bg-card p-3 shadow-card">
                            <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-muted-foreground">
                              <Globe2 className="h-3 w-3" /> Sources
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {message.result.sources.slice(0, 6).map((source) => (
                                <a
                                  key={source.url}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex max-w-full items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
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
                                className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-[10px] font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
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
                    <div className="flex items-center gap-2 rounded-[var(--sc-card-radius)] rounded-bl-md border bg-card px-3.5 py-2.5 text-[11px] font-semibold text-muted-foreground shadow-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      {loadingText}
                    </div>
                  </div>
                )}

                {isWelcome && (
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {quickPrompts.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => void send(item)}
                        className="rounded-full border bg-card px-3 py-2 text-[10px] font-extrabold text-foreground shadow-sm transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.025]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={endRef} />
              </div>
            </div>

            <div className="shrink-0 border-t border-border/70 bg-card/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
              <div className="flex gap-2 overflow-x-auto px-3 pt-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4">
                <button
                  type="button"
                  onClick={() => void send("قارن بين هاتفين مناسبين إلي")}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border bg-background px-3 text-[9px] font-extrabold text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Scale className="h-3 w-3" /> Compare
                </button>
                <button
                  type="button"
                  onClick={beginFinder}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border bg-background px-3 text-[9px] font-extrabold text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Search className="h-3 w-3" /> Find Phone
                </button>
                <button
                  type="button"
                  onClick={() => void send("شو أفضل العروض المتوفرة حالياً في المتجر؟")}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border bg-background px-3 text-[9px] font-extrabold text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <BadgeDollarSign className="h-3 w-3" /> Deals
                </button>
                <button
                  type="button"
                  onClick={() => void send("شو أحدث الهواتف المتوفرة حالياً في المتجر؟")}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border bg-background px-3 text-[9px] font-extrabold text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Flame className="h-3 w-3" /> New Phones
                </button>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
                className="px-3 pt-2.5 sm:px-4"
              >
                <div className="rounded-[var(--sc-card-radius)] border bg-background p-1.5 shadow-card transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]">
                  <div className="flex items-end gap-2">
                    <MessageCircle className="mb-3 ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          window.matchMedia("(min-width: 640px)").matches
                        ) {
                          event.preventDefault();
                          void send();
                        }
                      }}
                      rows={1}
                      maxLength={1800}
                      placeholder={placeholder}
                      aria-label="Ask Space Call AI"
                      className="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-0 py-2.5 text-[13px] leading-5 outline-none placeholder:text-muted-foreground/70"
                    />
                    {busy ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-11 w-11 shrink-0 rounded-[var(--sc-control-radius)]"
                        aria-label="Stop response"
                        onClick={stopGeneration}
                      >
                        <Square className="h-3.5 w-3.5 fill-current" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        size="icon"
                        className="h-11 w-11 shrink-0 rounded-[var(--sc-control-radius)]"
                        aria-label="Send question"
                        disabled={!input.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-center text-[9px] font-medium text-muted-foreground/75">
                  Store price & stock come from {STORE_NAME}. AI advice may contain mistakes.
                </p>
              </form>
            </div>
          </section>
        </>
      )}
    </>
  );
}
