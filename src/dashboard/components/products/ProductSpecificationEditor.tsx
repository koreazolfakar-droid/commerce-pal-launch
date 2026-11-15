import { useState } from "react";
import { useLanguage } from "@/dashboard/i18n";
import AiAssistPanel from "@/dashboard/components/ai/AiAssistPanel";
import ProductSpecificationImportPanel from "@/dashboard/components/products/ProductSpecificationImportPanel";
import { specificationFieldSuggestions } from "@/lib/specificationPresets";
import {
  aiSpecificationFieldKey,
  specificationKeyFromAiField,
  validateSpecificationValue,
  type ProductSpecificationField,
  type ProductSpecificationTemplate,
  type ProductSpecificationValues,
} from "@/lib/productSpecifications";

function aiField(field: ProductSpecificationField, section?: string, sectionAr?: string) {
  return {
    key: aiSpecificationFieldKey(field.key),
    label: field.label,
    section,
    sectionAr,
    unit: field.unit,
    description: [
      "Exact factual product specification for this category field.",
      field.unit ? `Expected unit or format: ${field.unit}.` : "",
      "Return only the value, not the field label. Do not infer uncertain values.",
    ]
      .filter(Boolean)
      .join(" "),
    review: true,
    maxLength: 500,
  };
}

export default function ProductSpecificationEditor({
  template,
  values,
  query,
  aiContext,
  aiGeneratedKeys,
  onChange,
  onAiApply,
}: {
  template: ProductSpecificationTemplate;
  values: ProductSpecificationValues;
  query: string;
  aiContext?: Record<string, unknown>;
  aiGeneratedKeys: ReadonlySet<string>;
  onChange: (key: string, value: string) => void;
  onAiApply: (values: Record<string, string>) => void;
}) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [showScopedAi, setShowScopedAi] = useState(false);
  const [specSearch, setSpecSearch] = useState("");
  const [fieldView, setFieldView] = useState<"all" | "missing" | "filled">("all");
  const fields = template.sections.flatMap((section) => section.fields);
  const completedCount = fields.filter((field) => Boolean(values[field.key]?.trim())).length;
  const completionPercent = fields.length ? Math.round(100 * completedCount / fields.length) : 0;
  const normalizedSearch = specSearch.normalize("NFKC").trim().toLocaleLowerCase();
  const visibleSections = template.sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) =>
        (fieldView === "all" ||
          (fieldView === "missing" ? !values[field.key]?.trim() : Boolean(values[field.key]?.trim()))) &&
        (!normalizedSearch ||
          [field.label, field.labelAr, field.key, field.unit]
            .some((text) => text?.toLocaleLowerCase().includes(normalizedSearch))),
      ),
    }))
    .filter((section) => section.fields.length);
  if (!fields.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-[10px] text-slate-400">
        {ar
          ? "اختر تصنيفًا يحتوي على قالب مواصفات لإدارة المواصفات المنظمة."
          : "Select a category with a specification template to manage structured product specifications."}
      </div>
    );
  }

  const currentData = Object.fromEntries(
    fields.map((field) => [aiSpecificationFieldKey(field.key), values[field.key] ?? ""]),
  );
  const context = {
    ...aiContext,
    specKeys: fields.map((field) => field.key),
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold text-slate-700">
            {ar ? "مواصفات مرتبطة بالتصنيف" : "Category-aware specifications"}
          </div>
          <p className="mt-1 max-w-xl text-[10px] leading-4 text-slate-400">
            {ar
              ? "يتم حفظ الحقول المعرفة ضمن التصنيف فقط. تبقى قيم الذكاء الاصطناعي مقترحات للمراجعة حتى الحفظ."
              : "Only fields defined by the selected category are saved. AI values are suggestions and remain marked for review until you save."}
          </p>
        </div>
        <AiAssistPanel
          entity="product"
          query={query}
          currentData={currentData}
          fields={template.sections.flatMap((section) =>
            section.fields.map((field) => aiField(field, section.title, section.titleAr))
          )}
          context={context}
          onApply={onAiApply}
          triggerLabel={ar ? "تعبئة المواصفات بالذكاء الاصطناعي" : "AI Fill Specifications"}
          showSeoAction={false}
          compact
        />
      </div>

      <details className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60" onToggle={(event) => setShowScopedAi(event.currentTarget.open)}>
        <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-slate-600">
          {ar ? "خيارات AI متقدمة للأقسام والحقول" : "Advanced AI tools for sections and individual fields"}
        </summary>
        {showScopedAi ? (
          <div className="space-y-4 border-t border-slate-200 p-3">
            {template.sections.map((section) => (
              <div key={section.title} className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">{ar ? section.titleAr || section.title : section.title}</p>
                <AiAssistPanel
                  entity="product"
                  query={query}
                  currentData={Object.fromEntries(section.fields.map((field) => [
                    aiSpecificationFieldKey(field.key), values[field.key] ?? "",
                  ]))}
                  fields={section.fields.map((field) => aiField(field, section.title, section.titleAr))}
                  context={{ ...aiContext, specKeys: section.fields.map((field) => field.key) }}
                  onApply={onAiApply}
                  triggerLabel={ar ? "AI للقسم" : "AI Section"}
                  showSeoAction={false}
                  compact
                />
                <div className="flex flex-wrap gap-2">
                  {section.fields.map((field) => (
                    <AiAssistPanel
                      key={field.key}
                      entity="product"
                      query={query}
                      currentData={{ [aiSpecificationFieldKey(field.key)]: values[field.key] ?? "" }}
                      fields={[aiField(field, section.title, section.titleAr)]}
                      context={{ ...aiContext, specKeys: [field.key] }}
                      onApply={onAiApply}
                      triggerLabel={ar ? field.labelAr || field.label : field.label}
                      showSeoAction={false}
                      compact
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </details>

      <ProductSpecificationImportPanel template={template} values={values} onChange={onChange} />
      <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-100">
            {ar ? "اكتمال المواصفات" : "Specification completion"}
          </span>
          <span className="text-xs font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
            {completedCount}/{fields.length} · {completionPercent}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={ar ? "اكتمال المواصفات" : "Specification completion"}
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={fields.length}
          className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-[width]"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="text-[11px] leading-5 text-slate-600 dark:text-slate-300">
          {ar
            ? "املأ المواصفات المؤكدة فقط. الاقتراحات خيارات جاهزة وليست حقائق عن الجهاز، ولا يُشترط اكتمال كل الحقول لحفظ المسودة."
            : "Enter only verified facts. Suggested choices are not model facts, and all fields need not be filled to save a draft."}
        </p>
        <input
          type="search"
          value={specSearch}
          onChange={(event) => setSpecSearch(event.target.value)}
          placeholder={ar ? "ابحث عن مواصفة..." : "Find a specification..."}
          aria-label={ar ? "البحث في حقول المواصفات" : "Search specification fields"}
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label={ar ? "تصفية حقول المواصفات" : "Filter specification fields"}>
          {([
            ["all", ar ? "الكل" : "All"],
            ["missing", ar ? "الناقصة" : "Missing"],
            ["filled", ar ? "المعبّأة" : "Filled"],
          ] as const).map(([mode, label]) => (
            <button
              type="button"
              key={mode}
              aria-pressed={fieldView === mode}
              onClick={() => setFieldView(mode)}
              className={
                "h-9 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-primary " +
                (fieldView === mode
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted")
              }
            >
              {label}
              {mode === "missing" ? " (" + (fields.length - completedCount) + ")" :
                mode === "filled" ? " (" + completedCount + ")" : ""}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {visibleSections.map((section) => {

          return (
            <section
              key={section.title}
              className="overflow-hidden rounded-xl border border-slate-200"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-100">
                  {ar ? section.titleAr || section.title : section.title}
                </div>
                <span className="text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-300">
                  {section.fields.filter((field) => values[field.key]?.trim()).length}/{section.fields.length}
                </span>
              </div>

              <div className="grid gap-3 p-3.5 sm:grid-cols-2">
                {section.fields.map((field) => {
                  const generated = aiGeneratedKeys.has(field.key);
                  const issue = validateSpecificationValue(field, values[field.key] ?? "");
                  return (
                    <label key={field.key} className="block min-w-0">
                      <span className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                          {ar ? field.labelAr || field.label : field.label}
                          {field.unit ? (
                            <span className="ms-1 font-medium text-slate-400">({field.unit})</span>
                          ) : null}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {generated ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-black text-amber-700">

                              {ar ? "AI · مراجعة" : "AI · review"}
                            </span>
                          ) : null}

                        </span>
                      </span>
                      <input
                        aria-label={ar ? field.labelAr || field.label : field.label}
                        aria-invalid={Boolean(issue)}
                        list={specificationFieldSuggestions(field.key).length ? `spec-suggestions-${field.key}` : undefined}
                        maxLength={500}
                        value={values[field.key] ?? ""}
                        onChange={(event) => onChange(field.key, event.target.value)}
                        placeholder={
                          field.unit
                            ? `${ar ? "مثال" : "e.g."} ${field.unit}`
                            : ar
                              ? "أدخل قيمة مؤكدة"
                              : "Enter verified value"
                        }
                        className={
                          "h-10 w-full rounded-xl border bg-white px-3 text-[11px] text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 " +
                          (generated ? "border-amber-300 dark:border-amber-600" : "border-slate-200 dark:border-slate-600") +
                          " dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
                        }
                      />
                      {issue ? (
                        <span role="alert" className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">
                          {ar ? "تحقق من تنسيق القيمة ووحدة القياس قبل الحفظ." : issue}
                        </span>
                      ) : null}
                      {specificationFieldSuggestions(field.key).length > 0 ? (
                        <datalist id={`spec-suggestions-${field.key}`}>
                          {specificationFieldSuggestions(field.key).map((suggestion) => (
                            <option key={suggestion} value={suggestion} />
                          ))}
                        </datalist>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
        {visibleSections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {ar ? "لا توجد حقول ضمن التصفية الحالية." : "No fields match the current filter."}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function extractSpecificationAiPatch(values: Record<string, string>) {
  const result: ProductSpecificationValues = {};
  for (const [field, value] of Object.entries(values)) {
    const key = specificationKeyFromAiField(field);
    if (key) result[key] = value;
  }
  return result;
}
