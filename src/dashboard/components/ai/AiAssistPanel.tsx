import { useDashboardModal } from "@/dashboard/hooks/useDashboardModal";
import { formCompletion, hasFieldChanged } from "@/dashboard/ai/formFill";
import { useLanguage } from "@/dashboard/i18n";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { requestDashboardAiAssist } from "@/dashboard/ai/client";
import type {
  DashboardAiAction,
  DashboardAiEntity,
  DashboardAiFieldDefinition,
  DashboardAiResponse,
} from "@/dashboard/ai/types";

function comparableValue(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

function sameSuggestionValue(current: string, suggested: string) {
  return comparableValue(current) === comparableValue(suggested);
}

function contextStringList(context: Record<string, unknown> | undefined, key: string) {
  const value = context?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function contextSlugs(context: Record<string, unknown> | undefined) {
  const keys = ["existingCategories", "existingBrands"];
  const slugs = new Set<string>();

  for (const key of keys) {
    const value = context?.[key];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const slug = (item as { slug?: unknown }).slug;
      if (typeof slug === "string" && slug.trim()) slugs.add(slug.trim().toLowerCase());
    }
  }

  return slugs;
}

function suggestionIssue({
  field,
  value,
  currentData,
  definition,
  context,
}: {
  field: string;
  value: string;
  currentData: Record<string, string>;
  definition: DashboardAiFieldDefinition;
  context?: Record<string, unknown>;
}) {
  const current = currentData[field] ?? "";
  if (sameSuggestionValue(current, value)) return "No change";

  const trimmed = value.trim();
  if (!trimmed) return "Empty suggestion";
  if (definition.maxLength && trimmed.length > definition.maxLength) {
    return `Exceeds the ${definition.maxLength}-character field limit`;
  }

  if (field === "slug") {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) {
      return "Slug must use lowercase letters, numbers, and single hyphens";
    }
    const currentSlug = current.trim().toLowerCase();
    const candidate = trimmed.toLowerCase();
    if (candidate !== currentSlug && contextSlugs(context).has(candidate)) {
      return "This slug is already used by another catalog entry";
    }
  }

  if (field === "icon") {
    const allowedIcons = contextStringList(context, "allowedIcons");
    if (allowedIcons.length && !allowedIcons.includes(trimmed)) {
      return "Unsupported dashboard icon";
    }
  }

  if (field === "website") {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return "Website must use HTTP(S)";
      }
    } catch {
      return "Website is not a valid URL";
    }
  }

  return "";
}

