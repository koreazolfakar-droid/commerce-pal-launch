const CLIENT_DISCONNECT_CODES = new Set([
  "ECONNRESET",
  "ECONNABORTED",
  "EPIPE",
  "ERR_STREAM_PREMATURE_CLOSE",
]);

const CAUSE_DEPTH_LIMIT = 5;

/** Identifies routine browser/socket cancellations without hiding app failures. */
export function isClientDisconnectError(value: unknown): boolean {
  let current: unknown = value;
  for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
    if (!(current instanceof Error)) break;
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && CLIENT_DISCONNECT_CODES.has(code)) return true;
    if (current.message === "aborted" || current.message === "The operation was aborted.") {
      return true;
    }
    if (current.name === "AbortError") return true;
    current = current.cause;
  }
  return false;
}