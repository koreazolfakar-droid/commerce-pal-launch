import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ShopifyProduct } from "@/lib/shopify";
import { STORE_NAME } from "@/lib/storeConfig";

const advisorRequestSchema = z.object({
  message: z.string().trim().min(1).max(1600),
  productContext: z.string().trim().max(5000).optional(),
});

const advisorResultSchema = z.object({
  answer: z.string().min(1).max(2200),
  intent: z.enum(["search", "recommendation", "comparison", "compatibility", "general"]),
  recommendations: z
    .array(
      z.object({
        handle: z.string().min(1),
        reason: z.string().min(1).max(500),
        priority: z.number().int().min(1).max(5),
        addToCart: z.boolean(),
      }),
    )
    .max(6),
  missingItems: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        reason: z.string().min(1).max(500),
        searchNeeded: z.boolean(),
      }),
    )
    .max(6),
  // Do not fail the whole assistant because one generated source URL is malformed.
  // Grounding URLs are added separately and all URLs are sanitized below.
  sources: z
    .array(
      z.object({
        title: z.string().min(1).max(220),
        url: z.string().min(1).max(2000),
      }),
    )
    .max(8),
});

type AdvisorResult = z.infer<typeof advisorResultSchema>;

type GeminiGroundingMetadata = {
  groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
};

type GeminiPayload = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: GeminiGroundingMetadata;
  }>;
  groundingMetadata?: GeminiGroundingMetadata;
  promptFeedback?: { blockReason?: string };
};

const catalogCache = { expiresAt: 0, products: [] as ShopifyProduct[] };
const CATALOG_TTL_MS = 5 * 60 * 1000;

function compactProduct(product: ShopifyProduct) {
  const node = product.node;
  const price = node.priceRange?.minVariantPrice;
  return {
    handle: node.handle,
    title: node.title,
    brand: node.vendor ?? "",
    type: node.productType ?? "",
    description: (node.description ?? "").slice(0, 420),
    tags: (node.tags ?? []).slice(0, 16),
    price: price?.amount ?? null,
    currency: price?.currencyCode ?? null,
    available: Boolean(node.availableForSale),
    variants: node.variants.edges.slice(0, 6).map(({ node: variant }) => ({
      title: variant.title,
      price: variant.price.amount,
      currency: variant.price.currencyCode,
      available: variant.availableForSale,
      options: variant.selectedOptions,
    })),
  };
}

async function getCatalog() {
  if (catalogCache.expiresAt > Date.now() && catalogCache.products.length) {
    return catalogCache.products;
  }
  const { fetchCatalogProducts } = await import("@/lib/shopify");
  const products = await fetchCatalogProducts(60);
  catalogCache.products = products;
  catalogCache.expiresAt = Date.now() + CATALOG_TTL_MS;
  return products;
}

function emptyFailure(answer: string, errorCode: string) {
  return {
    ok: false as const,
    provider: "gemini" as const,
    errorCode,
    answer,
    intent: "general" as const,
    recommendations: [],
    missingItems: [],
    sources: [],
  };
}

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    intent: {
      type: "string",
      enum: ["search", "recommendation", "comparison", "compatibility", "general"],
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          handle: { type: "string" },
          reason: { type: "string" },
          priority: { type: "integer", minimum: 1, maximum: 5 },
          addToCart: { type: "boolean" },
        },
        required: ["handle", "reason", "priority", "addToCart"],
      },
      maxItems: 6,
    },
    missingItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          reason: { type: "string" },
          searchNeeded: { type: "boolean" },
        },
        required: ["name", "reason", "searchNeeded"],
      },
      maxItems: 6,
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          url: { type: "string" },
        },
        required: ["title", "url"],
      },
      maxItems: 8,
    },
  },
  required: ["answer", "intent", "recommendations", "missingItems", "sources"],
};

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

