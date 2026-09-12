import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { STORE_NAME } from "@/lib/storeConfig";
import type { ShopifyProduct } from "@/lib/shopify";

const comparisonRequestSchema = z.object({
  handles: z.array(z.string().trim().min(1).max(180)).min(2).max(4),
  language: z.enum(["en", "ar"]).default("en"),
});

const sourceSchema = z.object({
  title: z.string().min(1).max(220),
  url: z.string().min(1).max(1200),
});

const comparisonResultSchema = z.object({
  title: z.string().min(1).max(180),
  summary: z.string().min(1).max(1600),
  overallWinnerHandle: z.string().max(180),
  winnerReason: z.string().min(1).max(900),
  productAssessments: z
    .array(
      z.object({
        handle: z.string().min(1).max(180),
        score: z.number().min(0).max(10),
        verdict: z.string().min(1).max(500),
        bestFor: z.array(z.string().min(1).max(140)).max(4),
        pros: z.array(z.string().min(1).max(280)).max(6),
        cons: z.array(z.string().min(1).max(280)).max(6),
      }),
    )
    .max(4),
  rows: z
    .array(
      z.object({
        category: z.string().min(1).max(80),
        spec: z.string().min(1).max(100),
        values: z
          .array(
            z.object({
              handle: z.string().min(1).max(180),
              value: z.string().min(1).max(500),
            }),
          )
          .max(4),
        winnerHandle: z.string().max(180),
        expertNote: z.string().min(1).max(500),
      }),
    )
    .max(28),
  keyDifferences: z
    .array(
      z.object({
        title: z.string().min(1).max(140),
        detail: z.string().min(1).max(600),
        advantageHandle: z.string().max(180),
      }),
    )
    .max(8),
  recommendations: z
    .array(
      z.object({
        useCase: z.string().min(1).max(140),
        handle: z.string().min(1).max(180),
        reason: z.string().min(1).max(500),
      }),
    )
    .max(6),
  caveats: z.array(z.string().min(1).max(500)).max(6),
  sources: z.array(sourceSchema).max(12),
});

export type PhoneComparisonResult = z.infer<typeof comparisonResultSchema> & {
  researchedAt: string;
};

type GeminiGroundingMetadata = {
  groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
};

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    overallWinnerHandle: { type: "string" },
    winnerReason: { type: "string" },
    productAssessments: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          handle: { type: "string" },
          score: { type: "number" },
          verdict: { type: "string" },
          bestFor: { type: "array", maxItems: 4, items: { type: "string" } },
          pros: { type: "array", maxItems: 6, items: { type: "string" } },
          cons: { type: "array", maxItems: 6, items: { type: "string" } },
        },
        required: ["handle", "score", "verdict", "bestFor", "pros", "cons"],
      },
    },
    rows: {
      type: "array",
      maxItems: 28,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          spec: { type: "string" },
          values: {
            type: "array",
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                handle: { type: "string" },
                value: { type: "string" },
              },
              required: ["handle", "value"],
            },
          },
          winnerHandle: { type: "string" },
          expertNote: { type: "string" },
        },
        required: ["category", "spec", "values", "winnerHandle", "expertNote"],
      },
    },
    keyDifferences: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          advantageHandle: { type: "string" },
        },
        required: ["title", "detail", "advantageHandle"],
      },
    },
    recommendations: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          useCase: { type: "string" },
          handle: { type: "string" },
          reason: { type: "string" },
        },
        required: ["useCase", "handle", "reason"],
      },
    },
    caveats: { type: "array", maxItems: 6, items: { type: "string" } },
    sources: {
      type: "array",
      maxItems: 12,
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
  required: [
    "title",
    "summary",
    "overallWinnerHandle",
    "winnerReason",
    "productAssessments",
    "rows",
    "keyDifferences",
    "recommendations",
    "caveats",
    "sources",
  ],
};

