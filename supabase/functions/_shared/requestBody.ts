/** Read actual streamed bytes before JSON parsing; never trust Content-Length. */
export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("payload_too_large");
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readBoundedText(request: Request, maxBytes: number): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new RangeError("invalid_body_limit");
  const reader = request.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        // Cancellation must not delay rejection of a stream left open by a client.
        void reader.cancel("payload_too_large").catch(() => undefined);
        throw new RequestBodyTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
