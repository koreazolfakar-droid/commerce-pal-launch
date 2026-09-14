import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ShopifyProduct } from "@/lib/shopify";
import { STORE_NAME } from "@/lib/storeConfig";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1800),
  productContext: z.string().trim().max(6000).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().trim().min(1).max(1800),
      }),
    )
    .max(10)
    .optional(),
});

export type SmartAdvisorComparison = {
  name: string;
  verdict: string;
  score: number;
  specs: {
    display: string;
    chipset: string;
    camera: string;
    battery: string;
    charging: string;
    software: string;
  };
  pros: string[];
  cons: string[];
  storeHandle?: string | null;
};

export type SmartAdvisorStoreRecommendation = {
  handle: string;
  reason: string;
  title: string;
  price: string | null;
  currency: string | null;
  available: boolean;
};

export type SmartAdvisorResult = {
  ok: boolean;
  provider: "local";
  model?: string;
  errorCode?: string;
  answer: string;
  intent: "search" | "compare" | "recommend" | "specs" | "compatibility" | "general";
  searchedWeb: boolean;
  comparison: SmartAdvisorComparison[];
  bestPick: string | null;
  storeRecommendations: SmartAdvisorStoreRecommendation[];
  sources: Array<{ title: string; url: string }>;
  followUps: string[];
};

type Budget = { min?: number; max?: number };
type Priority = "camera" | "gaming" | "battery" | "performance" | "social" | "work" | "student" | "value" | "deals" | "new" | null;

