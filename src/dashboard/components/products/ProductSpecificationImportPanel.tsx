import { useMemo, useState } from "react";
import { ClipboardCopy, ClipboardPaste, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";
import {
  exportSpecifications,
  parseSpecificationImport,
  specificationImportPatch,
} from "@/lib/specificationImport";
import {
  validateSpecificationValue,
  type ProductSpecificationTemplate,
  type ProductSpecificationValues,
} from "@/lib/productSpecifications";

export default function ProductSpecificationImportPanel({
  template,
  values,
  onChange,
}: {
  template: ProductSpecificationTemplate;
  values: ProductSpecificationValues;
  onChange: (key: string, value: string) => void;
}) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [expanded, setExpanded] = useState(false);
  const [source, setSource] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [showManualCopy, setShowManualCopy] = useState(false);

  const preview = useMemo(
    () => parseSpecificationImport(source, template),
    [source, template],
  );
  const fields = useMemo(
    () => new Map(template.sections.flatMap((section) => section.fields.map((field) => [field.key, field] as const))),
    [template],
  );
  const validation = useMemo(
    () => new Map(preview.matches.map((match) => [
      match.key,
      validateSpecificationValue(fields.get(match.key)!, match.value),
    ] as const)),
    [preview, fields],
  );
  const selectedPreview = {
    ...preview,
    matches: preview.matches.filter((entry) => !excluded.has(entry.key) && !validation.get(entry.key)),
  };
  const patch = specificationImportPatch(selectedPreview, values, overwrite);
  const eligibleCount = Object.keys(patch).length;
  const invalidCount = [...validation.values()].filter(Boolean).length;
  const conflictingCount = preview.matches.filter((entry) => values[entry.key]?.trim() && values[entry.key]?.trim() !== entry.value).length;
  const exported = exportSpecifications(template, values, ar);

  const apply = () => {
    if (!eligibleCount) return;
    for (const [key, value] of Object.entries(patch)) onChange(key, value);
    setMessage(ar
      ? "تمت إضافة " + eligibleCount + " مواصفات للنموذج. راجعها ثم احفظ المنتج."
      : "Applied " + eligibleCount + " specifications to the form. Review them, then save the product.");
    setSource("");
    setExcluded(new Set());
    setExpanded(false);
    setOverwrite(false);
  };
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(exported);
      setShowManualCopy(false);
      setMessage(ar ? "تم نسخ المواصفات المكتملة." : "Filled specifications copied.");
    } catch {
      setShowManualCopy(true);
      setMessage(ar
        ? "النسخ التلقائي غير متاح على هذا الجهاز. انسخ النص أدناه يدوياً."
        : "Automatic clipboard access is unavailable. Select and copy the text below.");
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">
            {ar ? "أدوات المواصفات الاحترافية" : "Specification workspace"}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {ar
              ? "الصق مواصفات مكتوبة أو جدولاً من ورقة بيانات، راجع التطابقات ثم طبّق ما تختاره."
              : "Paste a datasheet or key/value table, review matched fields, then apply your selection."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setExpanded((open) => !open); setMessage(""); }}
            aria-expanded={expanded}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 text-xs font-semibold text-foreground hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ClipboardPaste className="size-4 text-primary" aria-hidden="true" />
            {ar ? "استيراد من نص" : "Smart paste"}
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            disabled={!exported}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ClipboardCopy className="size-4" aria-hidden="true" />
            {ar ? "نسخ المعبّأ" : "Copy filled"}
          </button>
        </div>
      </div>
      {message ? <p role="status" className="mt-2 flex items-center gap-2 text-xs text-foreground"><CheckCircle2 className="size-4 text-primary" aria-hidden="true" />{message}</p> : null}
      {showManualCopy && exported ? (
        <div className="mt-3 space-y-1">
          <label htmlFor="spacecall-spec-copy-text" className="text-xs font-medium text-foreground">
            {ar ? "نسخة نصية قابلة للتحديد" : "Selectable specification text"}
          </label>
          <textarea
            id="spacecall-spec-copy-text"
            readOnly
            rows={5}
            dir="auto"
            value={exported}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground"
          />
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <label className="block text-xs font-semibold text-foreground" htmlFor="spacecall-spec-import">
            {ar ? "المواصفات المراد استيرادها" : "Specifications to import"}
          </label>
          <textarea
            id="spacecall-spec-import"
            dir="auto"
            rows={6}
            maxLength={24_000}
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setExcluded(new Set());
              setMessage("");
            }}
            placeholder={ar
              ? "حجم الشاشة: 6.7\nالذاكرة العشوائية: 12 GB\nسعة البطارية: 5000 mAh"
              : "Screen size: 6.7\nRAM: 12 GB\nBattery capacity: 5000 mAh"}
            className="w-full resize-y rounded-lg border border-border bg-background p-3 text-xs leading-6 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <p className="text-[11px] leading-5 text-muted-foreground">
            {ar
              ? "مدعوم: الاسم: القيمة، الاسم = القيمة، جداول Excel ذات عمودين أو ثلاثة، وجداول Markdown. يمكن استخدام أسماء شائعة للمواصفات؛ يجب التحقق من القيم قبل حفظ المنتج."
              : "Supports label: value, label = value, 2- or 3-column Excel/TSV and Markdown tables. Common aliases are recognized, but values must be verified before saving."}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span aria-live="polite">
              {ar ? "مطابق" : "Matched"}: {preview.matches.length}
              {" · "}
              {ar ? "غير مطابق" : "Skipped"}: {preview.skipped.length}
              {" · "}
              {ar ? "قابل للتطبيق" : "Ready to apply"}: {eligibleCount}
            </span>
            {conflictingCount > 0 ? (
              <label className="flex cursor-pointer items-center gap-2 text-foreground">
                <input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} />
                {ar ? "السماح باستبدال القيم الموجودة" : "Allow replacing filled values"}
              </label>
            ) : null}
          </div>
          {preview.truncated ? (
            <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">
              {ar ? "النص طويل. تتم معالجة أول 160 سطراً أو 24,000 حرف فقط." : "Input exceeds limits; only the first 160 lines or 24,000 characters are processed."}
            </p>
          ) : null}
          {invalidCount > 0 ? (
            <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">
              {ar ? "بعض القيم لا توافق تنسيق الوحدة ولن تُطبق." : "Some values fail the field's unit validation and will not be applied."}
            </p>
          ) : null}

          {preview.matches.length > 0 ? (
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
              {preview.matches.map((entry) => {
                const conflict = Boolean(values[entry.key]?.trim() && values[entry.key]?.trim() !== entry.value);
                const changed = values[entry.key]?.trim() !== entry.value;
                const invalid = validation.get(entry.key);
                const selected = !excluded.has(entry.key);
                return (
                  <label key={entry.key} className="flex min-w-0 items-start gap-3 rounded-md bg-muted/40 p-2.5">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => setExcluded((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.delete(entry.key);
                        else next.add(entry.key);
                        return next;
                      })}
                      className="mt-1 shrink-0"
                      aria-label={(ar ? "استيراد " : "Import ") + (ar ? entry.labelAr || entry.label : entry.label)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold text-foreground">{ar ? entry.labelAr || entry.label : entry.label}</span>
                      {conflict ? <span className="block break-words text-[11px] text-muted-foreground">{ar ? "الحالي: " : "Current: "}{values[entry.key]}</span> : null}
                      <span className="block break-words text-xs text-foreground">{ar ? "الجديد: " : "New: "}{entry.value}</span>
                      {invalid ? <span className="block text-[11px] text-amber-700 dark:text-amber-300">{invalid}</span> :
                        !changed ? <span className="block text-[11px] text-muted-foreground">{ar ? "مطابق للقيمة الحالية" : "Already up to date"}</span> :
                        conflict && !overwrite ? <span className="block text-[11px] text-amber-700 dark:text-amber-300">{ar ? "لن يستبدل إلا بعد تفعيل الخيار" : "Existing value protected"}</span> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}

          {preview.skipped.length > 0 ? (
            <details className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer text-foreground">{ar ? "عرض الأسطر غير المطابقة" : "View unmatched / skipped lines"} ({preview.skipped.length})</summary>
              <ul className="mt-2 max-h-36 list-inside list-disc overflow-y-auto space-y-1">
                {preview.skipped.map((entry) => (
                  <li key={entry.line} className="break-words">
                    {ar ? "سطر " : "Line "}{entry.line}: {entry.label} ({entry.reason})
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="h-10 rounded-lg border border-border px-4 text-xs font-semibold text-foreground"
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!eligibleCount}
              className="h-10 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ar ? "تطبيق " : "Apply "}{eligibleCount} {ar ? "مواصفات" : "fields"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
