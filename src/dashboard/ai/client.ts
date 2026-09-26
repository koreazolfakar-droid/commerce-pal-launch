import { supabase } from "@/integrations/supabase/client";
import type { DashboardAiRequest, DashboardAiResponse } from "@/dashboard/ai/types";

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safeHttpUrl(value: unknown) {
  const raw = text(value).trim();
  if (!raw || raw.length > 2048) return "";
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

async function invokeErrorMessage(error: unknown) {
  const fallback =
    error && typeof error === "object" && "message" in error
      ? text((error as { message?: unknown }).message)
      : "Unable to reach the AI assistant.";

  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : undefined;

  if (typeof Response !== "undefined" && context instanceof Response) {
    try {
      const payload = (await context.clone().json()) as Record<string, unknown>;
      const message = text(payload.message) || text(payload.error);
      if (message) return message;
    } catch {
      // Fall back to the Supabase Functions error below.
    }
  }

  return fallback || "Unable to reach the AI assistant.";
}

function normalizeResponse(value: unknown): DashboardAiResponse {
  if (!value || typeof value !== "object") {
    throw new Error("AI assistant returned an invalid response.");
  }

  const row = value as Record<string, unknown>;
  if (row.error) {
    throw new Error(text(row.message) || text(row.error) || "AI assistant request failed.");
  }

  const suggestions = Array.isArray(row.suggestions)
    ? row.suggestions
        .filter(
          (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
        )
        .map((item) => ({
          field: text(item.field),
          value: text(item.value),
          confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
          verified: item.verified === true,
          reason: text(item.reason),
          risk:
            item.risk === "low" || item.risk === "high" ? item.risk : "medium",
          decision:
            item.decision === "allow" || item.decision === "block"
              ? item.decision
              : "review",
          checks: Array.isArray(item.checks) ? item.checks.map(text).filter(Boolean) : [],
          sourceUrls: Array.isArray(item.sourceUrls)
            ? item.sourceUrls.map(safeHttpUrl).filter(Boolean).slice(0, 5)
            : [],
        }))
        .filter((item) => item.field)
    : [];

  const sources = Array.isArray(row.sources)
    ? row.sources
        .filter(
          (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
        )
        .map((item) => ({
          title: text(item.title),
          url: safeHttpUrl(item.url),
          quality: Math.max(0, Math.min(1, Number(item.quality) || 0)),
          official: item.official === true,
        }))
        .filter((item) => item.url)
    : [];

  const match =
    row.entityMatch && typeof row.entityMatch === "object"
      ? (row.entityMatch as Record<string, unknown>)
      : {};

  return {
    entity: row.entity === "category" || row.entity === "brand" ? row.entity : "product",
    action: row.action === "seo" || row.action === "validate" ? row.action : "research_fill",
    model: text(row.model),
    grounded: row.grounded === true,
    entityMatch: {
      status:
        match.status === "exact" || match.status === "partial" ? match.status : "uncertain",
      canonicalName: text(match.canonicalName),
      reason: text(match.reason),
    },
    summary: text(row.summary),
    suggestions,
    warnings: Array.isArray(row.warnings) ? row.warnings.map(text).filter(Boolean) : [],
    sources,
  };
}

export async function requestDashboardAiAssist(request: DashboardAiRequest) {
  const query = request.query.trim();
  if (query.length < 2) throw new Error("Enter a product, category, or brand name first.");
  if (query.length > 500) throw new Error("AI research query is too long.");

  const { data, error } = await supabase.functions.invoke("dashboard-ai-assist", {
    body: {
      ...request,
      query,
      fields: request.fields.slice(0, 40),
    },
  });

  if (error) {
    throw new Error(await invokeErrorMessage(error));
  }

  return normalizeResponse(data);
}
