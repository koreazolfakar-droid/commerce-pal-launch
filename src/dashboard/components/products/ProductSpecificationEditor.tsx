import { Sparkles } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";
import AiAssistPanel from "@/dashboard/components/ai/AiAssistPanel";
import {
  aiSpecificationFieldKey,
  specificationKeyFromAiField,
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
  const fields = template.sections.flatMap((section) => section.fields);
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

      <div className="space-y-4">
        {template.sections.map((section) => {
          const sectionCurrentData = Object.fromEntries(
            section.fields.map((field) => [
              aiSpecificationFieldKey(field.key),
              values[field.key] ?? "",
            ]),
          );

          return (
            <section
              key={section.title}
              className="overflow-hidden rounded-xl border border-slate-200"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-3.5 py-3">
                <div className="text-[10px] font-black uppercase tracking-[.1em] text-slate-500">
                  {ar ? section.titleAr || section.title : section.title}
                </div>
                <AiAssistPanel
                  entity="product"
                  query={query}
                  currentData={sectionCurrentData}
                  fields={section.fields.map((field) => aiField(field, section.title, section.titleAr))}
                  context={{
                    ...aiContext,
                    specKeys: section.fields.map((field) => field.key),
                  }}
                  onApply={onAiApply}
                  triggerLabel={ar ? "AI للقسم" : "AI Section"}
                  showSeoAction={false}
                  compact
                />
              </div>

              <div className="grid gap-3 p-3.5 sm:grid-cols-2">
                {section.fields.map((field) => {
                  const aiKey = aiSpecificationFieldKey(field.key);
                  const generated = aiGeneratedKeys.has(field.key);
                  return (
                    <label key={field.key} className="block min-w-0">
                      <span className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-600">
                          {ar ? field.labelAr || field.label : field.label}
                          {field.unit ? (
                            <span className="ms-1 font-medium text-slate-400">({field.unit})</span>
                          ) : null}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {generated ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-black text-amber-700">
                              <Sparkles className="size-2.5" />
                              {ar ? "AI · مراجعة" : "AI · review"}
                            </span>
                          ) : null}
                          <AiAssistPanel
                            entity="product"
                            query={query}
                            currentData={{ [aiKey]: values[field.key] ?? "" }}
                            fields={[aiField(field, section.title, section.titleAr)]}
                            context={{ ...aiContext, specKeys: [field.key] }}
                            onApply={onAiApply}
                            triggerLabel="AI"
                            showSeoAction={false}
                            compact
                          />
                        </span>
                      </span>
                      <input
                        aria-label={field.label}
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
                          (generated ? "border-amber-200" : "border-slate-200")
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
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
