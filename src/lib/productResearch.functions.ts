import { responseOutputText } from "@/lib/openaiResponse";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

function isBlockedHostname(host: string) {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:1"
  ) {
    return true;
  }

  const octets = normalized.split(".").map(Number);
  if (octets.length === 4 && octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    const [a, b = 0] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (normalized.includes(":")) {
    return (
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/i.test(normalized) ||
      normalized.startsWith("ff") ||
      normalized.startsWith("2001:db8")
    );
  }

  return false;
}

function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password &&
      !isBlockedHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

function emptyResult(title: string, vendor?: string | null): EnrichmentResult {
  return {
    productName: title,
    brand: vendor ?? null,
    officialProductUrl: null,
    officialSite: null,
    summary: null,
    highlights: [],
    specifications: [],
    promotionalImages: [],
    sourceUrls: [],
  };
}

/**
 * Enriches a product with structured information from OpenAI web search.
 * Security invariant: the application never performs a second server-side fetch
 * to a URL produced by the model. This prevents AI-controlled URLs, redirects,
 * DNS rebinding, or private-network destinations from becoming an SSRF primitive.
 */
export const enrichProductFromOfficialSource = createServerFn({ method: "POST" })
  .validator(productEnrichmentRequestSchema)
  .handler(async ({ data }) => {
    const key = cacheKey(data.title, data.vendor);
    const cached = enrichmentCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    enrichmentCache.delete(key);

    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) return emptyResult(data.title, data.vendor);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env["OPENAI_MODEL"] || "gpt-4o",
        tools: [{ type: "web_search", search_context_size: "high" }],
        input: `Identify this real ecommerce product and research it using web search: ${data.vendor ? `${data.vendor} ` : ""}${data.title}.\n\nRules:\n- Prefer the manufacturer's official website and official product page.\n- Do not use retailer listings, marketplaces, review sites, social media, or generated/fan pages as the authoritative product source.\n- Only include specifications that are explicitly supported by a source.\n- Return null/empty arrays when an official source cannot be confidently identified.\n- The officialProductUrl must be the exact official product page if available.\n- Keep the summary factual and concise.\n- Do not invent prices, stock, variants, release dates, specifications, or marketing claims.`,
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
      signal: AbortSignal.timeout(35_000),
    });

    if (!response.ok) {
      console.error("Product enrichment provider error", response.status);
      return emptyResult(data.title, data.vendor);
    }

    const payload: unknown = await response.json();
    let research: z.infer<typeof productEnrichmentSchema>;
    try {
      research = productEnrichmentSchema.parse(JSON.parse(responseOutputText(payload)));
    } catch {
      console.error("Product enrichment returned invalid structured data");
      return emptyResult(data.title, data.vendor);
    }

    const officialProductUrl =
      research.officialUrl && isSafeExternalUrl(research.officialUrl) ? research.officialUrl : null;
    let officialSite: string | null = null;
    if (officialProductUrl) {
      try {
        const url = new URL(officialProductUrl);
        officialSite = `${url.protocol}//${url.host}/`;
      } catch {
        officialSite = null;
      }
    }

    const result: EnrichmentResult = {
      productName: research.title || data.title,
      brand: research.vendor || data.vendor || null,
      officialProductUrl,
      officialSite,
      summary: research.summary,
      highlights: research.highlights.slice(0, 10),
      specifications: research.specifications.slice(0, 30),
      // Intentionally empty: never fetch model-provided URLs server-side.
      promotionalImages: [],
      sourceUrls: [officialProductUrl, officialSite].filter((value): value is string => Boolean(value)),
    };

    enrichmentCache.set(key, { expiresAt: Date.now() + ENRICHMENT_TTL_MS, value: result });
    return result;
  });
