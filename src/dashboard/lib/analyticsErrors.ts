export function analyticsErrorMessage(error: { code?: unknown; message?: unknown }): string {
  if (error.code === "PGRST202" || error.code === "42883")
    return "Analytics is being updated. Please try again shortly.";
  return typeof error.message === "string" && error.message
    ? error.message
    : "Unable to load analytics.";
}
