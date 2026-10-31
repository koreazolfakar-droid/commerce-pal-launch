/** Keep boundary failures visible without an editor or third-party reporting hook. */
export function reportRuntimeError(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  console.error("[Space Call] Runtime error", {
    ...context,
    route: window.location.pathname,
    message,
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
  });
}
