import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ShopifyProduct } from "@/lib/shopify";
import { STORE_NAME } from "@/lib/storeConfig";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1600),
  productContext: z.string().trim().max(5000).optional(),
});

const resultSchema = z.object({
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
    .array(z.object({ title: z.string().min(1).max(220), url: z.string().min(1).max(2000) }))
    .max(8),
});

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
      maxItems: 6,
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
    },
    missingItems: {
      type: "array",
      maxItems: 6,
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
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: { title: { type: "string" }, url: { type: "string" } },
        required: ["title", "url"],
      },
    },
  },
  required: ["answer", "intent", "recommendations", "missingItems", "sources"],
};

function compactProduct(product: ShopifyProduct) {
  const node = product.node;
  return {
    handle: node.handle,
    title: node.title,
    brand: node.vendor ?? "",
    type: node.productType ?? "",
    description: (node.description ?? "").slice(0, 380),
    tags: (node.tags ?? []).slice(0, 12),
    price: node.priceRange?.minVariantPrice ?? null,
    available: Boolean(node.availableForSale),
    variants: node.variants.edges.slice(0, 5).map(({ node: variant }) => ({
      title: variant.title,
      price: variant.price,
      available: variant.availableForSale,
      options: variant.selectedOptions,
    })),
  };
}

function failure(answer: string, errorCode: string) {
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

export const askGeminiShoppingAdvisor = createServerFn({ method: "POST" })
  .validator(requestSchema)
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"];
    if (!apiKey) {
      return failure(
        "The AI assistant is not configured on the server. Add GEMINI_API_KEY in project Secrets.",
        "GEMINI_NOT_CONFIGURED",
      );
    }

    let catalog: ShopifyProduct[];
    try {
      const { fetchCatalogProducts } = await import("@/lib/shopify");
      catalog = await fetchCatalogProducts(60);
    } catch (error) {
      console.error("Gemini advisor catalog error", error);
      return failure("The store catalogue could not be loaded. Please try again.", "CATALOG_ERROR");
    }

    const model = process.env["GEMINI_MODEL"] || "gemini-3.8-flash";
    const prompt = `You are ${STORE_NAME}'s ecommerce shopping advisor.\n\nRules:\n- Answer in the user's language.\n- Never invent store products, prices, stock, handles, specs or discounts.\n- Store facts must come only from the catalogue JSON below.\n- Only recommend handles present in that catalogue.\n- Keep the answer concise and useful on mobile.\n- Return exactly one JSON object matching the requested schema.\n\nUSER REQUEST:\n${data.message}\n\nCURRENT PRODUCT CONTEXT:\n${data.productContext || "None"}\n\nLIVE STORE CATALOG:\n${JSON.stringify(catalog.map(compactProduct))}`;

    const makeRequest = async (structured: boolean) =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: structured
              ? {
                  temperature: 0.2,
                  maxOutputTokens: 1800,
                  responseFormat: {
                    text: { mimeType: "application/json", schema: jsonSchema },
                  },
                }
              : { temperature: 0.2, maxOutputTokens: 1800 },
          }),
          signal: AbortSignal.timeout(20000),
        },
      );

    let response: Response;
    try {
      response = await makeRequest(true);
      if (!response.ok && response.status === 400) response = await makeRequest(false);
    } catch (error) {
      console.error("Gemini advisor network error", error);
      return failure("I couldn't connect to the AI assistant. Please try again.", "GEMINI_NETWORK_ERROR");
    }

    if (!response.ok) {
      const providerBody = await response.text().catch(() => "");
      console.error("Gemini advisor provider error", response.status, providerBody.slice(0, 1000));
      if (response.status === 401 || response.status === 403) {
        return failure(
          "The Gemini API key was rejected. Check GEMINI_API_KEY in project Secrets.",
          "GEMINI_AUTH_ERROR",
        );
      }
      if (response.status === 429) {
        return failure("Gemini is rate-limited or out of quota. Please try again shortly.", "GEMINI_QUOTA_ERROR");
      }
      if (response.status === 404) {
        return failure(
          `The configured Gemini model (${model}) is unavailable.`,
          "GEMINI_MODEL_ERROR",
        );
      }
      return failure("The AI assistant is temporarily unavailable. Please try again.", "GEMINI_PROVIDER_ERROR");
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!text) return failure("Gemini returned an empty response. Please try again.", "GEMINI_EMPTY_RESPONSE");

    try {
      const parsed = resultSchema.parse(JSON.parse(extractJson(text)));
      const validHandles = new Set(catalog.map((product) => product.node.handle));
      return {
        ok: true as const,
        provider: "gemini" as const,
        ...parsed,
        recommendations: parsed.recommendations.filter((item) => validHandles.has(item.handle)),
      };
    } catch (error) {
      console.error("Gemini advisor invalid response", error, text.slice(0, 800));
      return failure("Gemini returned an invalid response. Please try again.", "GEMINI_INVALID_RESPONSE");
    }
  });
