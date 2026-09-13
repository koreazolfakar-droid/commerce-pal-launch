import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { callNvidiaChat, extractJsonObject, NvidiaApiError } from "@/lib/nvidia";
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

const comparisonItemSchema = z.object({
  name: z.string().min(1).max(180),
  verdict: z.string().min(1).max(400),
  score: z.number().min(0).max(100),
  specs: z.object({
    display: z.string().max(220).default(""),
    chipset: z.string().max(220).default(""),
    camera: z.string().max(280).default(""),
    battery: z.string().max(220).default(""),
    charging: z.string().max(220).default(""),
    software: z.string().max(220).default(""),
  }),
  pros: z.array(z.string().min(1).max(220)).max(5),
  cons: z.array(z.string().min(1).max(220)).max(5),
  storeHandle: z.string().min(1).max(220).nullable().optional(),
});

const modelResultSchema = z.object({
  answer: z.string().min(1).max(3200),
  intent: z.enum(["search", "compare", "recommend", "specs", "compatibility", "general"]),
  comparison: z.array(comparisonItemSchema).max(4).default([]),
  bestPick: z.string().max(180).nullable().default(null),
  storeRecommendations: z
    .array(
      z.object({
        handle: z.string().min(1).max(220),
        reason: z.string().min(1).max(420),
      }),
    )
    .max(6)
    .default([]),
  followUps: z.array(z.string().min(1).max(180)).max(4).default([]),
});

export type SmartAdvisorComparison = z.infer<typeof comparisonItemSchema>;

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
  provider: "nvidia";
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

function compactProduct(product: ShopifyProduct) {
  const node = product.node;
  const price = node.priceRange?.minVariantPrice;
  return {
    handle: node.handle,
    title: node.title,
    brand: node.vendor ?? "",
    type: node.productType ?? "",
    price: price?.amount ?? null,
    currency: price?.currencyCode ?? null,
    available: Boolean(node.availableForSale),
    description: (node.description ?? "").slice(0, 360),
    tags: (node.tags ?? []).slice(0, 12),
    variants: node.variants.edges.slice(0, 5).map(({ node: variant }) => ({
      title: variant.title,
      price: variant.price.amount,
      currency: variant.price.currencyCode,
      available: variant.availableForSale,
      options: variant.selectedOptions,
    })),
  };
}

