function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** REST responses carry text inside output message items; output_text is an SDK helper. */
export function responseOutputText(payload: unknown): string {
  if (!record(payload)) return "";
  if (typeof payload["output_text"] === "string") return payload["output_text"].trim();
  if (!Array.isArray(payload["output"])) return "";
  return payload["output"]
    .flatMap((item: unknown) => {
      if (!record(item) || item["type"] !== "message" || !Array.isArray(item["content"])) return [];
      return item["content"].flatMap((part: unknown) =>
        record(part) && part["type"] === "output_text" && typeof part["text"] === "string"
          ? [part["text"]]
          : [],
      );
    })
    .join("")
    .trim();
}
