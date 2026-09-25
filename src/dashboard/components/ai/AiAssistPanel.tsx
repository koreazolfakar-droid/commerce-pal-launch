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

export default function AiAssistPanel({
  entity,
  query,
  currentData,
  fields,
  context,
  onApply,
  compact = false,
}: {
  entity: DashboardAiEntity;
  query: string;
  currentData: Record<string, string>;
  fields: DashboardAiFieldDefinition[];
  context?: Record<string, unknown>;
  onApply: (patch: Record<string, string>) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [researchQuery, setResearchQuery] = useState(query);
  const [loadingAction, setLoadingAction] = useState<DashboardAiAction | null>(null);
  const [result, setResult] = useState<DashboardAiResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const dialogTitleId = useId();

  useEffect(() => {
    if (!open) return;
    requestIdRef.current += 1;
    setResearchQuery(query);
    setLoadingAction(null);
    setResult(null);
    setSelected(new Set());
  }, [open, query]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      queryInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      triggerRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!loadingAction) setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

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

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loadingAction]);

  const fieldMap = useMemo(
    () => new Map(fields.map((field) => [field.key, field] as const)),
    [fields],
  );

  const run = async (action: DashboardAiAction) => {
    if (loadingAction) return;
    const requestId = ++requestIdRef.current;
    setLoadingAction(action);
    try {
      const response = await requestDashboardAiAssist({
        entity,
        action,
        query: researchQuery,
        currentData,
        fields,
        context,
      });
      if (requestId !== requestIdRef.current) return;
      setResult(response);
      const safeSuggestions = response.suggestions.filter((suggestion) => {
        const definition = fieldMap.get(suggestion.field);
        return (
          definition &&
          !definition.review &&
          suggestion.value.trim().length > 0 &&
          suggestion.confidence >= 0.5
        );
      });
      setSelected(new Set(safeSuggestions.map((suggestion) => suggestion.field)));

      if (action === "research_fill" && safeSuggestions.length) {
        const patch = Object.fromEntries(
          safeSuggestions.map((suggestion) => [suggestion.field, suggestion.value]),
        );
        onApply(patch);
        toast.success(
          `${safeSuggestions.length} safe AI field${safeSuggestions.length === 1 ? "" : "s"} filled. Review before saving.`,
        );
      }
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      toast.error(cause instanceof Error ? cause.message : "AI assistant failed.");
    } finally {
      if (requestId === requestIdRef.current) setLoadingAction(null);
    }
  };

  const applySelected = () => {
    if (!result) return;
    const patch: Record<string, string> = {};
    for (const suggestion of result.suggestions) {
      if (selected.has(suggestion.field)) patch[suggestion.field] = suggestion.value;
    }
    if (!Object.keys(patch).length) {
      toast.info("Select at least one AI suggestion.");
      return;
    }
    onApply(patch);
    toast.success("AI suggestions applied to the form. Review them before saving.");
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex h-9 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100"
            : "inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100"
        }
      >
        <Sparkles className="size-3.5" />
        AI Assist
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex items-end justify-end bg-slate-950/45 backdrop-blur-[2px]"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loadingAction) setOpen(false);
              }}
            >
              <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                tabIndex={-1}
                className="flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:m-4 sm:max-w-xl sm:rounded-2xl"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-indigo-500">
                      <Sparkles className="size-3.5" />
                      Space Call AI
                    </div>
                    <h2
                      id={dialogTitleId}
                      className="mt-1 text-[19px] font-black tracking-[-.03em] text-[#14203a]"
                    >
                      Research, fill and improve
                    </h2>
                    <p className="mt-1 text-[10px] leading-4 text-slate-400">
                      Research & Fill updates safe draft fields automatically. Nothing is saved until you save the form.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={Boolean(loadingAction)}
                    aria-label="Close AI assistant"
                    className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 disabled:opacity-50"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                      What should AI research?
                    </span>
                    <input
                      ref={queryInputRef}
                      value={researchQuery}
                      onChange={(event) => {
                        requestIdRef.current += 1;
                        setResearchQuery(event.target.value);
                        setLoadingAction(null);
                        setResult(null);
                        setSelected(new Set());
                      }}
                      placeholder="Exact product, category or brand name"
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[12px] text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </label>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <ActionButton
                      label="Research & Fill"
                      icon={<Search className="size-3.5" />}
                      active={loadingAction === "research_fill"}
                      disabled={Boolean(loadingAction)}
                      onClick={() => void run("research_fill")}
                    />
                    <ActionButton
                      label="Improve SEO"
                      icon={<WandSparkles className="size-3.5" />}
                      active={loadingAction === "seo"}
                      disabled={Boolean(loadingAction)}
                      onClick={() => void run("seo")}
                    />
                    <ActionButton
                      label="Validate"
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
                          {result.grounded ? "Web research grounded" : "Web grounding unavailable"}
                        </div>
                        {result.summary ? <p className="mt-1">{result.summary}</p> : null}
                      </div>

                      {result.warnings.length ? (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3">
                          <div className="text-[10px] font-black text-amber-800">Review warnings</div>
                          <ul className="mt-1.5 space-y-1 text-[10px] leading-4 text-amber-700">
                            {result.warnings.map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        {result.suggestions.map((suggestion) => {
                          const definition = fieldMap.get(suggestion.field);
                          if (!definition) return null;
                          const checked = selected.has(suggestion.field);
                          const current = currentData[suggestion.field] ?? "";
                          return (
                            <label
                              key={suggestion.field}
                              className={
                                "block cursor-pointer rounded-xl border p-3 transition " +
                                (checked
                                  ? "border-indigo-200 bg-indigo-50/60"
                                  : "border-slate-200 bg-white hover:border-slate-300")
                              }
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setSelected((before) => {
                                      const next = new Set(before);
                                      if (next.has(suggestion.field)) next.delete(suggestion.field);
                                      else next.add(suggestion.field);
                                      return next;
                                    })
                                  }
                                  className="mt-1"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-black text-slate-700">
                                      {definition.label}
                                    </span>
                                    <span
                                      className={
                                        "rounded-full px-2 py-0.5 text-[8px] font-black " +
                                        (suggestion.verified
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-amber-100 text-amber-700")
                                      }
                                    >
                                      {suggestion.verified ? "Verified" : "Review"}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400">
                                      {Math.round(suggestion.confidence * 100)}%
                                    </span>
                                  </div>
                                  {current ? (
                                    <div className="mt-1.5 text-[9px] text-slate-400">
                                      Current: <span className="font-semibold">{current}</span>
                                    </div>
                                  ) : null}
                                  <div className="mt-1.5 whitespace-pre-wrap break-words text-[11px] font-semibold leading-5 text-slate-700">
                                    {suggestion.value}
                                  </div>
                                  {suggestion.reason ? (
                                    <div className="mt-1 text-[9px] leading-4 text-slate-400">
                                      {suggestion.reason}
                                    </div>
                                  ) : null}
                                  {definition.review ? (
                                    <div className="mt-1 text-[9px] font-bold text-amber-600">
                                      This field always requires manual review.
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                        {!result.suggestions.length ? (
                          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-[10px] text-slate-400">
                            No field changes were suggested.
                          </div>
                        ) : null}
                      </div>

                      {result.sources.length ? (
                        <div>
                          <div className="mb-2 text-[10px] font-black uppercase tracking-[.12em] text-slate-400">
                            Research sources
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
                                <span className="truncate">{source.title || source.url}</span>
                                <ExternalLink className="size-3 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4">
                  <div className="text-[9px] leading-4 text-slate-400">
                    AI never changes stock, price, permissions, or order state.
                  </div>
                  <button
                    type="button"
                    onClick={applySelected}
                    disabled={!result || !selected.size || Boolean(loadingAction)}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[10px] font-bold text-white disabled:opacity-40"
                  >
                    <Check className="size-3.5" />
                    Apply selected
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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-center text-[9px] font-black text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
    >
      {active ? <Loader2 className="size-3.5 animate-spin text-indigo-600" /> : icon}
      {label}
    </button>
  );
}
