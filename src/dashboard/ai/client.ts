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
        }))
        .filter((item) => item.field)
    : [];

  const sources = Array.isArray(row.sources)
    ? row.sources
        .filter(
          (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
        )
        .map((item) => ({ title: text(item.title), url: safeHttpUrl(item.url) }))
        .filter((item) => item.url)
    : [];

  return {
    entity: row.entity === "category" || row.entity === "brand" ? row.entity : "product",
    action: row.action === "seo" || row.action === "validate" ? row.action : "research_fill",
    model: text(row.model),
    grounded: row.grounded === true,
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
    throw new Error(error.message || "Unable to reach the AI assistant.");
  }

  return normalizeResponse(data);
}
