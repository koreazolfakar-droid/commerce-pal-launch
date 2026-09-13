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

type GroundingMetadata = {
  webSearchQueries?: string[];
  groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
};

type GeminiPayload = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: GroundingMetadata;
  }>;
  promptFeedback?: { blockReason?: string };
};

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
  provider: "gemini";
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

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function failure(answer: string, errorCode: string): SmartAdvisorResult {
  return {
    ok: false,
    provider: "gemini",
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

export const askSmartPhoneAdvisor = createServerFn({ method: "POST" })
  .validator(requestSchema)
  .handler(async ({ data }): Promise<SmartAdvisorResult> => {
    const apiKey = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"];
    if (!apiKey) {
      return failure(
        "The smart phone advisor is not configured yet. Add GEMINI_API_KEY to the server secrets and redeploy.",
        "ADVISOR_NOT_CONFIGURED",
      );
    }

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

    const prompt = `You are ${STORE_NAME}'s Smart Phone Advisor, a research-first shopping agent for a real electronics store in Lebanon.

YOUR JOB
- Search the live web whenever the user asks about a phone, specifications, release information, comparison, camera, battery, performance, software support, charging, compatibility, or current recommendation.
- Compare phones intelligently instead of just listing specs.
- Explain which phone wins for the user's priorities and why.
- Cross-check important phone facts. Prefer official manufacturer pages first, then highly reputable technical sources when the manufacturer does not provide the needed comparison detail.
- Use the live ${STORE_NAME} catalogue below for store prices, availability and product handles. Never invent store inventory, prices, discounts or handles.
- A phone may be researched from the web even when it is not sold by ${STORE_NAME}; clearly distinguish web research from store availability.
- Never claim that an item is in the box, compatible, available, or supported unless verified.
- Answer in the user's language. If the user writes Arabic, use natural Arabic.
- Keep the main answer concise and practical for mobile, but make the comparison data useful.
- Scores are relative buying scores for this request, not laboratory benchmarks.
- When two sources conflict, say that the detail is uncertain instead of guessing.

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

    const configuredModel = process.env["GEMINI_MODEL"]?.trim();
    const models = [configuredModel, "gemini-3.8-flash", "gemini-2.5-flash"].filter(
      (value, index, list): value is string => Boolean(value) && list.indexOf(value) === index,
    );

    let lastStatus = 0;
    let lastBody = "";

    for (const model of models) {
      let response: Response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              tools: [{ google_search: {} }],
              generationConfig: {
                temperature: 0.18,
                maxOutputTokens: 2600,
              },
            }),
            signal: AbortSignal.timeout(30000),
          },
        );
      } catch (error) {
        console.error("Smart phone advisor network error", error);
        return failure(
          "I couldn't reach the web research service right now. Please try again in a moment.",
          "ADVISOR_NETWORK_ERROR",
        );
      }

      if (!response.ok) {
        lastStatus = response.status;
        lastBody = await response.text().catch(() => "");
        console.error("Smart phone advisor provider error", {
          status: response.status,
          model,
          body: lastBody.slice(0, 1000),
        });

        if (response.status === 404) continue;
        if (response.status === 401 || response.status === 403) {
          return failure(
            "The phone advisor API key was rejected. Check GEMINI_API_KEY in the deployment secrets.",
            "ADVISOR_AUTH_ERROR",
          );
        }
        if (response.status === 429) {
          return failure(
            "The phone advisor is temporarily over quota. Please try again shortly.",
            "ADVISOR_QUOTA_ERROR",
          );
        }
        if (response.status >= 500) continue;
        return failure(
          "The web research service rejected the request. Please try again.",
          "ADVISOR_PROVIDER_ERROR",
        );
      }

      const payload = (await response.json()) as GeminiPayload;
      const candidate = payload.candidates?.[0];
      const text = candidate?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!text) {
        console.error("Smart phone advisor empty response", payload.promptFeedback?.blockReason);
        return failure("The phone advisor returned an empty response. Please try again.", "ADVISOR_EMPTY");
      }

      let parsed: z.infer<typeof modelResultSchema>;
      try {
        parsed = modelResultSchema.parse(JSON.parse(extractJson(text)));
      } catch (error) {
        console.error("Smart phone advisor JSON parse error", error, text.slice(0, 1200));
        return {
          ok: true,
          provider: "gemini",
          answer: text.slice(0, 3000),
          intent: "general",
          searchedWeb: Boolean(candidate?.groundingMetadata?.groundingChunks?.length),
          comparison: [],
          bestPick: null,
          storeRecommendations: [],
          sources: (candidate?.groundingMetadata?.groundingChunks ?? [])
            .map((chunk) => chunk.web)
            .filter((web): web is { title?: string; uri?: string } => Boolean(web?.uri))
            .map((web) => {
              const url = safeUrl(web.uri!);
              return url ? { title: web.title || url, url } : null;
            })
            .filter((item): item is { title: string; url: string } => Boolean(item))
            .slice(0, 8),
          followUps: [],
        };
      }

      const grounding = candidate?.groundingMetadata;
      const sources = (grounding?.groundingChunks ?? [])
        .map((chunk) => chunk.web)
        .filter((web): web is { title?: string; uri?: string } => Boolean(web?.uri))
        .map((web) => {
          const url = safeUrl(web.uri!);
          return url ? { title: web.title || url, url } : null;
        })
        .filter((item): item is { title: string; url: string } => Boolean(item))
        .filter((item, index, list) => list.findIndex((entry) => entry.url === item.url) === index)
        .slice(0, 10);

      const byHandle = new Map(catalog.map((product) => [product.node.handle, product]));
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

      const validHandles = new Set(catalog.map((product) => product.node.handle));
      const comparison = parsed.comparison.map((item) => ({
        ...item,
        storeHandle: item.storeHandle && validHandles.has(item.storeHandle) ? item.storeHandle : null,
      }));

      return {
        ok: true,
        provider: "gemini",
        answer: parsed.answer,
        intent: parsed.intent,
        searchedWeb: Boolean(grounding?.webSearchQueries?.length || grounding?.groundingChunks?.length),
        comparison,
        bestPick: parsed.bestPick,
        storeRecommendations,
        sources,
        followUps: parsed.followUps,
      };
    }

    console.error("Smart phone advisor exhausted models", {
      status: lastStatus,
      body: lastBody.slice(0, 1000),
    });
    return failure(
      "The phone research model is unavailable right now. Please try again shortly.",
      "ADVISOR_MODEL_ERROR",
    );
  });
