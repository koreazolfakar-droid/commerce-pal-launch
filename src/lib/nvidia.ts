export const DEFAULT_SUPABASE_URL = "https://rtwyankpxtffqqrasyzw.supabase.co";
export const DEFAULT_SUPABASE_NVIDIA_FUNCTION = "nvidia-chat";

export type NvidiaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type NvidiaMessageContent = string | Array<{ type?: string; text?: string }> | undefined;

type NvidiaChatPayload = {
  model?: string;
  choices?: Array<{
    message?: { content?: NvidiaMessageContent };
  }>;
  error?: string | { message?: string; type?: string; code?: string };
  status?: number;
  title?: string;
  detail?: string;
};

export class NvidiaApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status = 0, body = "") {
    super(message);
    this.name = "NvidiaApiError";
    this.status = status;
    this.body = body;
  }
}

export function getNvidiaGatewayConfig() {
  const supabaseUrl = process.env["SUPABASE_URL"]?.trim() || DEFAULT_SUPABASE_URL;
  const anonKey = process.env["SUPABASE_ANON_KEY"]?.trim();
  const functionName =
    process.env["SUPABASE_NVIDIA_FUNCTION"]?.trim() || DEFAULT_SUPABASE_NVIDIA_FUNCTION;
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ""), anonKey, functionName };
}

function messageText(content: NvidiaMessageContent) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (part && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function providerErrorMessage(payload: NvidiaChatPayload, fallback: string) {
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error.trim();
  if (payload.error && typeof payload.error === "object" && payload.error.message?.trim()) {
    return payload.error.message.trim();
  }
  if (payload.detail?.trim()) return payload.detail.trim();
  if (payload.title?.trim()) return payload.title.trim();
  return fallback;
}

export function extractJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}

export async function callNvidiaChat({
  messages,
  maxTokens = 3000,
  temperature = 0.16,
}: {
  messages: NvidiaChatMessage[];
  maxTokens?: number;
  temperature?: number;
}) {
  const { supabaseUrl, anonKey, functionName } = getNvidiaGatewayConfig();
  if (!anonKey) {
    throw new NvidiaApiError(
      "SUPABASE_ANON_KEY is not configured",
      0,
      "SUPABASE_GATEWAY_NOT_CONFIGURED",
    );
  }

  const functionUrl = `${supabaseUrl}/functions/v1/${encodeURIComponent(functionName)}`;

  let response: Response;
  try {
    response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(40_000),
    });
  } catch (error) {
    throw new NvidiaApiError(
      error instanceof Error ? error.message : "Supabase NVIDIA gateway request failed",
      0,
      "NETWORK_ERROR",
    );
  }

  const body = await response.text().catch(() => "");
  let payload: NvidiaChatPayload = {};
  if (body) {
    try {
      payload = JSON.parse(body) as NvidiaChatPayload;
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    const upstreamStatus =
      typeof payload.status === "number" && payload.status >= 400 ? payload.status : response.status;
    throw new NvidiaApiError(
      providerErrorMessage(payload, body || `Supabase NVIDIA gateway error ${response.status}`),
      upstreamStatus,
      body,
    );
  }

  const text = messageText(payload.choices?.[0]?.message?.content);
  if (!text) throw new NvidiaApiError("NVIDIA returned an empty response", 502, body);
  return { text, model: payload.model?.trim() || undefined };
}