export default function AiAssistPanel({
  entity,
  query,
  currentData,
  fields,
  context,
  onApply,
  compact = false,
  triggerLabel = "AI Assist",
  showSeoAction = true,
}: {
  entity: DashboardAiEntity;
  query: string;
  currentData: Record<string, string>;
  fields: DashboardAiFieldDefinition[];
  context?: Record<string, unknown>;
  onApply: (patch: Record<string, string>) => void;
  compact?: boolean;
  triggerLabel?: string;
  showSeoAction?: boolean;
}) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [researchQuery, setResearchQuery] = useState(query);
  const [sourceText, setSourceText] = useState("");
  const [fillMode, setFillMode] = useState<"empty" | "all">("empty");
  const [requestError, setRequestError] = useState("");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const requestController = useRef<AbortController | null>(null);
  const requestValues = useRef<Record<string, string> | null>(null);
  const resultFillMode = useRef<"empty" | "all">("empty");
  const [loadingAction, setLoadingAction] = useState<DashboardAiAction | null>(null);
  const [result, setResult] = useState<DashboardAiResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useDashboardModal(() => setOpen(false), open);
  const queryInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const dialogTitleId = useId();

  const openPanel = () => {
    requestIdRef.current += 1;
    setResearchQuery(query);
    setRequestError("");
    requestValues.current = null;
    setLoadingAction(null);
    setResult(null);
    setSelected(new Set());
    setOpen(true);
  };

  useEffect(
    () => () => {
      requestController.current?.abort();
      requestIdRef.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (open) return;
    requestController.current?.abort();
    requestIdRef.current += 1;
    setLoadingAction(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    const frame = window.requestAnimationFrame(() => {
      queryInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      trigger?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      event.stopImmediatePropagation();

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");

      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, loadingAction, panelRef]);

  const fieldMap = useMemo(
    () => new Map(fields.map((field) => [field.key, field] as const)),
    [fields],
  );

  const localIssue = (
    suggestion: DashboardAiResponse["suggestions"][number],
    definition: DashboardAiFieldDefinition,
  ) => {
    if (
      requestValues.current &&
      hasFieldChanged(suggestion.field, requestValues.current, currentData)
    )
      return "This field changed after research. Run the assistant again to avoid overwriting your edits.";
    if (resultFillMode.current === "empty" && (currentData[suggestion.field] ?? "").trim())
      return "Existing value is protected by fill-empty mode.";
    return suggestionIssue({
      field: suggestion.field,
      value: suggestion.value,
      currentData,
      definition,
      context,
    });
  };

  const eligibleSuggestions = (result?.suggestions ?? []).filter((item) => {
    const definition = fieldMap.get(item.field);
    return definition && item.decision !== "block" && !localIssue(item, definition);
  });
  const completion = formCompletion(fields, currentData, eligibleSuggestions, selected);

  const run = async (action: DashboardAiAction) => {
    if (loadingAction) return;
    const requestId = ++requestIdRef.current;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    requestValues.current = { ...currentData };
    resultFillMode.current = action === "research_fill" ? fillMode : "all";
    setLoadingAction(action);
    setRequestError("");
    setResult(null);
    setSelected(new Set());
    setProgress({ completed: 0, total: 0 });
    try {
      const response = await requestDashboardAiAssist(
        {
          entity,
          action,
          query: researchQuery,
          sourceText,
          language: lang,
          fillMode: action === "research_fill" ? fillMode : "all",
          currentData,
          fields,
          context,
        },
        {
          signal: controller.signal,
          onProgress: (completed, total) => {
            if (requestId === requestIdRef.current) setProgress({ completed, total });
          },
        },
      );
      if (requestId !== requestIdRef.current) return;
      setResult(response);
      const safeSuggestions = response.suggestions.filter((suggestion) => {
        const definition = fieldMap.get(suggestion.field);
        return (
          definition &&
          suggestion.decision === "allow" &&
          !definition.review &&
          !localIssue(suggestion, definition)
        );
      });
      setSelected(new Set(safeSuggestions.map((suggestion) => suggestion.field)));
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      if (!controller.signal.aborted)
        setRequestError(cause instanceof Error ? cause.message : "AI assistant failed.");
    } finally {
      if (requestId === requestIdRef.current) setLoadingAction(null);
    }
  };

  const applySelected = () => {
    if (!result) return;
    const patch: Record<string, string> = {};
    for (const suggestion of result.suggestions) {
      if (!selected.has(suggestion.field)) continue;
      const definition = fieldMap.get(suggestion.field);
      if (!definition) continue;
      const issue = localIssue(suggestion, definition);
      if (!issue && suggestion.decision !== "block") {
        patch[suggestion.field] = suggestion.value;
      }
    }
    if (!Object.keys(patch).length) {
      toast.info(t("Select at least one AI suggestion."));
      return;
    }
    onApply(patch);
    toast.success(t("AI suggestions applied to the form. Review them before saving."));
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPanel}
        className={
          compact
            ? "inline-flex h-9 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100"
            : "inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100"
        }
      >
        <Sparkles className="size-3.5" />
        {t(triggerLabel)}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex items-end justify-end bg-slate-950/45 backdrop-blur-[2px]"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                tabIndex={-1}
                dir={lang === "ar" ? "rtl" : "ltr"}
                className="dashboard-theme-scope flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:m-4 sm:max-w-xl sm:rounded-2xl"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-indigo-500">
                      <Sparkles className="size-3.5" />
                      {t("Space Call AI")}
                    </div>
                    <h2
                      id={dialogTitleId}
                      className="mt-1 text-[19px] font-black tracking-[-.03em] text-[#14203a]"
                    >
                      {t("Research, fill and improve")}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {t(
                        "Research & Fill prepares safe draft suggestions. Nothing changes until Apply selected, and nothing is saved until you save the form.",
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("Close AI assistant")}
                    className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 disabled:opacity-50"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                      {t("What should AI research?")}
                    </span>
                    <input
                      ref={queryInputRef}
                      maxLength={500}
                      value={researchQuery}
                      onChange={(event) => {
                        requestIdRef.current += 1;
                        requestController.current?.abort();
                        setResearchQuery(event.target.value);
                        setLoadingAction(null);
                        setResult(null);
                        setSelected(new Set());
                      }}
                      placeholder={t("Exact name or subject of the form")}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[12px] text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </label>

                  <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-bold text-foreground">
                      {t("Source information and specifications")}
                    </span>
                    <textarea
                      aria-label={t("Source information and specifications")}
                      value={sourceText}
                      maxLength={12000}
                      disabled={Boolean(loadingAction)}
                      onChange={(event) => {
                        setSourceText(event.target.value);
                        setResult(null);
                        setSelected(new Set());
                      }}
                      placeholder={t(
                        "Paste the product sheet, model details, specifications, or a brief describing what to fill.",
                      )}
                      className="min-h-32 w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground"
                    />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t("Optional reference text; web research can also be used.")}{" "}
                      <bdi dir="ltr" className="whitespace-nowrap">
                        {sourceText.length.toLocaleString(lang)} / 12,000
                      </bdi>{" "}
                      · {t("Supplied information is shown separately from verified web sources.")}
                    </span>
                  </label>
                  <fieldset className="mt-4 rounded-xl border border-border p-3">
                    <legend className="px-1 text-xs font-bold text-foreground">
                      {t("Research & Fill behavior")}
                    </legend>
                    <div className="flex flex-wrap gap-4">
                      {(["empty", "all"] as const).map((mode) => (
                        <label
                          key={mode}
                          className="flex items-center gap-2 text-xs text-foreground"
                        >
                          <input
                            type="radio"
                            name={`${dialogTitleId}-fill-mode`}
                            value={mode}
                            checked={fillMode === mode}
                            disabled={Boolean(loadingAction)}
                            onChange={() => {
                              setFillMode(mode);
                              setResult(null);
                              setSelected(new Set());
                            }}
                          />
                          {t(
                            mode === "empty"
                              ? "Fill empty fields only"
                              : "Also improve existing fields",
                          )}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div
                    className="mt-4 rounded-xl border border-border bg-card p-3"
                    aria-label={t("Form completeness")}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <strong>{t("Form completeness")}</strong>
                      <span role="status">
                        <bdi dir="ltr">
                          {completion.completed} / {completion.total}
                        </bdi>{" "}
                        {t("fields ready")}
                      </span>
                    </div>
                    <progress
                      max={Math.max(1, completion.total)}
                      value={completion.completed}
                      className="mt-2 h-2 w-full accent-indigo-500"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(
                        "Counts include current values and selected suggestions. Review factual values before saving.",
                      )}{" "}
                      {t("Tracks the content fields supported by this assistant.")}
                    </p>
                  </div>
                  {requestError && (
                    <div
                      role="alert"
                      className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                    >
                      {t(requestError)}
                    </div>
                  )}
                  {loadingAction && (
                    <div
                      role="status"
                      className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Loader2 className="size-4 animate-spin" />
                      {t("Completing all requested fields…")}{" "}
                      {progress.total > 1 ? `${progress.completed} / ${progress.total}` : ""}
                    </div>
                  )}

                  <div
                    className={`mt-3 grid gap-2 ${showSeoAction ? "grid-cols-3" : "grid-cols-2"}`}
                  >
                    <ActionButton
                      label={t("Complete form")}
                      icon={<Search className="size-3.5" />}
                      active={loadingAction === "research_fill"}
                      disabled={Boolean(loadingAction)}
                      onClick={() => void run("research_fill")}
                    />
                    {showSeoAction ? (
                      <ActionButton
                        label={t("Improve SEO")}
                        icon={<WandSparkles className="size-3.5" />}
                        active={loadingAction === "seo"}
                        disabled={Boolean(loadingAction)}
                        onClick={() => void run("seo")}
                      />
                    ) : null}
                    <ActionButton
                      label={t("Validate")}
                      icon={<ShieldCheck className="size-3.5" />}
                      active={loadingAction === "validate"}
                      disabled={Boolean(loadingAction)}
                      onClick={() => void run("validate")}
                    />
                  </div>

                  {result ? (
                    <div className="mt-5 space-y-4">
                      <div
                        className={
                          "rounded-xl border px-3.5 py-3 text-[10px] leading-4 " +
                          (result.grounded
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-amber-100 bg-amber-50 text-amber-800")
                        }
                      >
                        <div className="flex items-center gap-2 font-black">
                          {result.grounded ? (
                            <ShieldCheck className="size-3.5" />
                          ) : (
                            <AlertTriangle className="size-3.5" />
                          )}
                          {result.grounded
                            ? t("Web research grounded")
                            : t("Web grounding unavailable")}
                        </div>
                        {result.summary ? <p className="mt-1">{result.summary}</p> : null}
                      </div>

                      <div
                        className={
                          "rounded-xl border px-3.5 py-3 text-[10px] leading-4 " +
                          (result.entityMatch.status === "exact"
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : result.entityMatch.status === "partial"
                              ? "border-amber-100 bg-amber-50 text-amber-800"
                              : "border-rose-100 bg-rose-50 text-rose-700")
                        }
                      >
                        <div className="flex items-center gap-2 font-black">
                          {result.entityMatch.status === "exact" ? (
                            <ShieldCheck className="size-3.5" />
                          ) : (
                            <AlertTriangle className="size-3.5" />
                          )}
                          {result.entityMatch.status === "exact"
                            ? t("Exact entity verified")
                            : result.entityMatch.status === "partial"
                              ? t("Partial entity match")
                              : t("Entity uncertain")}
                        </div>
                        {result.entityMatch.canonicalName ? (
                          <p className="mt-1 font-bold">{result.entityMatch.canonicalName}</p>
                        ) : null}
                        {result.entityMatch.reason ? (
                          <p className="mt-1 opacity-80">{result.entityMatch.reason}</p>
                        ) : null}
                      </div>

                      {result.warnings.length ? (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3">
                          <div className="text-[10px] font-black text-amber-800">
                            {t("Review warnings")}
                          </div>
                          <ul className="mt-1.5 space-y-1 text-[10px] leading-4 text-amber-700">
                            {result.warnings.map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <button
                          type="button"
                          className="dashboard-button"
                          onClick={() =>
                            setSelected(
                              new Set(
                                eligibleSuggestions
                                  .filter(
                                    (item) =>
                                      item.decision === "allow" &&
                                      !fieldMap.get(item.field)?.review,
                                  )
                                  .map((item) => item.field),
                              ),
                            )
                          }
                        >
                          {t("Select safe suggestions")}
                        </button>
                        <button
                          type="button"
                          className="dashboard-button"
                          onClick={() =>
                            setSelected(new Set(eligibleSuggestions.map((item) => item.field)))
                          }
                        >
                          {t("Select all for review")}
                        </button>
                        <button
                          type="button"
                          className="dashboard-button"
                          onClick={() => setSelected(new Set())}
                        >
                          {t("Clear selection")}
                        </button>
                        <span className="text-muted-foreground">
                          {selected.size} {t("selected")}
                        </span>
                      </div>
                      {completion.missing.length > 0 && (
                        <details className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <summary className="cursor-pointer text-xs font-bold text-amber-800">
                            {t("Fields still needing information")} ({completion.missing.length})
                          </summary>
                          <ul className="mt-2 space-y-2 text-xs text-amber-800">
                            {completion.missing.map((field) => (
                              <li key={field.key}>
                                <strong>{t(field.label)}</strong>
                                <span className="block">
                                  {t(
                                    result.missingFields?.find((item) => item.field === field.key)
                                      ?.reason ||
                                      "Add a reliable source, select a suggestion for review, or enter this value manually.",
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                      <div className="space-y-2">
                        {result.suggestions.map((suggestion) => {
                          const definition = fieldMap.get(suggestion.field);
                          if (!definition) return null;
                          const issue = localIssue(suggestion, definition);
                          const noChange =
                            issue === "No change" ||
                            suggestion.checks.includes(
                              "No meaningful change from the current value",
                            );
                          const blocked = Boolean(issue) || suggestion.decision === "block";
                          const checked = !blocked && selected.has(suggestion.field);
                          const current = currentData[suggestion.field] ?? "";
                          const evidenceSources = result.sources.filter((source) =>
                            suggestion.sourceUrls.includes(source.url),
                          );
                          return (
                            <label
                              key={suggestion.field}
                              data-ai-field={suggestion.field}
                              className={
                                "block rounded-xl border p-3 transition " +
                                (blocked
                                  ? "cursor-default border-slate-200 bg-slate-50/70"
                                  : checked
                                    ? "cursor-pointer border-indigo-200 bg-indigo-50/60"
                                    : "cursor-pointer border-slate-200 bg-white hover:border-slate-300")
                              }
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  aria-label={t(definition.label)}
                                  checked={checked}
                                  disabled={blocked}
                                  onChange={() =>
                                    setSelected((before) => {
                                      const next = new Set(before);
                                      if (next.has(suggestion.field)) next.delete(suggestion.field);
                                      else next.add(suggestion.field);
                                      return next;
                                    })
                                  }
                                  className="mt-1 disabled:opacity-40"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-black text-slate-700">
                                      {t(definition.label)}
                                    </span>
                                    <span
                                      className={
                                        "rounded-full px-2 py-0.5 text-[8px] font-black " +
                                        (noChange
                                          ? "bg-slate-200 text-slate-600"
                                          : suggestion.decision === "allow"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : suggestion.decision === "block"
                                              ? "bg-rose-100 text-rose-700"
                                              : "bg-amber-100 text-amber-700")
                                      }
                                    >
                                      {noChange
                                        ? t("No meaningful change")
                                        : suggestion.decision === "allow"
                                          ? t("Safe to apply")
                                          : suggestion.decision === "block"
                                            ? t("Blocked")
                                            : t("Review")}
                                    </span>
                                    <span
                                      className={
                                        "rounded-full px-2 py-0.5 text-[8px] font-black " +
                                        (suggestion.risk === "high"
                                          ? "bg-rose-50 text-rose-600"
                                          : suggestion.risk === "medium"
                                            ? "bg-amber-50 text-amber-600"
                                            : "bg-slate-100 text-slate-500")
                                      }
                                    >
                                      {suggestion.risk} {t("risk")}
                                    </span>
                                    {!noChange ? (
                                      <span className="text-[9px] font-bold text-slate-400">
                                        {Math.round(suggestion.confidence * 100)}%
                                      </span>
                                    ) : null}
                                  </div>
                                  {current ? (
                                    <div className="mt-1.5 text-[9px] text-slate-400">
                                      {t("Current:")}
                                      <span className="font-semibold">{current}</span>
                                    </div>
                                  ) : null}
                                  <div className="mt-1.5 whitespace-pre-wrap break-words text-[11px] font-semibold leading-5 text-slate-700">
                                    {suggestion.value}
                                  </div>
                                  {suggestion.inputQuote && (
                                    <blockquote className="mt-2 border-s-2 border-indigo-300 ps-2 text-xs text-muted-foreground">
                                      <strong>{t("From supplied information")}</strong>
                                      <p className="mt-1 whitespace-pre-wrap break-words">
                                        {suggestion.inputQuote}
                                      </p>
                                    </blockquote>
                                  )}
                                  {suggestion.reason ? (
                                    <div className="mt-1 text-[9px] leading-4 text-slate-400">
                                      {suggestion.reason}
                                    </div>
                                  ) : null}
                                  {evidenceSources.length ? (
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                      {evidenceSources.map((source) => (
                                        <a
                                          key={source.url}
                                          href={source.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(event) => event.stopPropagation()}
                                          className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-1.5 py-1 text-[8px] font-bold text-emerald-700"
                                        >
                                          {t("Evidence")} {source.official ? t(" · Official") : ""}
                                          <ExternalLink className="size-2.5" />
                                        </a>
                                      ))}
                                    </div>
                                  ) : null}
                                  {suggestion.checks.length ? (
                                    <ul className="mt-1.5 space-y-0.5 text-[9px] leading-4 text-slate-500">
                                      {suggestion.checks.map((check, index) => (
                                        <li key={index}>• {check}</li>
                                      ))}
                                    </ul>
                                  ) : null}
                                  {issue && !noChange ? (
                                    <div className="mt-1 text-[9px] font-bold text-rose-600">
                                      {issue} {t(". This suggestion cannot be applied.")}
                                    </div>
                                  ) : null}
                                  {definition.review ? (
                                    <div className="mt-1 text-[9px] font-bold text-amber-600">
                                      {t("This field always requires manual review.")}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                        {!result.suggestions.length ? (
                          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-[10px] text-slate-400">
                            {t("No field changes were suggested.")}
                          </div>
                        ) : null}
                      </div>

                      {result.sources.length ? (
                        <div>
                          <div className="mb-2 text-[10px] font-black uppercase tracking-[.12em] text-slate-400">
                            {t("Research sources")}
                          </div>
                          <div className="space-y-1.5">
                            {result.sources.slice(0, 8).map((source, index) => (
                              <a
                                key={source.url + index}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-600 hover:border-indigo-100 hover:text-indigo-700"
                              >
                                <span className="min-w-0 truncate">
                                  {source.title || source.url}
                                </span>
                                <span className="flex shrink-0 items-center gap-1.5 text-[8px] font-black">
                                  {source.official ? (
                                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                                      {t("Official")}
                                    </span>
                                  ) : null}
                                  <span className="text-slate-400">
                                    {Math.round(source.quality * 100)}%
                                  </span>
                                  <ExternalLink className="size-3" />
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4">
                  <div className="text-[11px] leading-5 text-slate-400">
                    {t(
                      "Apply selected changes draft fields only. Save remains manual; stock, price, permissions, and order state stay protected.",
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={applySelected}
                    disabled={
                      !result ||
                      !eligibleSuggestions.some((item) => selected.has(item.field)) ||
                      Boolean(loadingAction)
                    }
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[10px] font-bold text-white disabled:opacity-40"
                  >
                    <Check className="size-3.5" />
                    {t("Apply selected")} (
                    {eligibleSuggestions.filter((item) => selected.has(item.field)).length})
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ActionButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-center text-[11px] font-black text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
    >
      {active ? <Loader2 className="size-3.5 animate-spin text-indigo-600" /> : icon}
      {t(label)}
    </button>
  );
}
