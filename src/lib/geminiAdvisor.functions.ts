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
  sources: z
    .array(
      z.object({
        title: z.string().min(1).max(220),
        url: z.string().url(),
      }),
    )
    .max(8),
});

type AdvisorResult = z.infer<typeof advisorResultSchema>;

type GeminiGroundingMetadata = {
  groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
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
    description: (node.description ?? "").slice(0, 500),
    tags: (node.tags ?? []).slice(0, 20),
    price: price?.amount ?? null,
    currency: price?.currencyCode ?? null,
    available: Boolean(node.availableForSale),
    variants: node.variants.edges.slice(0, 8).map(({ node: variant }) => ({
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
          priority: { type: "integer" },
          addToCart: { type: "boolean" },
        },
        required: ["handle", "reason", "priority", "addToCart"],
      },
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
    },
  },
  required: ["answer", "intent", "recommendations", "missingItems", "sources"],
};

async function callGemini(input: {
  message: string;
  productContext?: string;
  catalog: ShopifyProduct[];
}) {
  // Google currently accepts both names. GOOGLE_API_KEY takes precedence in the
  // official SDK, so mirror that behavior for the REST request as well.
  const apiKey = process.env["GOOGLE_API_KEY"] || process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    return emptyFailure(
      "Gemini is not configured on the server. Add GEMINI_API_KEY (or GOOGLE_API_KEY) in the deployment secrets and redeploy.",
      "GEMINI_NOT_CONFIGURED",
    );
  }

  const model = process.env["GEMINI_MODEL"] || "gemini-3.8-flash";
  const catalog = input.catalog.map(compactProduct);
  const prompt = `You are ${STORE_NAME}'s real ecommerce shopping advisor.\n\nHARD RULES:\n- Answer in the user's language.\n- Never invent products, handles, prices, stock, specifications, box contents, compatibility, or discounts.\n- Store-specific facts must come from the catalogue JSON below.\n- Only recommend handles that exist in the catalogue JSON.\n- Use Google Search when current external information or official compatibility/specification details are needed.\n- Prefer official manufacturer sources for compatibility, included accessories, charging requirements, and specifications.\n- Keep the answer concise and useful on mobile.\n- If something cannot be verified, say so.\n- Return only data matching the requested JSON schema.\n\nUSER REQUEST:\n${input.message}\n\nCURRENT PRODUCT CONTEXT:\n${input.productContext || "None"}\n\nLIVE STORE CATALOG:\n${JSON.stringify(catalog)}`;

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
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1800,
            responseFormat: {
              text: {
                mimeType: "application/json",
                schema: jsonSchema,
              },
            },
          },
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
  } catch (error) {
    console.error("Gemini advisor network error", error);
    return emptyFailure(
      "I couldn't connect to Gemini right now. Please try again in a moment.",
      "GEMINI_NETWORK_ERROR",
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Gemini advisor provider error", response.status, body.slice(0, 800));
    if (response.status === 401 || response.status === 403) {
      return emptyFailure(
        "Gemini rejected the API key. Replace it with a current Gemini API key, save it in the deployment secrets, then redeploy.",
        "GEMINI_AUTH_ERROR",
      );
    }
    if (response.status === 429) {
      return emptyFailure(
        "Gemini is rate-limited or out of quota. Check the Gemini API quota/billing and try again.",
        "GEMINI_QUOTA_ERROR",
      );
    }
    if (response.status === 404) {
      return emptyFailure(
        `The configured Gemini model (${model}) is unavailable. Set GEMINI_MODEL=gemini-3.8-flash and redeploy.`,
        "GEMINI_MODEL_ERROR",
      );
    }
    return emptyFailure(
      "Gemini returned an error. Check the deployment secret and Gemini model, then try again.",
      "GEMINI_PROVIDER_ERROR",
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: GeminiGroundingMetadata;
    }>;
    groundingMetadata?: GeminiGroundingMetadata;
  };

  const candidate = payload.candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    return emptyFailure(
      "Gemini returned an empty response. Please try again.",
      "GEMINI_EMPTY_RESPONSE",
    );
  }

  let parsed: AdvisorResult;
  try {
    parsed = advisorResultSchema.parse(JSON.parse(text));
  } catch (error) {
    console.error("Gemini advisor invalid structured response", error, text.slice(0, 800));
    return emptyFailure(
      "Gemini returned an invalid response. Please try again.",
      "GEMINI_INVALID_RESPONSE",
    );
  }

  const grounding = candidate?.groundingMetadata ?? payload.groundingMetadata;
  const groundedSources = (grounding?.groundingChunks ?? [])
    .map((chunk) => chunk.web)
    .filter((web): web is { title?: string; uri?: string } => Boolean(web?.uri))
    .map((web) => ({ title: web.title || web.uri!, url: web.uri! }));
  const sources = [...groundedSources, ...parsed.sources]
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