function providerMessage(body: string) {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; status?: string } };
    return `${parsed.error?.status ?? ""} ${parsed.error?.message ?? ""}`.trim();
  } catch {
    return body;
  }
}

function looksLikeKeyError(status: number, message: string) {
  return (
    status === 401 ||
    status === 403 ||
    /api.?key|permission denied|unauthenticated|credential/i.test(message)
  );
}

function looksLikeFormatError(status: number, message: string) {
  return (
    status === 400 &&
    /response.?format|response.?mime|response.?schema|unknown field|invalid argument|generation.?config/i.test(
      message,
    )
  );
}

type StructuredMode = "json-schema" | "response-format" | "prompt-json";

function generationConfig(mode: StructuredMode) {
  const common = {
    temperature: 0.2,
    maxOutputTokens: 1800,
  };

  if (mode === "json-schema") {
    return {
      ...common,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
    };
  }

  if (mode === "response-format") {
    return {
      ...common,
      responseFormat: {
        text: {
          mimeType: "application/json",
          schema: jsonSchema,
        },
      },
    };
  }

  return common;
}

async function callGemini(input: {
  message: string;
  productContext?: string;
  catalog: ShopifyProduct[];
}) {
  // Prefer the dedicated Gemini secret. GOOGLE_API_KEY is only a fallback because
  // deployments often use that generic name for Maps or other restricted APIs.
  const keys = [process.env["GEMINI_API_KEY"], process.env["GOOGLE_API_KEY"]].filter(
    (value, index, list): value is string => Boolean(value) && list.indexOf(value) === index,
  );

  if (!keys.length) {
    return emptyFailure(
      "The AI assistant is temporarily unavailable. Please try again shortly.",
      "GEMINI_NOT_CONFIGURED",
    );
  }

  const model = process.env["GEMINI_MODEL"] || "gemini-3.8-flash";
  const catalog = input.catalog.map(compactProduct);
  const prompt = `You are ${STORE_NAME}'s real ecommerce shopping advisor.\n\nHARD RULES:\n- Answer in the user's language.\n- Never invent products, handles, prices, stock, specifications, box contents, compatibility, or discounts.\n- Store-specific facts must come from the catalogue JSON below.\n- Only recommend handles that exist in the catalogue JSON.\n- Use Google Search when current external information or official compatibility/specification details are needed.\n- Prefer official manufacturer sources for compatibility, included accessories, charging requirements, and specifications.\n- Keep the answer concise and useful on mobile.\n- If something cannot be verified, say so.\n- Return exactly one JSON object with answer, intent, recommendations, missingItems, and sources. No Markdown.\n\nUSER REQUEST:\n${input.message}\n\nCURRENT PRODUCT CONTEXT:\n${input.productContext || "None"}\n\nLIVE STORE CATALOG:\n${JSON.stringify(catalog)}`;

  const modes: StructuredMode[] = ["json-schema", "response-format", "prompt-json"];
  let lastStatus = 0;
  let lastMessage = "";

  for (const apiKey of keys) {
    for (const mode of modes) {
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
              systemInstruction: {
                parts: [{ text: `You are a trustworthy shopping advisor for ${STORE_NAME}.` }],
              },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              tools: [{ googleSearch: {} }],
              generationConfig: generationConfig(mode),
            }),
            signal: AbortSignal.timeout(20000),
          },
        );
      } catch (error) {
        console.error("Gemini advisor network error", error);
        return emptyFailure(
          "I couldn't connect to the AI assistant right now. Please try again in a moment.",
          "GEMINI_NETWORK_ERROR",
        );
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const message = providerMessage(body).slice(0, 1200);
        lastStatus = response.status;
        lastMessage = message;
        console.error("Gemini advisor provider error", {
          status: response.status,
          model,
          mode,
          message,
        });

        // If the specific Gemini key is invalid/restricted, try the generic Google
        // key if it is different. This also fixes deployments where the old code
        // accidentally preferred an unrelated GOOGLE_API_KEY.
        if (looksLikeKeyError(response.status, message)) break;

        // Google has supported more than one structured-output request shape over
        // time. Retry only format-related 400s; do not duplicate quota/server calls.
        if (looksLikeFormatError(response.status, message) && mode !== "prompt-json") {
          continue;
        }

        if (response.status === 429) {
          return emptyFailure(
            "The AI assistant is busy right now. Please try again in a moment.",
            "GEMINI_QUOTA_ERROR",
          );
        }
        if (response.status === 404) {
          return emptyFailure(
            "The AI assistant model is temporarily unavailable. Please try again shortly.",
            "GEMINI_MODEL_ERROR",
          );
        }
        if (response.status >= 500) {
          return emptyFailure(
            "The AI provider is temporarily unavailable. Please try again shortly.",
            "GEMINI_PROVIDER_ERROR",
          );
        }

        break;
      }

      const payload = (await response.json()) as GeminiPayload;
      const candidate = payload.candidates?.[0];
      const text = candidate?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!text) {
        console.error("Gemini advisor empty response", {
          model,
          mode,
          blockReason: payload.promptFeedback?.blockReason,
        });
        return emptyFailure(
          "The AI assistant returned an empty response. Please try again.",
          "GEMINI_EMPTY_RESPONSE",
        );
      }

      let parsed: AdvisorResult;
      try {
        parsed = advisorResultSchema.parse(JSON.parse(extractJson(text)));
      } catch (error) {
        console.error("Gemini advisor invalid structured response", error, text.slice(0, 800));
        if (mode !== "prompt-json") continue;
        return emptyFailure(
          "The AI assistant returned an invalid response. Please try again.",
          "GEMINI_INVALID_RESPONSE",
        );
      }

      const grounding = candidate?.groundingMetadata ?? payload.groundingMetadata;
      const groundedSources = (grounding?.groundingChunks ?? [])
        .map((chunk) => chunk.web)
        .filter((web): web is { title?: string; uri?: string } => Boolean(web?.uri))
        .map((web) => ({ title: web.title || web.uri!, url: web.uri! }));
      const sources = [...groundedSources, ...parsed.sources]
        .map((source) => {
          const url = safeUrl(source.url);
          return url ? { title: source.title || url, url } : null;
        })
        .filter((source): source is { title: string; url: string } => Boolean(source))
        .filter((source, index, list) => list.findIndex((item) => item.url === source.url) === index)
        .slice(0, 8);
      const validHandles = new Set(input.catalog.map((product) => product.node.handle));

      return {
        ok: true as const,
        provider: "gemini" as const,
        answer: parsed.answer,
        intent: parsed.intent,
        recommendations: parsed.recommendations.filter((item) => validHandles.has(item.handle)),
        missingItems: parsed.missingItems,
        sources,
      };
    }
  }

  console.error("Gemini advisor exhausted request options", {
    status: lastStatus,
    model,
    message: lastMessage.slice(0, 1200),
  });

  if (looksLikeKeyError(lastStatus, lastMessage)) {
    return emptyFailure(
      "The AI assistant is temporarily unavailable. Please try again shortly.",
      "GEMINI_AUTH_ERROR",
    );
  }

  return emptyFailure(
    "The AI assistant is temporarily unavailable. Please try again shortly.",
    "GEMINI_PROVIDER_ERROR",
  );
}

export const askGeminiShoppingAdvisor = createServerFn({ method: "POST" })
  .validator(advisorRequestSchema)
  .handler(async ({ data }) => {
    let catalog: ShopifyProduct[];
    try {
      catalog = await getCatalog();
    } catch (error) {
      console.error("Gemini advisor catalog error", error);
      return emptyFailure(
        "The store catalogue could not be loaded for the AI assistant. Please try again.",
        "CATALOG_ERROR",
      );
    }

    return callGemini({
      message: data.message,
      ...(data.productContext ? { productContext: data.productContext } : {}),
      catalog,
    });
  });