function numericPrice(product: ShopifyProduct) {
  const value = Number(product.node.priceRange?.minVariantPrice?.amount ?? "");
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function compareAtPrice(product: ShopifyProduct) {
  const range = Number(product.node.compareAtPriceRange?.minVariantPrice?.amount ?? "");
  if (Number.isFinite(range) && range > numericPrice(product)) return range;
  for (const edge of product.node.variants.edges) {
    const value = Number(edge.node.compareAtPrice?.amount ?? "");
    if (Number.isFinite(value) && value > numericPrice(product)) return value;
  }
  return null;
}

function salePercent(product: ShopifyProduct) {
  const price = numericPrice(product);
  const compareAt = compareAtPrice(product);
  if (!Number.isFinite(price) || !compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

function productText(product: ShopifyProduct) {
  const node = product.node;
  return [
    node.title,
    node.vendor,
    node.productType,
    node.description,
    ...(node.tags ?? []),
    ...(node.collections?.edges ?? []).flatMap((edge) => [edge.node.title, edge.node.handle]),
    ...node.variants.edges.flatMap((edge) => [
      edge.node.title,
      ...(edge.node.selectedOptions ?? []).flatMap((option) => [option.name, option.value]),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isPhone(product: ShopifyProduct) {
  const text = productText(product);
  return /(phone|smartphone|mobile|iphone|galaxy|pixel|redmi|poco|honor|oppo|realme|oneplus|nothing|هاتف|موبايل)/i.test(text);
}

function extractBudget(text: string): Budget | null {
  const value = text.toLowerCase().replace(/,/g, "");
  if (/مش مهم السعر|no budget|any price|price doesn.?t matter/i.test(value)) return null;

  const range = value.match(/(?:\$|usd\s*)?(\d{2,4})\s*(?:-|–|—|to|الى|إلى)\s*(?:\$|usd\s*)?(\d{2,4})/i);
  if (range) {
    const first = Number(range[1]);
    const second = Number(range[2]);
    return { min: Math.min(first, second), max: Math.max(first, second) };
  }

  const under = value.match(/(?:under|below|less than|تحت|اقل من|أقل من|حدود)\s*(?:\$|usd\s*)?(\d{2,4})|(?:budget|ميزاني(?:ة|تي))[^\d]{0,15}(?:\$|usd\s*)?(\d{2,4})/i);
  if (under) {
    const max = Number(under[1] ?? under[2]);
    if (Number.isFinite(max)) return { max };
  }

  const plus = value.match(/(?:\$|usd\s*)?(\d{2,4})\s*\+/i);
  if (plus) return { min: Number(plus[1]) };

  return null;
}

function inferBrand(text: string) {
  const value = text.toLowerCase();
  const brands: Array<[RegExp, string]> = [
    [/iphone|apple|ايفون|آيفون|ابل|أبل/i, "apple"],
    [/samsung|galaxy|سامسونج/i, "samsung"],
    [/xiaomi|redmi|poco|شاومي|ريدمي|بوكو/i, "xiaomi"],
    [/honor|هونر/i, "honor"],
    [/oppo|اوبو|أوبو/i, "oppo"],
    [/realme|ريلمي/i, "realme"],
    [/oneplus|ون بلس/i, "oneplus"],
    [/google|pixel|بيكسل/i, "google"],
  ];
  return brands.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

function inferPriority(text: string): Priority {
  const value = text.toLowerCase();
  if (/deal|offer|discount|sale|عرض|عروض|خصم/i.test(value)) return "deals";
  if (/new phone|newest|latest|احدث|أحدث|جديد/i.test(value)) return "new";
  if (/camera|photo|video|تصوير|كاميرا|فيديو/i.test(value)) return "camera";
  if (/gaming|game|games|العاب|ألعاب|لعب/i.test(value)) return "gaming";
  if (/battery|بطارية|شحن طويل/i.test(value)) return "battery";
  if (/performance|speed|fast|اداء|أداء|سريع/i.test(value)) return "performance";
  if (/social|instagram|tiktok|انستغرام|تيكتوك|سوشال/i.test(value)) return "social";
  if (/university|college|student|جامعة|طالب|دراسة/i.test(value)) return "student";
  if (/work|business|شغل|عمل/i.test(value)) return "work";
  if (/value|money|budget|ميزانية|قيمة|سعر/i.test(value)) return "value";
  return null;
}

function inferIntent(text: string): SmartAdvisorResult["intent"] {
  if (/compare|comparison|vs\.?|مقارن|قارن|الفرق بين/i.test(text)) return "compare";
  if (/stock|available|availability|متوفر|مخزون/i.test(text)) return "search";
  if (/spec|مواصف|camera|battery|chipset|display|كاميرا|بطارية|شاشة/i.test(text)) return "specs";
  if (/recommend|best|choose|اختار|انصح|أنصح|افضل|أفضل|بدي/i.test(text)) return "recommend";
  return "general";
}

function prioritySignals(priority: Priority) {
  switch (priority) {
    case "camera":
      return ["camera", "photo", "video", "pro max", "ultra", "كاميرا", "تصوير"];
    case "gaming":
      return ["gaming", "game", "snapdragon", "dimensity", "poco f", "rog", "redmagic", "ألعاب"];
    case "battery":
      return ["battery", "mah", "battery life", "fast charge", "بطارية"];
    case "performance":
      return ["performance", "snapdragon", "dimensity", "pro", "ultra", "max", "أداء"];
    case "social":
      return ["camera", "video", "selfie", "social", "instagram", "tiktok"];
    case "student":
      return ["value", "battery", "128gb", "256gb", "student"];
    case "work":
      return ["battery", "256gb", "512gb", "pro", "productivity"];
    default:
      return [];
  }
}

function normalizedTerms(text: string) {
  return [...new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((term) => term.length >= 3))].slice(0, 18);
}

function scoreProduct(product: ShopifyProduct, query: string, budget: Budget | null, brand: string | null, priority: Priority) {
  const text = productText(product);
  const price = numericPrice(product);
  let score = product.node.availableForSale ? 20 : -30;

  const queryTerms = normalizedTerms(query);
  for (const term of queryTerms) if (text.includes(term)) score += 4;

  if (brand) {
    if (text.includes(brand)) score += 24;
    else score -= 8;
  }

  if (budget && Number.isFinite(price)) {
    if (budget.max !== undefined) {
      if (price <= budget.max) score += 28;
      else score -= Math.min(40, Math.max(8, ((price - budget.max) / Math.max(budget.max, 1)) * 45));
    }
    if (budget.min !== undefined) {
      if (price >= budget.min) score += 8;
      else score -= 3;
    }
  }

  for (const signal of prioritySignals(priority)) if (text.includes(signal)) score += 5;

  if (priority === "deals") score += salePercent(product) * 1.8;
  if (priority === "value" && Number.isFinite(price)) score += Math.max(0, 14 - price / 75);
  if (priority === "student" && Number.isFinite(price)) score += Math.max(0, 12 - price / 90);
  if (priority === "new" && product.node.createdAt) {
    const ageDays = (Date.now() - Date.parse(product.node.createdAt)) / 86_400_000;
    if (Number.isFinite(ageDays)) score += Math.max(0, 24 - ageDays / 30);
  }

  return score;
}

function money(product: ShopifyProduct) {
  const price = product.node.priceRange?.minVariantPrice;
  if (!price?.amount) return "";
  return `${price.amount} ${price.currencyCode}`;
}

function recommendationReason(product: ShopifyProduct, budget: Budget | null, priority: Priority, arabic: boolean) {
  const reasons: string[] = [];
  const price = numericPrice(product);
  const discount = salePercent(product);

  if (product.node.availableForSale) reasons.push(arabic ? "متوفر حالياً" : "Currently in stock");
  if (budget?.max !== undefined && price <= budget.max) reasons.push(arabic ? "ضمن ميزانيتك" : "Fits your budget");
  if (discount > 0) reasons.push(arabic ? `عليه خصم حوالي ${discount}%` : `About ${discount}% off`);

  const labels: Partial<Record<NonNullable<Priority>, [string, string]>> = {
    camera: ["مناسب أكثر لطلبك المتعلق بالتصوير", "Matches your camera-focused request"],
    gaming: ["مطابق أكثر لطلبك المتعلق بالألعاب", "Matches your gaming-focused request"],
    battery: ["مطابق أكثر لطلبك المتعلق بالبطارية", "Matches your battery-focused request"],
    performance: ["مطابق أكثر لطلبك المتعلق بالأداء", "Matches your performance-focused request"],
    social: ["مناسب أكثر لاستخدام السوشال", "Matches your social-media use"],
    student: ["خيار متوازن للدراسة والقيمة", "Balanced for study and value"],
    work: ["مناسب أكثر لاستخدام العمل", "Matches your work-focused use"],
    value: ["قيمة جيدة مقارنة بالسعر", "Strong value for the price"],
    deals: ["من أفضل العروض الحالية", "One of the strongest current deals"],
    new: ["من الإضافات الأحدث في الكتالوج", "One of the newer catalogue additions"],
  };
  if (priority && labels[priority]) reasons.push(labels[priority]![arabic ? 0 : 1]);

  return reasons.slice(0, 3).join(" · ") || (arabic ? "مطابق جيد لطلبك من المنتجات المتوفرة" : "A strong match from the available catalogue");
}

function productPros(product: ShopifyProduct, budget: Budget | null, arabic: boolean) {
  const list: string[] = [];
  const price = numericPrice(product);
  const discount = salePercent(product);
  if (product.node.availableForSale) list.push(arabic ? "متوفر في المتجر" : "In stock at the store");
  if (budget?.max !== undefined && price <= budget.max) list.push(arabic ? "ضمن الميزانية" : "Within budget");
  if (discount > 0) list.push(arabic ? `خصم ${discount}% تقريباً` : `About ${discount}% off`);
  const variant = product.node.variants.edges[0]?.node;
  const options = variant?.selectedOptions?.filter((option) => option.value !== "Default Title") ?? [];
  if (options.length) list.push(options.map((option) => option.value).join(" · "));
  return list.slice(0, 3);
}

function productCons(product: ShopifyProduct, budget: Budget | null, arabic: boolean) {
  const list: string[] = [];
  const price = numericPrice(product);
  if (!product.node.availableForSale) list.push(arabic ? "غير متوفر حالياً" : "Currently out of stock");
  if (budget?.max !== undefined && price > budget.max) list.push(arabic ? "أعلى من الميزانية" : "Above budget");
  return list;
}

function emptySpecs() {
  return { display: "", chipset: "", camera: "", battery: "", charging: "", software: "" };
}

function localAdvisor(catalog: ShopifyProduct[], data: z.infer<typeof requestSchema>): SmartAdvisorResult {
  const query = [data.productContext ?? "", data.message].filter(Boolean).join("\n");
  const arabic = /[\u0600-\u06ff]/.test(data.message);
  const budget = extractBudget(query);
  const brand = inferBrand(query);
  const priority = inferPriority(query);
  const intent = inferIntent(data.message);

  const phoneProducts = catalog.filter(isPhone);
  const pool = phoneProducts.length >= 3 ? phoneProducts : catalog;
  const ranked = pool
    .map((product) => ({ product, score: scoreProduct(product, query, budget, brand, priority) }))
    .sort((a, b) => b.score - a.score || numericPrice(a.product) - numericPrice(b.product));

  const selected = ranked.slice(0, intent === "compare" ? 4 : 3);
  const recommendations = selected.map(({ product }) => ({
    handle: product.node.handle,
    reason: recommendationReason(product, budget, priority, arabic),
    title: product.node.title,
    price: product.node.priceRange?.minVariantPrice?.amount ?? null,
    currency: product.node.priceRange?.minVariantPrice?.currencyCode ?? null,
    available: Boolean(product.node.availableForSale),
  }));

  const comparison = intent === "compare"
    ? selected.slice(0, 4).map(({ product, score }, index) => ({
        name: product.node.title,
        verdict: arabic
          ? `${money(product)} · ${product.node.availableForSale ? "متوفر" : "غير متوفر"}. الترتيب مبني على بيانات المتجر وطلبك فقط.`
          : `${money(product)} · ${product.node.availableForSale ? "In stock" : "Out of stock"}. Ranked from store data and your request only.`,
        score: Math.max(55, Math.min(96, Math.round(88 + Math.min(8, score / 10) - index * 5))),
        specs: emptySpecs(),
        pros: productPros(product, budget, arabic),
        cons: productCons(product, budget, arabic),
        storeHandle: product.node.handle,
      }))
    : [];

  const best = selected[0]?.product ?? null;
  let answer: string;
  if (!best) {
    answer = arabic ? "ما لقيت منتجات مناسبة حالياً في الكتالوج." : "I couldn't find a matching product in the current catalogue.";
  } else if (priority === "deals") {
    answer = arabic
      ? `أفضل تطابق للعروض الحالية هو ${best.node.title} بسعر ${money(best)}. عرضت لك أيضاً أقرب البدائل المتوفرة.`
      : `The strongest current deal match is ${best.node.title} at ${money(best)}. I also included the closest available alternatives.`;
  } else if (intent === "compare") {
    answer = arabic
      ? `بناءً على بيانات متجر ${STORE_NAME} وطلبك، ${best.node.title} هو أفضل تطابق حالياً. المقارنة هنا تعتمد على السعر والتوفر وبيانات المنتج الموجودة في المتجر، بدون اختراع مواصفات خارجية.`
      : `Based on ${STORE_NAME}'s live catalogue and your request, ${best.node.title} is the strongest match right now. This comparison uses store price, availability and listed product data only.`;
  } else {
    answer = arabic
      ? `حسب طلبك وبيانات متجر ${STORE_NAME}، أنسب خيار حالياً هو ${best.node.title} بسعر ${money(best)}. تحت بتلاقي أفضل البدائل المتوفرة.`
      : `Based on your request and ${STORE_NAME}'s live catalogue, the best current match is ${best.node.title} at ${money(best)}. The strongest available alternatives are shown below.`;
  }

  const followUps = arabic
    ? ["قارنه مع الخيار الثاني", "أرني خيار أرخص", "شو الأفضل ضمن ميزانيتي؟", "أرني أفضل العروض"]
    : ["Compare it with the second option", "Show me a cheaper option", "What's best within my budget?", "Show me the best deals"];

  return {
    ok: true,
    provider: "local",
    model: "spacecall-local-v1",
    answer,
    intent,
    searchedWeb: false,
    comparison,
    bestPick: best?.node.title ?? null,
    storeRecommendations: recommendations,
    sources: [],
    followUps,
  };
}

function failure(answer: string, errorCode: string): SmartAdvisorResult {
  return {
    ok: false,
    provider: "local",
    model: "spacecall-local-v1",
    errorCode,
    answer,
    intent: "general",
    searchedWeb: false,
    comparison: [],
    bestPick: null,
    storeRecommendations: [],
    sources: [],
    followUps: [],
  };
}

export const askSmartPhoneAdvisor = createServerFn({ method: "POST" })
  .validator(requestSchema)
  .handler(async ({ data }): Promise<SmartAdvisorResult> => {
    try {
      const { fetchCatalogProducts } = await import("@/lib/shopify");
      const catalog = await fetchCatalogProducts(100);
      return localAdvisor(catalog, data);
    } catch (error) {
      console.error("Space Call local advisor catalogue error", error);
      return failure(
        "I couldn't load the live store catalogue right now. Please try again.",
        "CATALOG_ERROR",
      );
    }
  });