function compactProduct(product: ShopifyProduct) {
  const node = product.node;
  const variant = node.variants.edges[0]?.node;
  const price = variant?.price ?? node.priceRange.minVariantPrice;
  return {
    handle: node.handle,
    title: node.title,
    brand: node.vendor ?? "",
    productType: node.productType ?? "",
    storePrice: `${price.amount} ${price.currencyCode}`,
    availableForSale: variant?.availableForSale ?? node.availableForSale ?? false,
    selectedOptions: (variant?.selectedOptions ?? []).filter(
      (option) => option.value !== "Default Title",
    ),
    description: (node.description ?? "").slice(0, 1200),
    tags: (node.tags ?? []).slice(0, 24),
  };
}

function validWebSource(source: { title: string; url: string }) {
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function failure(message: string, errorCode: string) {
  return {
    ok: false as const,
    errorCode,
    message,
  };
}

function sanitizeResult(
  parsed: z.infer<typeof comparisonResultSchema>,
  products: ShopifyProduct[],
  grounding?: GeminiGroundingMetadata,
): PhoneComparisonResult {
  const validHandles = new Set(products.map((product) => product.node.handle));
  const groundedSources = (grounding?.groundingChunks ?? [])
    .map((chunk) => chunk.web)
    .filter((web): web is { title?: string; uri?: string } => Boolean(web?.uri))
    .map((web) => ({ title: web.title || web.uri!, url: web.uri! }));

  const sources = [...groundedSources, ...parsed.sources]
    .filter(validWebSource)
    .filter((source, index, list) => list.findIndex((item) => item.url === source.url) === index)
    .slice(0, 12);

  return {
    ...parsed,
    overallWinnerHandle: validHandles.has(parsed.overallWinnerHandle)
      ? parsed.overallWinnerHandle
      : "",
    productAssessments: parsed.productAssessments.filter((item) => validHandles.has(item.handle)),
    rows: parsed.rows.map((row) => ({
      ...row,
      values: row.values.filter((item) => validHandles.has(item.handle)),
      winnerHandle: validHandles.has(row.winnerHandle) ? row.winnerHandle : "",
    })),
    keyDifferences: parsed.keyDifferences.map((item) => ({
      ...item,
      advantageHandle: validHandles.has(item.advantageHandle) ? item.advantageHandle : "",
    })),
    recommendations: parsed.recommendations.filter((item) => validHandles.has(item.handle)),
    sources,
    researchedAt: new Date().toISOString(),
  };
}

async function runGroundedComparison(products: ShopifyProduct[], language: "en" | "ar") {
  const apiKey = process.env["GOOGLE_API_KEY"] || process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    return failure(
      "AI phone research is not configured on the server. Add GEMINI_API_KEY or GOOGLE_API_KEY and redeploy.",
      "GEMINI_NOT_CONFIGURED",
    );
  }

  const model = process.env["GEMINI_MODEL"] || "gemini-3.8-flash";
  const productContext = products.map(compactProduct);
  const outputLanguage = language === "ar" ? "Arabic" : "English";

  const prompt = `You are the senior smartphone reviewer and mobile-hardware analyst for ${STORE_NAME}. Your job is to research the EXACT compared phone models on the live web and produce a rigorous, neutral buying comparison.

MANDATORY RESEARCH RULES:
- Use Google Search for every compared model before answering. Do not rely only on memory or the store description.
- Source priority: official manufacturer product/specification/support pages first; then established professional technical publications when an official source does not cover a claim.
- Cross-check important claims such as chipset, display, cameras, battery, charging, IP rating, software/update policy, dimensions and weight.
- Model names can have regional variants. Never silently combine specifications from different variants. If the exact regional variant cannot be verified, say "Unverified" and explain the uncertainty in caveats.
- The LIVE STORE PRODUCT DATA below is authoritative only for store price, selected variant and store availability. Do not replace those with prices from the web.
- Never invent a specification, benchmark, camera feature, update promise, charging wattage or certification.
- If trustworthy sources disagree, state the disagreement instead of choosing a convenient number.

EXPERT / FAIRNESS RULES:
- Be brand-neutral and store-neutral. Do not favor a product because it is newer, more expensive, in stock, or sold by ${STORE_NAME}.
- Pros and cons must be specific to each exact device and useful to a knowledgeable phone buyer; avoid generic filler.
- Judge real-world significance, not just bigger numbers. Explain when a specification difference is unlikely to matter in normal use.
- Use a balanced overall scoring lens: performance 25%, cameras 20%, display 15%, battery/charging 15%, software/support 10%, build/durability 10%, value at the LIVE STORE PRICE 5%.
- A per-row winner is allowed only when there is a defensible practical advantage. Use an empty winnerHandle for ties, preference-dependent rows, or uncertain evidence.
- The overall winner may also be empty if there is no honest universal winner. Still provide scenario-based recommendations.

TABLE REQUIREMENTS:
- Build a thorough table of the most decision-relevant phone specifications. Aim for roughly 16-24 rows across Performance, Display, Cameras, Battery & Charging, Build & Durability, Software & Support, and Connectivity.
- For every table row, return one value for every compared handle, in the same factual level of detail.
- Include a short expertNote explaining the practical difference.
- keyDifferences should capture the biggest real-world differences, not repeat every table row.

OUTPUT RULES:
- Write all human-readable text in ${outputLanguage}.
- Keep model/technology names and units accurate even in Arabic.
- Return ONLY JSON matching the response schema.
- Handles must exactly match the handles in LIVE STORE PRODUCT DATA. Never create a handle.
- In sources, include the strongest pages you actually used. Prefer direct official pages where available.

LIVE STORE PRODUCT DATA:
${JSON.stringify(productContext)}`;

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
            parts: [
              {
                text: "You are an evidence-driven smartphone expert. Research first, distinguish regional variants, quantify only verified facts, and remain neutral between brands.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: {
            temperature: 0.12,
            maxOutputTokens: 6200,
            responseFormat: {
              text: {
                mimeType: "application/json",
                schema: jsonSchema,
              },
            },
          },
        }),
        signal: AbortSignal.timeout(35000),
      },
    );
  } catch (error) {
    console.error("AI phone comparison network error", error);
    return failure("The AI research service could not be reached. Please try again.", "NETWORK_ERROR");
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("AI phone comparison provider error", response.status, body.slice(0, 1000));
    if (response.status === 401 || response.status === 403) {
      return failure("The AI research key was rejected by the provider.", "AUTH_ERROR");
    }
    if (response.status === 429) {
      return failure("AI research is temporarily rate-limited. Please try again shortly.", "QUOTA_ERROR");
    }
    return failure(`AI research failed (${response.status}). Please try again.`, "PROVIDER_ERROR");
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

  if (!text) return failure("AI research returned an empty result. Please retry.", "EMPTY_RESPONSE");

  try {
    const parsed = comparisonResultSchema.parse(JSON.parse(text));
    const result = sanitizeResult(
      parsed,
      products,
      candidate?.groundingMetadata ?? payload.groundingMetadata,
    );
    return { ok: true as const, result };
  } catch (error) {
    console.error("AI phone comparison invalid response", error, text.slice(0, 1400));
    return failure("AI research returned an invalid comparison. Please retry.", "INVALID_RESPONSE");
  }
}

export const researchPhoneComparison = createServerFn({ method: "POST" })
  .validator(comparisonRequestSchema)
  .handler(async ({ data }) => {
    const requested = [...new Set(data.handles)].slice(0, 4);
    let products: ShopifyProduct[];
    try {
      const { fetchProductsByHandles } = await import("@/lib/shopify");
      const fetched = await fetchProductsByHandles(requested);
      products = requested
        .map((handle) => fetched.find((product) => product.node.handle === handle))
        .filter((product): product is ShopifyProduct => Boolean(product));
    } catch (error) {
      console.error("AI phone comparison Shopify error", error);
      return failure("The selected store products could not be loaded for research.", "CATALOG_ERROR");
    }

    if (products.length < 2) {
      return failure("Select at least two valid phones before starting AI research.", "NOT_ENOUGH_PRODUCTS");
    }

    return runGroundedComparison(products, data.language);
  });
