import type {
  DashboardAiFieldDefinition,
  DashboardAiRequest,
  DashboardAiResponse,
  DashboardAiSuggestion,
} from "./types";

const MAX_FIELDS_PER_REQUEST = 40;
const MAX_REQUEST_BYTES = 60 * 1024;
const normalize = (value: string) => value.replace(/\r\n?/g, "\n").trim();

/** Process every specification field without truncating large category templates. */
export function planAiBatches(request: DashboardAiRequest): DashboardAiRequest[] {
  const seen = new Set<string>();
  const fields = request.fields.filter((field) => {
    if (seen.has(field.key)) return false;
    seen.add(field.key);
    return !(
      request.action === "research_fill" &&
      request.fillMode === "empty" &&
      normalize(request.currentData[field.key] ?? "")
    );
  });
  const make = (items: DashboardAiFieldDefinition[]): DashboardAiRequest => ({
    ...request,
    fields: items,
    currentData: Object.fromEntries(
      items.map((field) => [field.key, (request.currentData[field.key] ?? "").slice(0, 5000)]),
    ),
    context: {
      ...request.context,
      ...(request.entity === "product"
        ? {
            specKeys: items
              .filter((field) => field.key.startsWith("spec__"))
              .map((field) => field.key.slice(6)),
          }
        : {}),
    },
  });
  const batches: DashboardAiRequest[] = [];
  let pending: DashboardAiFieldDefinition[] = [];
  for (const field of fields) {
    const next = [...pending, field];
    if (
      pending.length &&
      (next.length > MAX_FIELDS_PER_REQUEST ||
        new TextEncoder().encode(JSON.stringify(make(next))).byteLength > MAX_REQUEST_BYTES)
    ) {
      batches.push(make(pending));
      pending = [];
    }
    pending.push(field);
    if (new TextEncoder().encode(JSON.stringify(make(pending))).byteLength > MAX_REQUEST_BYTES)
      throw new Error(
        "The form context is too large. Shorten the supplied information and try again.",
      );
  }
  if (pending.length) batches.push(make(pending));
  return batches;
}

export function mergeAiResponses(responses: DashboardAiResponse[]): DashboardAiResponse {
  if (!responses.length) throw new Error("AI returned no form results.");
  const rank = { uncertain: 0, partial: 1, exact: 2 };
  const weakest = responses.reduce((a, b) =>
    rank[a.entityMatch.status] <= rank[b.entityMatch.status] ? a : b,
  );
  return {
    ...responses[0],
    grounded: responses.every((response) => response.grounded),
    entityMatch: weakest.entityMatch,
    summary: [...new Set(responses.map((response) => response.summary).filter(Boolean))].join("\n"),
    suggestions: [
      ...new Map(
        responses.flatMap((response) => response.suggestions).map((item) => [item.field, item]),
      ).values(),
    ],
    sources: [
      ...new Map(
        responses.flatMap((response) => response.sources).map((item) => [item.url, item]),
      ).values(),
    ],
    warnings: [...new Set(responses.flatMap((response) => response.warnings))],
    missingFields: responses.flatMap((response) => response.missingFields ?? []),
  };
}

export function formCompletion(
  fields: DashboardAiFieldDefinition[],
  currentData: Record<string, string>,
  suggestions: DashboardAiSuggestion[],
  selected: ReadonlySet<string>,
) {
  const ready = new Set(
    suggestions
      .filter(
        (item) => selected.has(item.field) && item.decision !== "block" && normalize(item.value),
      )
      .map((item) => item.field),
  );
  const complete = fields.filter(
    (field) => normalize(currentData[field.key] ?? "") || ready.has(field.key),
  );
  return {
    total: fields.length,
    completed: complete.length,
    missing: fields.filter((field) => !complete.includes(field)),
  };
}

export function hasFieldChanged(
  field: string,
  baseline: Record<string, string>,
  currentData: Record<string, string>,
) {
  return normalize(baseline[field] ?? "") !== normalize(currentData[field] ?? "");
}
