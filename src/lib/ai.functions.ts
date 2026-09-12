import { responseOutputText } from "@/lib/openaiResponse";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ShopifyProduct } from "@/lib/shopify";
import { STORE_NAME } from "@/lib/storeConfig";

const aiSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  context: z.string().trim().max(5000).optional(),
});

/**
 * Store assistant. The provider secret is read only inside the server handler;
 * it is never part of the client bundle. Configure OPENAI_API_KEY and
 * OPENAI_MODEL on the deployment. No key = a truthful setup message, never a
 * fake AI response.
 */
export const askStoreAssistant = createServerFn({ method: "POST" })
  .validator(aiSchema)
  .handler(async ({ data }) => {
    const apiKey = process.env["OPENAI_API_KEY"];
    const model = process.env["OPENAI_MODEL"] || "gpt-4o";

    if (!apiKey) {
      return {
        ok: false,
        answer:
          "The AI assistant is not configured yet. Add OPENAI_API_KEY on the server to enable it.",
      };
    }

    const system = `You are ${STORE_NAME}'s shopping assistant for a real electronics store.\n- Answer in the user's language.\n- Never invent prices, stock, specifications, discounts, shipping promises, or product availability.\n- When product context is supplied, use only that context for store-specific facts.\n- If a fact is missing, say it is not available and suggest checking the product page.\n- Help compare phones and accessories, explain specifications, and guide purchases.\n- Be concise and useful on mobile.\nStore context:\n${data.context || "No product context supplied."}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "developer", content: system },
          { role: "user", content: data.message },
        ],
        max_output_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("AI provider error", response.status);
      return { ok: false, answer: "The assistant is temporarily unavailable. Please try again." };
    }

    const payload: unknown = await response.json();
    const answer = responseOutputText(payload);
    if (!answer)
      return { ok: false, answer: "I couldn't generate an answer right now. Please try again." };
    return { ok: true, answer };
  });

const productEnrichmentRequestSchema = z.object({
  title: z.string().trim().min(1).max(300),
  vendor: z.string().trim().max(120).nullable(),
});

const productEnrichmentSchema = z.object({
  title: z.string().trim().min(1).max(300),
  vendor: z.string().trim().max(120).nullable(),
  officialUrl: z.string().url().nullable(),
  officialProductName: z.string().trim().max(300).nullable(),
  summary: z.string().trim().max(1200).nullable(),
  highlights: z.array(z.string().trim().min(1).max(240)).max(10),
  specifications: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(240),
      }),
    )
    .max(30),
});

const enrichmentResultSchema = z.object({
  productName: z.string(),
  brand: z.string().nullable(),
  officialProductUrl: z.string().url().nullable(),
  officialSite: z.string().url().nullable(),
  summary: z.string().nullable(),
  highlights: z.array(z.string()),
  specifications: z.array(z.object({ label: z.string(), value: z.string() })),
  promotionalImages: z.array(z.string().url()),
  sourceUrls: z.array(z.string().url()),
});

type EnrichmentResult = z.infer<typeof enrichmentResultSchema>;

const enrichmentCache = new Map<string, { expiresAt: number; value: EnrichmentResult }>();
const ENRICHMENT_TTL_MS = 24 * 60 * 60 * 1000;

function cacheKey(title: string, vendor?: string | null) {
  return `${vendor ?? ""}|${title}`.trim().toLowerCase();
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "::1"].includes(host) || host.endsWith(".localhost"))
      return false;
    // Never allow direct requests to private/link-local IPv4 ranges.
    const octets = host.split(".").map(Number);
    if (octets.length === 4 && octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      const [a, b = 0] = octets;
      if (
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        a === 0
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

function sameOrSubdomain(hostname: string, root: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const base = root.toLowerCase().replace(/^www\./, "");
  return host === base || host.endsWith(`.${base}`);
}

function extractMetaImage(html: string, baseUrl: string): string[] {
  const found = new Set<string>();
  const add = (raw: string | undefined) => {
    if (!raw) return;
    try {
      const url = new URL(raw.replace(/&amp;/g, "&"), baseUrl);
      if (url.protocol !== "https:") return;
      found.add(url.toString());
    } catch {
      // Ignore malformed page metadata.
    }
  };

  for (const match of html.matchAll(
    /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["'][^>]+content=["']([^"']+)["']/gi,
  )) {
    add(match[1]);
  }
  for (const match of html.matchAll(
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["']/gi,
  )) {
    add(match[1]);
  }

  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const json = JSON.parse(match[1] ?? "");
      const visit = (value: unknown) => {
        if (!value || found.size >= 12) return;
        if (typeof value === "string") {
          if (/\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(value)) add(value);
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(visit);
          return;
        }
        if (typeof value === "object")
          Object.values(value as Record<string, unknown>).forEach(visit);
      };
      visit(json);
    } catch {
      // Ignore malformed JSON-LD.
    }
  }
  return [...found];
}

async function fetchOfficialImages(officialUrl: string | null) {
  if (!officialUrl || !isHttpUrl(officialUrl)) return [] as string[];
  let pageUrl: URL;
  try {
    pageUrl = new URL(officialUrl);
  } catch {
    return [] as string[];
  }
  try {
    if (!isHttpUrl(pageUrl.toString())) return [];
    const response = await fetch(pageUrl.toString(), {
      headers: { "User-Agent": "SpaceCell-ProductResearch/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const finalUrl = new URL(response.url);
    if (!sameOrSubdomain(finalUrl.hostname, pageUrl.hostname)) return [];
    const html = (await response.text()).slice(0, 1_500_000);
    return extractMetaImage(html, finalUrl.toString())
      .filter((url) => {
        try {
          return sameOrSubdomain(new URL(url).hostname, finalUrl.hostname);
        } catch {
          return false;
        }
      })
      .slice(0, 8);
  } catch {
    return [] as string[];
  }
}

/**
 * Identifies a newly-added product from its real title/vendor, searches the web
 * through OpenAI's built-in web search, prefers the manufacturer's official
 * source, and extracts promotional image metadata from that official page.
 * Nothing is invented when the official source cannot be verified.
 */
export const enrichProductFromOfficialSource = createServerFn({ method: "POST" })
  .validator(productEnrichmentRequestSchema)
  .handler(async ({ data }) => {
    const key = cacheKey(data.title, data.vendor);
    const cached = enrichmentCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    enrichmentCache.delete(key);

    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      return {
        productName: data.title,
        brand: data.vendor ?? null,
        officialProductUrl: null,
        officialSite: null,
        summary: null,
        highlights: [],
        specifications: [],
        promotionalImages: [],
        sourceUrls: [],
      } satisfies EnrichmentResult;
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env["OPENAI_MODEL"] || "gpt-4o",
        tools: [{ type: "web_search", search_context_size: "high" }],
        input: `Identify this real ecommerce product and research it using web search: ${data.vendor ? `${data.vendor} ` : ""}${data.title}.

Rules:
- Prefer the manufacturer's official website and official product page.
- Do not use retailer listings, marketplaces, review sites, social media, or generated/fan pages as the authoritative product source.
- Only include specifications that are explicitly supported by a source.
- Return null/empty arrays when an official source cannot be confidently identified.
- The officialProductUrl must be the exact official product page if available.
- officialSite must be the manufacturer's official domain.
- sourceUrls must contain only pages actually used for the factual claims.
- Keep the summary factual and concise.
- Do not invent prices, stock, variants, release dates, specifications, or marketing claims.`,
        text: {
          format: {
            type: "json_schema",
            name: "product_official_research",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                vendor: { type: ["string", "null"] },
                officialUrl: { type: ["string", "null"] },
                officialProductName: { type: ["string", "null"] },
                summary: { type: ["string", "null"] },
                highlights: { type: "array", items: { type: "string" } },
                specifications: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      label: { type: "string" },
                      value: { type: "string" },
                    },
                    required: ["label", "value"],
                  },
                },
              },
              required: [
                "title",
                "vendor",
                "officialUrl",
                "officialProductName",
                "summary",
                "highlights",
                "specifications",
              ],
            },
          },
        },
        max_output_tokens: 1800,
      }),
    });

    if (!response.ok) {
      console.error("Product enrichment provider error", response.status);
      return {
        productName: data.title,
        brand: data.vendor ?? null,
        officialProductUrl: null,
        officialSite: null,
        summary: null,
        highlights: [],
        specifications: [],
        promotionalImages: [],
        sourceUrls: [],
      } satisfies EnrichmentResult;
    }

    const payload: unknown = await response.json();
    let research: z.infer<typeof productEnrichmentSchema>;
    try {
      research = productEnrichmentSchema.parse(JSON.parse(responseOutputText(payload)));
    } catch {
      console.error("Product enrichment returned invalid structured data");
      return {
        productName: data.title,
        brand: data.vendor ?? null,
        officialProductUrl: null,
        officialSite: null,
        summary: null,
        highlights: [],
        specifications: [],
        promotionalImages: [],
        sourceUrls: [],
      } satisfies EnrichmentResult;
    }

    const officialProductUrl =
      research.officialUrl && isHttpUrl(research.officialUrl) ? research.officialUrl : null;
    let officialSite: string | null = null;
    if (officialProductUrl) {
      try {
        const url = new URL(officialProductUrl);
        officialSite = `${url.protocol}//${url.host}/`;
      } catch {
        officialSite = null;
      }
    }
    const promotionalImages = await fetchOfficialImages(officialProductUrl);
    const sourceUrls = [officialProductUrl, officialSite].filter((value): value is string =>
      Boolean(value),
    );
    const result: EnrichmentResult = {
      productName: research.title || data.title,
      brand: research.vendor || data.vendor || null,
      officialProductUrl,
      officialSite,
      summary: research.summary,
      highlights: research.highlights.slice(0, 10),
      specifications: research.specifications.slice(0, 30),
      promotionalImages,
      sourceUrls,
    };
    enrichmentCache.set(key, { expiresAt: Date.now() + ENRICHMENT_TTL_MS, value: result });
    return result;
  });

