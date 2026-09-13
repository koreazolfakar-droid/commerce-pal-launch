export const NVIDIA_API_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_NVIDIA_MODEL = "openai/gpt-oss-20b";

export type NvidiaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type NvidiaChatPayload = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
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

export function getNvidiaConfig() {
  const apiKey = process.env["NVIDIA_API_KEY"]?.trim();
  const model = process.env["NVIDIA_MODEL"]?.trim() || DEFAULT_NVIDIA_MODEL;
  return { apiKey, model };
}

function messageText(content: NvidiaChatPayload["choices"] extends Array<infer T>
  ? T extends { message?: { content?: infer C } }
    ? C
    : never
  : never) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (part && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
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
  maxTokens = 2600,
  temperature = 0.18,
}: {
  messages: NvidiaChatMessage[];
  maxTokens?: number;
  temperature?: number;
}) {
  const { apiKey, model } = getNvidiaConfig();
  if (!apiKey) {
    throw new NvidiaApiError("NVIDIA_API_KEY is not configured", 0, "NVIDIA_NOT_CONFIGURED");
  }

  let response: Response;
  try {
    response = await fetch(`${NVIDIA_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        top_p: 0.9,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: AbortSignal.timeout(35_000),
    });
  } catch (error) {
    throw new NvidiaApiError(
      error instanceof Error ? error.message : "NVIDIA request failed",
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
    const providerMessage = payload.error?.message || body || `NVIDIA API error ${response.status}`;
    throw new NvidiaApiError(providerMessage, response.status, body);
  }

  const text = messageText(payload.choices?.[0]?.message?.content);
  if (!text) {
    throw new NvidiaApiError("NVIDIA returned an empty response", 502, body);
  }

  return { text, model };
}
