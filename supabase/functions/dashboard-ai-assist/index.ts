import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const MAX_BODY_BYTES = 32 * 1024;
const GEMINI_TIMEOUT_MS = 25_000;

const allowedOrigins = new Set([
  "https://spacecallapp.store",
  "https://www.spacecallapp.store",
  "http://localhost:3000",
  "http://localhost:5173",
]);

const allowedEntities = new Set(["product", "category", "brand"]);
const allowedActions = new Set(["research_fill", "seo", "validate"]);
const forbiddenFields = new Set([
  "price",
  "compareat",
  "compare_at",
  "cost",
  "costprice",
  "stock",
  "stockquantity",
  "inventory",
  "quantity",
  "supplier",
  "supplierid",
  "orderstatus",
  "order_status",
  "refund",
  "discount",
  "permissions",
  "role",
  "password",
  "userid",
  "user_id",
]);

type AiField = {
  key: string;
  label: string;
  description?: string;
  review?: boolean;
  maxLength?: number;
};

type AiBody = {
  entity?: unknown;
  action?: unknown;
  query?: unknown;
  currentData?: unknown;
  fields?: unknown;
  context?: unknown;
};

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://spacecallapp.store",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

function bearerToken(req: Request) {
  const authorization = req.headers.get("authorization")?.trim() ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

function serverSecretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (legacy) return legacy;

  const secretMap = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretMap) return "";
  try {
    const parsed = JSON.parse(secretMap);
    return typeof parsed?.default === "string" ? parsed.default : "";
  } catch {
    return "";
  }
}

function cleanRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .slice(0, 80)
    .map(([key, item]) => [key.slice(0, 80), typeof item === "string" ? item.slice(0, 5000) : item]);
  return Object.fromEntries(entries);
}

function cleanFields(value: unknown): AiField[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const fields: AiField[] = [];

  for (const item of value.slice(0, 40)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const key = typeof row.key === "string" ? row.key.trim() : "";
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!key || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)) continue;
    if (forbiddenFields.has(normalized) || seen.has(key)) continue;
    seen.add(key);
    fields.push({
      key,
      label: typeof row.label === "string" ? row.label.slice(0, 120) : key,
      description: typeof row.description === "string" ? row.description.slice(0, 500) : undefined,
      review: row.review === true,
      maxLength:
        typeof row.maxLength === "number" && Number.isFinite(row.maxLength)
          ? Math.max(1, Math.min(20_000, Math.trunc(row.maxLength)))
          : undefined,
    });
  }

  return fields;
}

function responseSchema(fields: AiField[]) {
  return {
    type: "object",
    properties: {
      summary: { type: "string" },
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string", enum: fields.map((field) => field.key) },
            value: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            verified: { type: "boolean" },
            reason: { type: "string" },
          },
          required: ["field", "value", "confidence", "verified", "reason"],
        },
      },
      warnings: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["summary", "suggestions", "warnings"],
  };
}

function buildPrompt(args: {
  entity: string;
  action: string;
  query: string;
  currentData: Record<string, unknown>;
  fields: AiField[];
  context: Record<string, unknown>;
}) {
  const actionInstruction =
    args.action === "seo"
      ? "Focus on SEO quality: natural search intent, accurate entity naming, concise titles/descriptions, Lebanon relevance only when factually appropriate, and no keyword stuffing."
      : args.action === "validate"
        ? "Audit the existing values. Suggest a replacement only when a value is wrong, misleading, incomplete, or clearly improvable. Put other issues in warnings."
        : "Research the exact entity and fill as many allowed fields as can be supported reliably.";

  return [
    "You are Space Call's catalog research assistant for a production ecommerce dashboard.",
    "Accuracy is more important than completeness.",
    "Search the web when search grounding is available. Prefer the official manufacturer or brand website, then official documentation, then reputable retailers.",
    "Never invent specifications, compatibility, identifiers, websites, claims, warranties, availability, prices, stock, supplier data, or operational values.",
    "If sources disagree or the exact model/entity cannot be identified, lower confidence, set verified=false, and explain the uncertainty.",
    "Do not copy long source text. Write original concise ecommerce copy.",
    "For SEO, write for humans first. Avoid keyword stuffing, hidden-text tactics, unsupported superlatives, and duplicate boilerplate.",
    "A verified=true suggestion means the value is directly supported by research, not merely plausible.",
    actionInstruction,
    "",
    `Entity: ${args.entity}`,
    `Research query: ${args.query}`,
    `Allowed fields: ${JSON.stringify(args.fields)}`,
    `Current form values: ${JSON.stringify(args.currentData)}`,
    `Dashboard context: ${JSON.stringify(args.context)}`,
    "",
    "Return only the structured response requested by the response schema.",
  ].join("\n");
}

async function callGemini(args: {
  apiKey: string;
  model: string;
  prompt: string;
  fields: AiField[];
  withSearch: boolean;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const payload: Record<string, unknown> = {
      contents: [{ role: "user", parts: [{ text: args.prompt }] }],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 4096,
        responseFormat: {
          text: {
            mimeType: "application/json",
            schema: responseSchema(args.fields),
          },
        },
      },
    };
    if (args.withSearch) payload.tools = [{ googleSearch: {} }];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": args.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );

    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

function geminiText(payload: Record<string, unknown>) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const candidate = candidates[0] && typeof candidates[0] === "object"
    ? candidates[0] as Record<string, unknown>
    : {};
  const content = candidate.content && typeof candidate.content === "object"
    ? candidate.content as Record<string, unknown>
    : {};
  const parts = Array.isArray(content.parts) ? content.parts : [];

  return parts
    .filter((part): part is Record<string, unknown> => Boolean(part) && typeof part === "object")
    .map((part) => typeof part.text === "string" ? part.text : "")
    .join("")
    .trim();
}