const geminiAdvisorSchema = z.object({
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

type GeminiAdvisorResult = z.infer<typeof geminiAdvisorSchema>;

function compactCatalogProduct(product: ShopifyProduct) {
  const node = product.node;
  const price = node.priceRange?.minVariantPrice;
  const compareAt = node.compareAtPriceRange?.minVariantPrice;
  const image = node.images.edges[0]?.node.url ?? null;
  const variants = node.variants.edges.slice(0, 12).map(({ node: variant }) => ({
    title: variant.title,
    price: variant.price.amount,
    currency: variant.price.currencyCode,
    available: variant.availableForSale,
    options: variant.selectedOptions,
  }));
  return {
    handle: node.handle,
    title: node.title,
    brand: node.vendor ?? "",
    type: node.productType ?? "",
    description: (node.description ?? "").slice(0, 500),
    tags: (node.tags ?? []).slice(0, 20),
    price: price?.amount ?? null,
    currency: price?.currencyCode ?? null,
    compareAt: compareAt?.amount ?? null,
    available: Boolean(node.availableForSale),
    image,
    variants,
  };
}

const catalogCache = { expiresAt: 0, products: [] as ShopifyProduct[] };
const CATALOG_TTL_MS = 5 * 60 * 1000;

async function getAdvisorCatalog() {
  if (catalogCache.expiresAt > Date.now() && catalogCache.products.length)
    return catalogCache.products;
  const { fetchCatalogProducts } = await import("@/lib/shopify");
  const products = await fetchCatalogProducts(60);
  catalogCache.products = products;
  catalogCache.expiresAt = Date.now() + CATALOG_TTL_MS;
  return products;
}

function parseBudget(message: string) {
  const keywordMatch = message.match(
    /(?:under|below|less than|budget|max(?:imum)?|up to|around|\$|€|£|usd|eur|lbp|ميزانية|ميزانيتي|حد(?:ي)?|بحدود)\s*[:=]?\s*(?:\$|€|£)?\s*([0-9][0-9,]*(?:\.\d+)?)/i,
  );
  const suffixMatch = message.match(
    /([0-9][0-9,]*(?:\.\d+)?)\s*(?:\$|€|£|usd|eur|lbp|دولار|دولارًا|دولاراً)(?=$|\s|[^\p{L}\p{N}])/iu,
  );
  const raw = keywordMatch?.[1] ?? suffixMatch?.[1];
  if (!raw) return null;
  const value = Number(raw.replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function candidateScore(product: ShopifyProduct, query: string, budget: number | null) {
  const node = product.node;
  const haystack = [
    node.title,
    node.vendor,
    node.productType,
    node.description,
    ...(node.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3);
  let score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 2 : 0), 0);
  const price = Number(node.priceRange?.minVariantPrice?.amount ?? NaN);
  if (budget !== null && Number.isFinite(price)) score += price <= budget ? 5 : -5;
  if (node.availableForSale) score += 1;
  return score;
}

function supportsStructuredOutputWithTools(model: string) {
  return /^gemini-3(?:[.-]|$)/i.test(model);
}

function extractGeminiJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return cleaned;
  return cleaned.slice(start, end + 1);
}

async function callGeminiShoppingAdvisor(input: {
  message: string;
  productContext?: string;
  catalog: ShopifyProduct[];
}) {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) return null;

  const budget = parseBudget(input.message);
  const ranked = [...input.catalog]
    .sort(
      (a, b) => candidateScore(b, input.message, budget) - candidateScore(a, input.message, budget),
    )
    .slice(0, 80)
    .map(compactCatalogProduct);

  const prompt = `You are ${STORE_NAME}'s Gemini shopping advisor. This is a REAL ecommerce store. Your job is to search the store catalogue first, then use Google Search only when current/external information is needed (especially official manufacturer compatibility, box contents, charging requirements, or product specifications).

HARD RULES:
- Never invent a product, handle, price, stock status, compatibility claim, specification, or accessory.
- Store prices, availability, handles and product names MUST come from the catalogue JSON below.
- When recommending products, only recommend handles that exist in the catalogue JSON.
- For a budget request, respect the user's maximum budget using the catalogue currency; if the currency is unclear, explain the limitation rather than converting silently.
- For compatibility/accessory advice, verify with an official manufacturer source when the catalogue description does not explicitly establish compatibility.
- If a phone does not include a charger and a compatible charger exists in the store catalogue, recommend that charger as an add-on. Do not assume the box contents; verify it first using official sources when needed.
- Prefer the best-value choice for the user's stated priorities, not simply the most expensive product.
- Answer in the user's language. Keep the answer concise and practical.
- If there is no good match in the store, say so and explain what is missing.
- Sources must be real URLs returned/used by Google Search. Prefer official manufacturer domains for external product facts.
- Your final response MUST be exactly one JSON object, without Markdown fences or commentary. It must contain these keys: answer, intent, recommendations, missingItems, sources. intent must be one of search, recommendation, comparison, compatibility, general. recommendations must contain objects with handle, reason, priority (1-5), addToCart. missingItems must contain objects with name, reason, searchNeeded. sources must contain objects with title and url, or be an empty array.

USER REQUEST:
${input.message}

CURRENT PRODUCT CONTEXT:
${input.productContext || "None"}

LIVE STORE CATALOG CANDIDATES:
${JSON.stringify(ranked)}
`;

  const schema = {
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
          properties: { title: { type: "string" }, url: { type: "string" } },
          required: ["title", "url"],
        },
      },
    },
    required: ["answer", "intent", "recommendations", "missingItems", "sources"],
  };

  const model = process.env["GEMINI_MODEL"] || "gemini-2.5-flash";
  const generationConfig = supportsStructuredOutputWithTools(model)
    ? {
        temperature: 0.2,
        maxOutputTokens: 1800,
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    : {
        temperature: 0.2,
        maxOutputTokens: 1800,
      };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `You are a trustworthy ecommerce product advisor for ${STORE_NAME}.` }],
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig,
      }),
    },
  );

  if (!response.ok) {
    console.error("Gemini advisor error", response.status, await response.text().catch(() => ""));
    return null;
  }

  type GroundingMetadata = {
    groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
  };
  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: GroundingMetadata;
    }>;
    groundingMetadata?: GroundingMetadata;
  };
  const candidate = payload.candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) return null;

  try {
    const parsed = geminiAdvisorSchema.parse(JSON.parse(extractGeminiJson(text)));
    const groundingMetadata = candidate?.groundingMetadata ?? payload.groundingMetadata;
    const groundedSources = (groundingMetadata?.groundingChunks ?? [])
      .map((chunk) => chunk.web)
      .filter((web): web is { title?: string; uri?: string } => Boolean(web?.uri))
      .map((web) => ({ title: web.title || web.uri!, url: web.uri! }));
    const sources = [...parsed.sources, ...groundedSources]
      .filter((item, index, arr) => arr.findIndex((x) => x.url === item.url) === index)
      .slice(0, 8);
    const validHandles = new Set(input.catalog.map((product) => product.node.handle));
    return {
      ...parsed,
      recommendations: parsed.recommendations.filter((item) => validHandles.has(item.handle)),
      sources,
    } satisfies GeminiAdvisorResult;
  } catch (error) {
    console.error("Gemini advisor invalid structured response", error);
    return null;
  }
}

export const askGeminiShoppingAdvisor = createServerFn({ method: "POST" })
  .validator(
    z.object({
      message: z.string().trim().min(1).max(1600),
      productContext: z.string().trim().max(5000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const catalog = await getAdvisorCatalog();
    const result = await callGeminiShoppingAdvisor({
      message: data.message,
      ...(data.productContext ? { productContext: data.productContext } : {}),
      catalog,
    });

    if (result) return { ok: true, provider: "gemini", ...result };

    // Preserve the existing assistant as a safe fallback when Gemini is not configured.
    const fallback = await askStoreAssistant({
      data: { message: data.message, context: data.productContext },
    });
    return {
      ok: fallback.ok,
      provider: "openai-fallback",
      answer: fallback.answer,
      intent: "general" as const,
      recommendations: [],
      missingItems: [],
      sources: [],
    };
  });
