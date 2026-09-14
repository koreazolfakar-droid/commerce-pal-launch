import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ShopifyProduct } from "@/lib/shopify";
import { STORE_NAME } from "@/lib/storeConfig";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1800),
  productContext: z.string().trim().max(6000).optional(),
  history: z
    .array(
      z.object({ role: z.enum(["user", "assistant"]), text: z.string().trim().min(1).max(1800) }),
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
type Priority =
  | "camera"
  | "gaming"
  | "battery"
  | "performance"
  | "social"
  | "work"
  | "student"
  | "value"
  | "deals"
  | "new"
  | null;
type SortMode = "normal" | "cheaper" | "premium";

const MODEL = "spacecall-smart-bot-v2";
const BRAND_RULES: Array<[RegExp, string]> = [
  [/iphone|apple|ايفون|آيفون|ابل|أبل/i, "apple"],
  [/samsung|galaxy|سامسونج/i, "samsung"],
  [/xiaomi|شاومي/i, "xiaomi"],
  [/redmi|ريدمي/i, "redmi"],
  [/poco|بوكو/i, "poco"],
  [/honor|هونر/i, "honor"],
  [/oppo|اوبو|أوبو/i, "oppo"],
  [/realme|ريلمي/i, "realme"],
  [/oneplus|ون بلس/i, "oneplus"],
  [/google|pixel|بيكسل/i, "google"],
  [/nothing/i, "nothing"],
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const productText = (product: ShopifyProduct) =>
  [
    product.node.title,
    product.node.vendor,
    product.node.productType,
    product.node.description,
    ...(product.node.tags ?? []),
    ...(product.node.collections?.edges ?? []).flatMap((edge) => [
      edge.node.title,
      edge.node.handle,
    ]),
    ...product.node.variants.edges.flatMap((edge) => [
      edge.node.title,
      ...(edge.node.selectedOptions ?? []).flatMap((option) => [option.name, option.value]),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const isPhone = (product: ShopifyProduct) =>
  /(phone|smartphone|mobile|iphone|galaxy|pixel|redmi|poco|honor|oppo|realme|oneplus|nothing|هاتف|موبايل)/i.test(
    productText(product),
  );

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

function extractBudget(text: string): Budget | null {
  const value = normalize(text).replace(/,/g, "");
  if (/مش مهم السعر|no budget|any price|price doesnt matter/i.test(value)) return null;
  const range = value.match(
    /(?:\$|usd\s*)?(\d{2,4})\s*(?:-|–|—|to|الى)\s*(?:\$|usd\s*)?(\d{2,4})/i,
  );
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const under = value.match(
    /(?:under|below|less than|تحت|اقل من|حدود)\s*(?:\$|usd\s*)?(\d{2,4})|(?:budget|ميزاني(?:ه|تي))[^0-9]{0,15}(?:\$|usd\s*)?(\d{2,4})/i,
  );
  if (under) return { max: Number(under[1] ?? under[2]) };
  const plus = value.match(/(?:\$|usd\s*)?(\d{2,4})\s*\+/i);
  return plus ? { min: Number(plus[1]) } : null;
}

const inferBrands = (text: string) => {
  const value = normalize(text);
  return [...new Set(BRAND_RULES.filter(([rule]) => rule.test(value)).map(([, brand]) => brand))];
};

function inferPriority(text: string): Priority {
  const value = normalize(text);
  if (/deal|offer|discount|sale|عرض|عروض|خصم/i.test(value)) return "deals";
  if (/newest|latest|احدث|جديد/i.test(value)) return "new";
  if (/camera|photo|video|تصوير|كاميرا|فيديو/i.test(value)) return "camera";
  if (/gaming|game|العاب|لعب/i.test(value)) return "gaming";
  if (/battery|بطاري|شحن طويل/i.test(value)) return "battery";
  if (/performance|speed|fast|اداء|سريع/i.test(value)) return "performance";
  if (/social|instagram|tiktok|انستغرام|تيكتوك|سوشال/i.test(value)) return "social";
  if (/university|college|student|جامع|طالب|دراس/i.test(value)) return "student";
  if (/work|business|شغل|عمل/i.test(value)) return "work";
  if (/value|money|budget|ميزاني|قيم|سعر/i.test(value)) return "value";
  return null;
}

function inferIntent(text: string): SmartAdvisorResult["intent"] {
  const value = normalize(text);
  if (/compare|comparison|vs\.?|مقارن|قارن|الفرق بين/i.test(value)) return "compare";
  if (/stock|available|availability|متوفر|مخزون/i.test(value)) return "search";
  if (/spec|مواصف|camera|battery|chipset|display|كاميرا|بطاري|شاش/i.test(value)) return "specs";
  if (/recommend|best|choose|اختار|انصح|افضل|بدي|اريد/i.test(value)) return "recommend";
  return "general";
}

function inferSortMode(text: string): SortMode {
  const value = normalize(text);
  if (/cheaper|cheap|lowest price|ارخص|اقل سعر/i.test(value)) return "cheaper";
  if (/premium|flagship|اغلى|افخم|اقوى فئ/i.test(value)) return "premium";
  return "normal";
}

const historyText = (history: z.infer<typeof requestSchema>["history"]) =>
  (history ?? []).map((item) => `${item.role}: ${item.text}`).join("\n");

function prioritySignals(priority: Priority) {
  if (priority === "camera")
    return ["camera", "photo", "video", "pro max", "ultra", "كاميرا", "تصوير"];
  if (priority === "gaming")
    return ["gaming", "snapdragon", "dimensity", "poco f", "rog", "redmagic"];
  if (priority === "battery") return ["battery", "mah", "fast charge", "بطارية"];
  if (priority === "performance")
    return ["performance", "snapdragon", "dimensity", "pro", "ultra", "max"];
  if (priority === "student") return ["value", "battery", "128gb", "256gb"];
  if (priority === "work") return ["battery", "256gb", "512gb", "pro"];
  if (priority === "social") return ["camera", "video", "selfie", "instagram", "tiktok"];
  return [];
}

function terms(text: string) {
  const ignored = new Set([
    "assistant",
    "user",
    "phone",
    "mobile",
    "هاتف",
    "تلفون",
    "موبايل",
    "store",
    "shopper",
    "budget",
    "priority",
    "best",
    "option",
    "product",
  ]);
  return [
    ...new Set(
      normalize(text)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length >= 3 && !ignored.has(term)),
    ),
  ].slice(0, 22);
}

function scoreProduct(
  product: ShopifyProduct,
  message: string,
  conversation: string,
  budget: Budget | null,
  brands: string[],
  priority: Priority,
  sortMode: SortMode,
) {
  const haystack = productText(product);
  const price = numericPrice(product);
  let score = product.node.availableForSale ? 26 : -45;
  for (const term of terms(conversation)) if (haystack.includes(term)) score += 2;
  for (const term of terms(message)) if (haystack.includes(term)) score += 8;
  if (brands.length) score += brands.some((brand) => haystack.includes(brand)) ? 26 : -12;
  if (budget?.max !== undefined && Number.isFinite(price)) {
    score +=
      price <= budget.max
        ? 34
        : -Math.min(55, Math.max(12, ((price - budget.max) / Math.max(budget.max, 1)) * 60));
  }
  if (budget?.min !== undefined && Number.isFinite(price)) score += price >= budget.min ? 7 : -4;
  for (const signal of prioritySignals(priority)) if (haystack.includes(signal)) score += 6;
  if (priority === "deals") score += salePercent(product) * 2.2;
  if (priority === "value" && Number.isFinite(price)) score += Math.max(0, 18 - price / 55);
  if (priority === "student" && Number.isFinite(price)) score += Math.max(0, 16 - price / 70);
  if (priority === "new" && product.node.createdAt) {
    const ageDays = (Date.now() - Date.parse(product.node.createdAt)) / 86_400_000;
    if (Number.isFinite(ageDays)) score += Math.max(0, 28 - ageDays / 24);
  }
  if (sortMode === "cheaper" && Number.isFinite(price)) score += Math.max(0, 42 - price / 12);
  if (sortMode === "premium" && Number.isFinite(price)) score += Math.min(35, price / 35);
  return score;
}

const money = (product: ShopifyProduct) => {
  const price = product.node.priceRange?.minVariantPrice;
  return price?.amount ? `${price.amount} ${price.currencyCode}` : "";
};

function reason(
  product: ShopifyProduct,
  budget: Budget | null,
  priority: Priority,
  arabic: boolean,
) {
  const list: string[] = [];
  if (product.node.availableForSale) list.push(arabic ? "متوفر حالياً" : "In stock");
  if (budget?.max !== undefined && numericPrice(product) <= budget.max)
    list.push(arabic ? "ضمن ميزانيتك" : "Fits your budget");
  if (salePercent(product))
    list.push(
      arabic ? `خصم ${salePercent(product)}% تقريباً` : `About ${salePercent(product)}% off`,
    );
  const label: Partial<Record<NonNullable<Priority>, [string, string]>> = {
    camera: ["مناسب للتصوير", "Camera-focused match"],
    gaming: ["مناسب للألعاب", "Gaming-focused match"],
    battery: ["مناسب للبطارية", "Battery-focused match"],
    performance: ["مناسب للأداء", "Performance-focused match"],
    social: ["مناسب للسوشال", "Social-media match"],
    work: ["مناسب للعمل", "Work-focused match"],
    student: ["متوازن للدراسة والسعر", "Balanced for study"],
    value: ["قيمة جيدة مقابل السعر", "Strong value"],
    deals: ["من أقوى العروض", "Strong current deal"],
    new: ["من الأحدث في المتجر", "Newer catalogue item"],
  };
  if (priority && label[priority]) list.push(label[priority]![arabic ? 0 : 1]);
  return (
    list.slice(0, 3).join(" · ") || (arabic ? "تطابق جيد مع طلبك" : "Strong match for your request")
  );
}

const clean = (value?: string) => value?.replace(/\s+/g, " ").trim().slice(0, 90) ?? "";

function extractSpecFacts(product: ShopifyProduct) {
  const text = [product.node.title, product.node.description, ...(product.node.tags ?? [])]
    .filter(Boolean)
    .join(" ");
  return {
    display: clean(
      text.match(
        /\b\d(?:\.\d{1,2})?\s*(?:inch|inches|["”])[^.;\n]{0,55}(?:oled|amoled|lcd|hz)?/i,
      )?.[0],
    ),
    chipset: clean(
      text.match(
        /(snapdragon\s?[\w+ -]{2,28}|dimensity\s?\d{3,5}[\w+ -]*|apple\s+a\d{1,2}\s*(?:pro|max|bionic)?|a\d{2}\s*bionic|exynos\s?\d{3,5})/i,
      )?.[0],
    ),
    camera: clean(text.match(/\b\d{1,3}\s*mp\b[^.;\n]{0,45}/i)?.[0]),
    battery: clean(text.match(/\b\d{4,5}\s*mah\b/i)?.[0]),
    charging: clean(text.match(/\b\d{2,3}\s*w\b[^.;\n]{0,28}(?:charge|charging|شحن)?/i)?.[0]),
    software: clean(
      text.match(
        /(android\s?\d{1,2}|ios\s?\d{1,2}|one ui\s?\d(?:\.\d)?|hyperos\s?\d(?:\.\d)?)/i,
      )?.[0],
    ),
  };
}

function botReply(
  answer: string,
  followUps: string[],
  intent: SmartAdvisorResult["intent"] = "general",
): SmartAdvisorResult {
  return {
    ok: true,
    provider: "local",
    model: MODEL,
    answer,
    intent,
    searchedWeb: false,
    comparison: [],
    bestPick: null,
    storeRecommendations: [],
    sources: [],
    followUps,
  };
}

function localAdvisor(
  catalog: ShopifyProduct[],
  data: z.infer<typeof requestSchema>,
): SmartAdvisorResult {
  const arabic = /[\u0600-\u06ff]/.test(data.message);
  const message = normalize(data.message);
  const conversation = [data.productContext ?? "", historyText(data.history), data.message]
    .filter(Boolean)
    .join("\n");
  const flexible = /مش مهم السعر|no budget|any price/i.test(message);
  const budget = flexible ? null : (extractBudget(data.message) ?? extractBudget(conversation));
  const currentBrands = inferBrands(data.message);
  const brands = currentBrands.length ? currentBrands : inferBrands(conversation);
  const priority = inferPriority(data.message) ?? inferPriority(conversation);
  const intent = inferIntent(data.message);
  const sortMode = inferSortMode(data.message);

  if (/^(hi|hello|hey|مرحبا|اهلا|اهلين|السلام عليكم|سلام|هاي)[!. ]*$/i.test(message)) {
    return botReply(
      arabic
        ? "أهلاً 👋 أنا بوت Space Call الذكي. خبرني ميزانيتك أو استخدامك وأنا بفلتر منتجات المتجر وبختار الأنسب."
        : "Hi 👋 I'm the Space Call smart shopping bot. Tell me your budget or main use and I'll filter the live store catalogue.",
      arabic
        ? ["أفضل هاتف تحت $300", "بدي هاتف للتصوير", "أفضل هاتف للألعاب", "شو أفضل عرض؟"]
        : ["Best phone under $300", "Camera phone", "Gaming phone", "Best deal"],
    );
  }
  if (/^(thanks|thank you|thx|شكرا|يسلمو|مشكور|تمام شكرا)[!. ]*$/i.test(message)) {
    return botReply(
      arabic
        ? "على راسي 🙌 فيني كمان أضيّق لك الخيارات لخيار واحد."
        : "Anytime 🙌 I can narrow the choices down to one final pick.",
      arabic
        ? ["اختارلي واحد", "أرني خيار أرخص", "قارن أفضل خيارين"]
        : ["Pick one", "Show cheaper", "Compare top two"],
    );
  }
  if (/(شو بتقدر تعمل|ماذا تستطيع|كيف بتساعد|what can you do|help me)/i.test(message)) {
    return botReply(
      arabic
        ? "بقدر أختار من منتجات Space Call، أفلتر حسب الميزانية والاستخدام، أقارن، أرتب أفضل قيمة وعروض، وأتحقق من السعر والتوفر. المواصفات أعرضها فقط إذا كانت موجودة ببيانات المنتج."
        : "I can recommend from Space Call products, filter by budget/use, compare choices, rank value/deals, and check current price and availability. I only show specs present in product data.",
      arabic
        ? ["لاقيلِي هاتف مناسب", "قارن iPhone و Samsung", "أفضل عرض"]
        : ["Find me a phone", "Compare iPhone and Samsung", "Best deal"],
    );
  }

  const vague =
    /(بدي|اريد|need|want|looking for).*(تلفون|هاتف|phone|mobile).*(منيح|جيد|مناسب)?$|^(تلفون|هاتف|phone|mobile)\s*(منيح|جيد|good|best)?$/i.test(
      message,
    );
  if (vague && !budget && !flexible && !priority && brands.length === 0) {
    return botReply(
      arabic
        ? "أكيد. حتى ما أعطيك جواب عام، شو ميزانيتك تقريباً؟ وإذا السعر مش مهم اختار شو أهم شيء: كاميرا، ألعاب، بطارية أو أداء."
        : "Sure. To avoid a generic answer, what's your budget? If price doesn't matter, choose camera, gaming, battery, or performance.",
      arabic
        ? ["تحت $200", "$200–$400", "$400–$700", "مش مهم السعر"]
        : ["Under $200", "$200–$400", "$400–$700", "Price doesn't matter"],
      "recommend",
    );
  }

  const pool = catalog.filter(isPhone);
  const products = pool.length >= 3 ? pool : catalog;
  const ranked = products
    .map((product) => ({
      product,
      score: scoreProduct(product, data.message, conversation, budget, brands, priority, sortMode),
    }))
    .sort((a, b) => b.score - a.score || numericPrice(a.product) - numericPrice(b.product));

  let selected = ranked.slice(0, intent === "compare" ? 4 : 3);
  if (intent === "compare" && currentBrands.length >= 2) {
    const picks: typeof selected = [];
    const used = new Set<string>();
    for (const brand of currentBrands.slice(0, 4)) {
      const hit = ranked.find(
        ({ product }) => productText(product).includes(brand) && !used.has(product.node.handle),
      );
      if (hit) {
        picks.push(hit);
        used.add(hit.product.node.handle);
      }
    }
    for (const item of ranked) {
      if (picks.length >= 4) break;
      if (!used.has(item.product.node.handle)) {
        picks.push(item);
        used.add(item.product.node.handle);
      }
    }
    selected = picks;
  }
  if (
    /(second option|option 2|الخيار الثاني|تاني خيار|ثاني خيار)/i.test(message) &&
    intent !== "compare"
  ) {
    selected = ranked.slice(1, 4);
  }

  const recommendations = selected.map(({ product }) => ({
    handle: product.node.handle,
    reason: reason(product, budget, priority, arabic),
    title: product.node.title,
    price: product.node.priceRange?.minVariantPrice?.amount ?? null,
    currency: product.node.priceRange?.minVariantPrice?.currencyCode ?? null,
    available: Boolean(product.node.availableForSale),
  }));

  const comparison =
    intent === "compare"
      ? selected.map(({ product, score }, index) => ({
          name: product.node.title,
          verdict: arabic
            ? `${money(product)} · ${product.node.availableForSale ? "متوفر" : "غير متوفر"} · مبني على بيانات المتجر.`
            : `${money(product)} · ${product.node.availableForSale ? "In stock" : "Out of stock"} · Based on store data.`,
          score: Math.max(58, Math.min(97, Math.round(90 + Math.min(7, score / 18) - index * 5))),
          specs: extractSpecFacts(product),
          pros: [
            product.node.availableForSale ? (arabic ? "متوفر" : "In stock") : "",
            budget?.max !== undefined && numericPrice(product) <= budget.max
              ? arabic
                ? "ضمن الميزانية"
                : "Within budget"
              : "",
          ].filter(Boolean),
          cons: [
            !product.node.availableForSale ? (arabic ? "غير متوفر حالياً" : "Out of stock") : "",
            budget?.max !== undefined && numericPrice(product) > budget.max
              ? arabic
                ? "أعلى من الميزانية"
                : "Above budget"
              : "",
          ].filter(Boolean),
          storeHandle: product.node.handle,
        }))
      : [];

  const best = selected[0]?.product;
  if (!best)
    return botReply(
      arabic
        ? "ما لقيت تطابق مناسب حالياً. جرّب تغيّر الميزانية أو البراند."
        : "No suitable match right now. Try changing the budget or brand.",
      arabic
        ? ["وسع الميزانية", "بدون براند", "أفضل العروض"]
        : ["Increase budget", "Any brand", "Best deals"],
      intent,
    );

  let answer: string;
  if (sortMode === "cheaper") {
    answer = arabic
      ? `أرخص خيار مناسب لنفس طلبك هو ${best.node.title} بسعر ${money(best)}.`
      : `A cheaper option that still matches is ${best.node.title} at ${money(best)}.`;
  } else if (priority === "deals") {
    answer = arabic
      ? `أقوى عرض مطابق لطلبك هو ${best.node.title} بسعر ${money(best)}${salePercent(best) ? ` وخصم حوالي ${salePercent(best)}%` : ""}.`
      : `The strongest deal match is ${best.node.title} at ${money(best)}${salePercent(best) ? ` with about ${salePercent(best)}% off` : ""}.`;
  } else if (intent === "compare") {
    answer = arabic
      ? `قارنت الخيارات الموجودة فعلياً في ${STORE_NAME}. الأفضل حسب طلبك حالياً هو ${best.node.title}.`
      : `I compared the live-store choices in ${STORE_NAME}. The best fit for your request is ${best.node.title}.`;
  } else if (intent === "specs") {
    const facts = Object.values(extractSpecFacts(best)).filter(Boolean).slice(0, 3).join(" · ");
    answer = arabic
      ? `${best.node.title} هو الأقرب لسؤالك. ${facts ? `المواصفات المكتوبة بالمتجر: ${facts}. ` : ""}السعر الحالي ${money(best)}.`
      : `${best.node.title} is the closest match. ${facts ? `Store-listed specs: ${facts}. ` : ""}Current price: ${money(best)}.`;
  } else {
    answer = arabic
      ? `حسب طلبك وسياق المحادثة، أنسب خيار حالياً هو ${best.node.title} بسعر ${money(best)}. تحت بتلاقي أقوى البدائل من كتالوج ${STORE_NAME}.`
      : `Based on your request and conversation context, the best current match is ${best.node.title} at ${money(best)}. Strong alternatives are below.`;
  }

  const followUps = arabic
    ? intent === "compare"
      ? ["مين الأفضل بشكل عام؟", "مين أفضل للكاميرا؟", "مين أفضل للبطارية؟", "أرني الأرخص"]
      : ["قارنه مع الخيار الثاني", "أرني خيار أرخص", "شو الأفضل ضمن ميزانيتي؟", "أرني أفضل العروض"]
    : intent === "compare"
      ? ["Best overall?", "Best camera?", "Best battery?", "Show cheaper"]
      : ["Compare option two", "Show cheaper", "Best within budget?", "Show deals"];

  return {
    ok: true,
    provider: "local",
    model: MODEL,
    answer,
    intent,
    searchedWeb: false,
    comparison,
    bestPick: best.node.title,
    storeRecommendations: recommendations,
    sources: [],
    followUps,
  };
}

function failure(answer: string, errorCode: string): SmartAdvisorResult {
  return {
    ok: false,
    provider: "local",
    model: MODEL,
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
      return localAdvisor(await fetchCatalogProducts(100), data);
    } catch (error) {
      console.error("Space Call smart bot catalogue error", error);
      return failure(
        "I couldn't load the live store catalogue right now. Please try again.",
        "CATALOG_ERROR",
      );
    }
  });