function failure(answer: string, errorCode: string): SmartAdvisorResult {
  return {
    ok: false,
    provider: "nvidia",
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

function rankCatalog(products: ShopifyProduct[], message: string) {
  const terms = message
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 2);

  return [...products]
    .map((product) => {
      const node = product.node;
      const text = [node.title, node.vendor, node.productType, ...(node.tags ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const score = terms.reduce((total, term) => total + (text.includes(term) ? 2 : 0), 0);
      return { product, score: score + (node.availableForSale ? 1 : 0) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 70)
    .map(({ product }) => compactProduct(product));
}

function buildResult(
  parsed: z.infer<typeof modelResultSchema>,
  catalog: ShopifyProduct[],
  model?: string,
): SmartAdvisorResult {
  const byHandle = new Map(catalog.map((product) => [product.node.handle, product]));
  const validHandles = new Set(byHandle.keys());

  const storeRecommendations = parsed.storeRecommendations
    .filter((item) => byHandle.has(item.handle))
    .map((item) => {
      const product = byHandle.get(item.handle)!;
      const price = product.node.priceRange?.minVariantPrice;
      return {
        handle: item.handle,
        reason: item.reason,
        title: product.node.title,
        price: price?.amount ?? null,
        currency: price?.currencyCode ?? null,
        available: Boolean(product.node.availableForSale),
      };
    });

  const comparison = parsed.comparison.map((item) => ({
    ...item,
    storeHandle: item.storeHandle && validHandles.has(item.storeHandle) ? item.storeHandle : null,
  }));

  return {
    ok: true,
    provider: "nvidia",
    ...(model ? { model } : {}),
    answer: parsed.answer,
    intent: parsed.intent,
    searchedWeb: false,
    comparison,
    bestPick: parsed.bestPick,
    storeRecommendations,
    sources: [],
    followUps: parsed.followUps,
  };
}

function parseModelResult(
  text: string,
  catalog: ShopifyProduct[],
  model?: string,
): SmartAdvisorResult | null {
  try {
    const parsed = modelResultSchema.parse(JSON.parse(extractJsonObject(text)));
    return buildResult(parsed, catalog, model);
  } catch (error) {
    console.error("Smart advisor JSON parse error", {
      provider: "nvidia",
      error,
      sample: text.slice(0, 1200),
    });
    return null;
  }
}

function nvidiaFailure(error: unknown): SmartAdvisorResult {
  if (!(error instanceof NvidiaApiError)) {
    console.error("NVIDIA smart advisor error", error);
    return failure("The smart advisor could not be reached. Please try again.", "ADVISOR_PROVIDER_ERROR");
  }

  console.error("NVIDIA smart advisor provider error", {
    status: error.status,
    message: error.message.slice(0, 500),
  });

  if (error.body === "SUPABASE_GATEWAY_NOT_CONFIGURED") {
    return failure(
      "The smart advisor gateway is not configured yet. Add the Supabase server credentials to the deployment and try again.",
      "ADVISOR_NOT_CONFIGURED",
    );
  }
  if (error.status === 401 || error.status === 403) {
    return failure(
      "The secure Supabase AI gateway rejected the request. Check the server-side Supabase credentials.",
      "ADVISOR_AUTH_ERROR",
    );
  }
  if (error.status === 429) {
    return failure(
      "The NVIDIA AI service is temporarily rate-limited. Please try again shortly.",
      "ADVISOR_QUOTA_ERROR",
    );
  }
  return failure("The NVIDIA AI service could not complete the request. Please try again.", "ADVISOR_PROVIDER_ERROR");
}

export const askSmartPhoneAdvisor = createServerFn({ method: "POST" })
  .validator(requestSchema)
  .handler(async ({ data }): Promise<SmartAdvisorResult> => {
    let catalog: ShopifyProduct[];
    try {
      const { fetchCatalogProducts } = await import("@/lib/shopify");
      catalog = await fetchCatalogProducts(100);
    } catch (error) {
      console.error("Smart phone advisor catalogue error", error);
      return failure("I couldn't load the live store catalogue. Please try again.", "CATALOG_ERROR");
    }

    const catalogCandidates = rankCatalog(catalog, data.message);
    const conversation = (data.history ?? [])
      .slice(-8)
      .map((item) => `${item.role.toUpperCase()}: ${item.text}`)
      .join("\n");

    const prompt = `You are ${STORE_NAME}'s NVIDIA-powered Smart Phone Advisor for a real electronics store in Lebanon.

YOUR JOB
- Help shoppers choose, compare and understand smartphones and electronics.
- Use the LIVE ${STORE_NAME} CATALOGUE below as the only authority for store price, inventory, availability and product handles.
- Never invent a ${STORE_NAME} price, discount, stock state, product handle or variant.
- For general device specifications and comparisons, use technical knowledge carefully. This request does NOT include live web browsing, so never say you searched, verified, checked or researched the live web.
- If the user asks for information that can change over time (today's market price outside ${STORE_NAME}, newest release status, current support promise, current carrier compatibility, breaking news), clearly say live-web verification is not connected and avoid presenting uncertain details as current facts.
- Distinguish general device knowledge from products actually sold by ${STORE_NAME}.
- Answer in the user's language. If the user writes Arabic, use natural Arabic.
- Keep the main answer concise and practical for mobile.
- Scores are relative buying scores for this request, not laboratory benchmarks.

OUTPUT
Return exactly one JSON object and no Markdown fences:
{
  "answer": "short useful answer",
  "intent": "search|compare|recommend|specs|compatibility|general",
  "comparison": [
    {
      "name": "phone name",
      "verdict": "one-line verdict",
      "score": 0,
      "specs": {
        "display": "",
        "chipset": "",
        "camera": "",
        "battery": "",
        "charging": "",
        "software": ""
      },
      "pros": [""],
      "cons": [""],
      "storeHandle": null
    }
  ],
  "bestPick": "phone name or null",
  "storeRecommendations": [{ "handle": "exact-handle-from-catalogue", "reason": "why it fits" }],
  "followUps": ["short useful next question"]
}

RECENT CONVERSATION
${conversation || "None"}

CURRENT PAGE / PRODUCT CONTEXT
${data.productContext || "None"}

USER REQUEST
${data.message}

LIVE ${STORE_NAME} CATALOGUE CANDIDATES
${JSON.stringify(catalogCandidates)}`;

    try {
      const { text, model } = await callNvidiaChat({
        messages: [
          {
            role: "system",
            content:
              "You are a precise electronics shopping assistant. Follow the requested JSON shape exactly, never fabricate store data, and never claim live web browsing.",
          },
          { role: "user", content: prompt },
        ],
      });
      const result = parseModelResult(text, catalog, model);
      if (result) return result;
      return nvidiaFailure(new NvidiaApiError("NVIDIA returned invalid JSON", 502, "INVALID_RESPONSE"));
    } catch (error) {
      return nvidiaFailure(error);
    }
  });
