// Cloudflare Workers AI is intentionally opt-in and server-only.
// Keep the allowlist limited to models Cloudflare lists on the Workers Free plan.
export const DEFAULT_CLOUDFLARE_MODEL = "@cf/zai-org/glm-4.7-flash";
export const FREE_CLOUDFLARE_MODELS = [
  DEFAULT_CLOUDFLARE_MODEL,
  "@cf/google/gemma-4-26b-a4b-it",
] as const;

export function isFreeCloudflareModel(model: string): boolean {
  return (FREE_CLOUDFLARE_MODELS as readonly string[]).includes(model);
}

type CloudflareRequest = {
  accountId: string;
  token: string;
  model: string;
  systemInstruction: string;
  input: string;
  responseSchema: Record<string, unknown>;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

export async function callCloudflareAi(args: CloudflareRequest) {
  if (!/^[a-f0-9]{32}$/i.test(args.accountId)) throw new Error("invalid_cloudflare_account_id");
  if (!isFreeCloudflareModel(args.model)) throw new Error("cloudflare_model_not_free");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? 25_000);
  try {
    const response = await (args.fetcher ?? fetch)(
      "https://api.cloudflare.com/client/v4/accounts/" +
        args.accountId +
        "/ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + args.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: args.model,
          messages: [
            {
              role: "system",
              content:
                args.systemInstruction +
                "\nThis provider has NO live web search or URL retrieval. Treat all URLs as unverified pointers, never claim web-grounded verification, and set verified=false on every suggestion. Only extract factual specifications when the supplied source text contains a supporting literal quotation. Otherwise place the field in missingFields. Return ONLY a valid JSON object; no Markdown. Use exactly this JSON response schema (field names and allowed keys): " +
                JSON.stringify(args.responseSchema),
            },
            { role: "user", content: args.input },
          ],
          temperature: 0.1,
          max_tokens: 6144,
          stream: false,
        }),
        signal: controller.signal,
      },
    );
    const body: unknown = await response.json().catch(() => ({}));
    const retryAfter = response.headers?.get("retry-after") ?? "";
    return { ok: response.ok, status: response.status, body, retryAfter };
  } finally {
    clearTimeout(timeout);
  }
}

export function cloudflareText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const body = payload as Record<string, unknown>;
  const choices = Array.isArray(body.choices) ? body.choices : [];
  const first = choices[0];
  if (!first || typeof first !== "object") return "";
  const message = (first as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return "";
  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content))
    return content
      .filter((part): part is { type: string; text: string } =>
        !!part && typeof part === "object" &&
        (part as Record<string, unknown>).type === "text" &&
        typeof (part as Record<string, unknown>).text === "string")
      .map((part) => part.text)
      .join("")
      .trim();
  return "";
}