function grounding(payload: Record<string, unknown>) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const candidate = candidates[0] && typeof candidates[0] === "object"
    ? candidates[0] as Record<string, unknown>
    : {};
  const metadata = candidate.groundingMetadata && typeof candidate.groundingMetadata === "object"
    ? candidate.groundingMetadata as Record<string, unknown>
    : {};

  const queries = Array.isArray(metadata.webSearchQueries)
    ? metadata.webSearchQueries.filter((value): value is string => typeof value === "string")
    : [];

  const chunks = Array.isArray(metadata.groundingChunks) ? metadata.groundingChunks : [];
  const sources: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    if (!chunk || typeof chunk !== "object") continue;
    const web = (chunk as Record<string, unknown>).web;
    if (!web || typeof web !== "object") continue;
    const row = web as Record<string, unknown>;
    const url = typeof row.uri === "string" ? row.uri : "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({
      title: typeof row.title === "string" ? row.title.slice(0, 240) : url,
      url,
    });
  }

  return { grounded: Boolean(queries.length || sources.length), sources: sources.slice(0, 12) };
}

function normalizeAiResult(
  raw: unknown,
  fields: AiField[],
  grounded: boolean,
  extraWarning?: string,
) {
  const allowed = new Map(fields.map((field) => [field.key, field] as const));
  const root = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const suggestions = Array.isArray(root.suggestions) ? root.suggestions : [];
  const normalized = [];

  for (const item of suggestions) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const field = typeof row.field === "string" ? row.field : "";
    const definition = allowed.get(field);
    if (!definition) continue;

    let value = typeof row.value === "string" ? row.value.trim() : "";
    if (!value) continue;
    if (definition.maxLength) value = value.slice(0, definition.maxLength);

    let confidence = Math.max(0, Math.min(1, Number(row.confidence) || 0));
    const verified = grounded && row.verified === true;
    if (!grounded) confidence = Math.min(confidence, 0.65);

    normalized.push({
      field,
      value,
      confidence,
      verified,
      reason: typeof row.reason === "string" ? row.reason.slice(0, 1000) : "",
    });
  }

  const warnings = Array.isArray(root.warnings)
    ? root.warnings.filter((item): item is string => typeof item === "string").slice(0, 20)
    : [];
  if (extraWarning) warnings.unshift(extraWarning);

  return {
    summary: typeof root.summary === "string" ? root.summary.slice(0, 2000) : "",
    suggestions: normalized,
    warnings,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json(req, { error: "request_too_large" }, 413);
  }

  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = serverSecretKey();
  const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  const model = Deno.env.get("GEMINI_MODEL")?.trim() || DEFAULT_MODEL;

  if (!url || !serviceKey) return json(req, { error: "server_not_configured" }, 503);
  if (!geminiKey) {
    return json(req, {
      error: "gemini_not_configured",
      message: "Set GEMINI_API_KEY in Supabase Edge Function secrets.",
    }, 503);
  }

  const token = bearerToken(req);
  if (!token) return json(req, { error: "authentication_required" }, 401);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user?.id) return json(req, { error: "authentication_required" }, 401);

  const { data: roleRows, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) return json(req, { error: "authorization_unavailable" }, 503);
  const allowed = (roleRows ?? []).some((row) => row.role === "admin" || row.role === "editor");
  if (!allowed) return json(req, { error: "dashboard_access_required" }, 403);

  let body: AiBody;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }

  const entity = typeof body.entity === "string" ? body.entity : "";
  const action = typeof body.action === "string" ? body.action : "";
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const fields = cleanFields(body.fields);
  const currentData = cleanRecord(body.currentData);
  const context = cleanRecord(body.context);

  if (!allowedEntities.has(entity)) return json(req, { error: "invalid_entity" }, 400);
  if (!allowedActions.has(action)) return json(req, { error: "invalid_action" }, 400);
  if (query.length < 2 || query.length > 500) return json(req, { error: "invalid_query" }, 400);
  if (!fields.length) return json(req, { error: "no_allowed_fields" }, 400);

  const prompt = buildPrompt({ entity, action, query, currentData, fields, context });

  let gemini;
  let fallbackWarning = "";
  try {
    gemini = await callGemini({
      apiKey: geminiKey,
      model,
      prompt,
      fields,
      withSearch: true,
    });

    if (!gemini.ok && (gemini.status === 400 || gemini.status === 403 || gemini.status === 429)) {
      const retry = await callGemini({
        apiKey: geminiKey,
        model,
        prompt,
        fields,
        withSearch: false,
      });
      if (retry.ok) {
        gemini = retry;
        fallbackWarning =
          "Google Search grounding was unavailable for the current Gemini project/tier. Suggestions are unverified until manually checked.";
      }
    }
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError"
      ? "gemini_timeout"
      : "gemini_unavailable";
    return json(req, { error: message }, 503);
  }

  if (!gemini?.ok) {
    const providerError =
      gemini?.body && typeof gemini.body === "object"
        ? (gemini.body as Record<string, unknown>).error
        : null;
    console.warn("[dashboard-ai] Gemini request failed", gemini?.status, providerError);
    return json(req, { error: "gemini_request_failed" }, 502);
  }

  const providerPayload = gemini.body as Record<string, unknown>;
  const rawText = geminiText(providerPayload);
  if (!rawText) return json(req, { error: "empty_ai_response" }, 502);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return json(req, { error: "invalid_ai_response" }, 502);
  }

  const research = grounding(providerPayload);
  const normalized = normalizeAiResult(parsed, fields, research.grounded, fallbackWarning);

  return json(req, {
    ok: true,
    entity,
    action,
    model,
    grounded: research.grounded,
    ...normalized,
    sources: research.sources,
  });
});
