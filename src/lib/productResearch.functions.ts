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

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "::1"].includes(host) || host.endsWith(".localhost"))
      return false;
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
      headers: { "User-Agent": "SpaceCall-ProductResearch/1.0" },
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
 * Separately enriches a product page from the manufacturer's official source.
 * This is not the shopping assistant; the Smart Phone Advisor lives in
 * smartPhoneAdvisor.functions.ts.
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
