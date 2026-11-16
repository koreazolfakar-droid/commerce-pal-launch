import { useState } from "react";
import { mergeSpecificationTemplates } from "@/lib/specificationTemplateMerge";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";
import {
  normalizeSpecificationKey,
  type ProductSpecificationTemplate,
} from "@/lib/productSpecifications";
import {
  SPECIFICATION_PRESETS,
  copySpecificationPreset,
  recommendSpecificationPreset,
  specificationPresetById,
} from "@/lib/specificationPresets";

function nextFieldKey(label: string, used: Set<string>) {
  const base = normalizeSpecificationKey(label) || "field";
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

export default function CategorySpecificationTemplateEditor({
  value,
  onChange,
  categorySlug,
  categoryName,
}: {
  value: ProductSpecificationTemplate;
  onChange: (value: ProductSpecificationTemplate) => void;
  categorySlug?: string;
  categoryName?: string;
}) {
  const { lang, t } = useLanguage();
  const ar = lang === "ar";
  const template = value;
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetMessage, setPresetMessage] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);
  const recommended = recommendSpecificationPreset(categorySlug || "") ??
    recommendSpecificationPreset(categoryName || "");
  const effectivePresetId = selectedPresetId || recommended?.id || "";
  const chosenPreset = specificationPresetById(effectivePresetId);
  const mergePreview = chosenPreset ? mergeSpecificationTemplates(template, chosenPreset.template) : null;
  const addMissingFields = () => {
    if (!mergePreview?.added) return;
    onChange(mergePreview.template);
    setPresetMessage(ar
      ? "أُضيف " + mergePreview.added + " حقل بدون تغيير الحقول الحالية. احفظ التصنيف لاعتمادها."
      : "Added " + mergePreview.added + " fields without replacing existing definitions. Save the category to persist.");
  };
  const applyPreset = () => {
    const preset = specificationPresetById(effectivePresetId);
    if (!preset) return;
    const existingFields = template.sections.flatMap((item) => item.fields);
    if (existingFields.length && !window.confirm(
      ar
        ? "استبدال القالب الحالي؟ قد تصبح بعض المواصفات القديمة مخفية عن المتجر. لن تُحذف قيم المنتجات المحفوظة."
        : "Replace the current template? Some existing specifications may no longer display in the storefront. Saved product values will not be deleted.",
    )) return;
    onChange(copySpecificationPreset(preset));
    setPresetMessage(ar ? "تم تجهيز القالب. احفظ التصنيف لاعتماده." : "Template prepared. Save the category to persist it.");
  };

  const commit = (next: ProductSpecificationTemplate) => {
    onChange(next);
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= template.sections.length) return;
    const sections = [...template.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    commit({ sections });
  };
  const moveField = (sectionIndex: number, fieldIndex: number, direction: -1 | 1) => {
    const sections = [...template.sections];
    const section = sections[sectionIndex];
    const target = fieldIndex + direction;
    if (target < 0 || target >= section.fields.length) return;
    const fields = [...section.fields];
    [fields[fieldIndex], fields[target]] = [fields[target], fields[fieldIndex]];
    sections[sectionIndex] = { ...section, fields };
    commit({ sections });
  };

  const addSection = () => {
    if (template.sections.length >= 16) return;
    const index = template.sections.length + 1;
    const used = new Set(
      template.sections.flatMap((section) => section.fields.map((field) => field.key)),
    );
    const key = nextFieldKey(`field ${index}`, used);
    commit({
      sections: [
        ...template.sections,
        {
          title: `Specifications ${index}`,
          titleAr: `المواصفات ${index}`,
          fields: [{ key, label: "New field", labelAr: "حقل جديد" }],
        },
      ],
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black text-slate-700">
            {ar ? "قالب المواصفات" : t("Specification template")}
          </div>
          <p className="mt-1 max-w-xl text-[10px] leading-4 text-slate-400">
            {ar
              ? "تظهر هذه الحقول تلقائيًا في المنتجات التابعة لهذا التصنيف وتحدد أقسام المواصفات في المتجر."
              : t(
                  "These fields appear automatically in products assigned to this category and define the storefront specification sections.",
                )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={showTechnical}
            onClick={() => setShowTechnical((previous) => !previous)}
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {showTechnical ? (ar ? "إخفاء المعرّفات" : "Hide field IDs") : (ar ? "خيارات تقنية" : "Technical options")}
          </button>
          <button
            type="button"
            onClick={addSection}
            disabled={template.sections.length >= 16}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 text-[10px] font-bold text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-300"
          >
            <Plus className="size-3.5" />
            {ar ? "إضافة قسم" : t("Add section")}
          </button>
        </div>
      </div>

      {showTechnical ? (
        <p role="note" className="mt-3 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          {ar
            ? "معرّف الحقل يربط المواصفات بالمنتجات. تغييره بعد نشر منتجات قد يخفي قيمها القديمة. اتركه كما هو إلا إذا كنت تنشئ حقلاً جديداً."
            : "Field IDs link specs to existing products. Changing one may hide previously saved values. Leave existing IDs unchanged unless creating a new field."}
        </p>
      ) : null}

      <div className="mt-4 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-slate-700 dark:bg-slate-800/40">
        <div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            {ar ? "ابدأ بقالب جاهز للأجهزة" : "Start from an electronics template"}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
            {ar
              ? "اختر نوع الجهاز لتُضاف الحقول المناسبة، ثم عدّلها قبل حفظ التصنيف. لا تتم تعبئة أي مواصفة للمنتج تلقائياً."
              : "Select a device type to add its fields, then customize before saving. No product facts are filled automatically."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            aria-label={ar ? "نوع قالب المواصفات" : "Specification template type"}
            value={effectivePresetId}
            onChange={(event) => setSelectedPresetId(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">{ar ? "اختر نوع الجهاز" : "Choose device type"}</option>
            {SPECIFICATION_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {ar ? preset.labelAr : preset.label}
                {recommended?.id === preset.id ? (ar ? " · مقترح" : " · Suggested") : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addMissingFields}
            disabled={!mergePreview?.added}
            className="h-10 rounded-xl border border-indigo-300 bg-white px-4 text-xs font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-600 dark:bg-slate-900 dark:text-indigo-300"
          >
            {ar ? "إضافة الناقص" : "Add missing fields"}
            {mergePreview?.added ? " (+" + mergePreview.added + ")" : ""}
          </button>
          <button
            type="button"
            onClick={applyPreset}
            disabled={!effectivePresetId}
            className="h-10 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ar ? "استبدال القالب" : "Replace template"}
          </button>
        </div>
        {mergePreview ? (
          <p className="text-[11px] text-slate-600 dark:text-slate-300" aria-live="polite">
            {ar ? "الحقول الموجودة مسبقاً" : "Already present"}: {mergePreview.alreadyPresent}
            {" · "}
            {ar ? "يمكن إضافتها" : "Can add"}: {mergePreview.added}
            {mergePreview.skippedForLimit > 0 ? (
              <span className="ms-2 text-amber-700 dark:text-amber-300">
                {ar ? "تجاوز حدود القالب" : "Template limit reached"}: {mergePreview.skippedForLimit}
              </span>
            ) : null}
          </p>
        ) : null}
        {presetMessage ? (
          <p role="status" className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">{presetMessage}</p>
        ) : null}
        {template.sections.length > 0 ? (
          <p className="text-[10px] text-slate-600 dark:text-slate-300">
            {ar ? "إضافة الناقص تحافظ على الحقول الحالية. الاستبدال الكامل يحتاج تأكيداً وقد يخفي بعض المواصفات القديمة." : "Add missing fields preserves existing keys. Replacing the whole template requires confirmation and may hide older values."}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {template.sections.map((section, sectionIndex) => (
          <section key={sectionIndex} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                value={section.title}
                onChange={(event) => {
                  const sections = [...template.sections];
                  sections[sectionIndex] = { ...section, title: event.target.value };
                  commit({ sections });
                }}
                placeholder={t("Section title")}
                aria-label={t("Specification section title")}
                className="h-9 min-w-0 rounded-lg border border-slate-200 px-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400"
              />
              <input
                value={section.titleAr ?? ""}
                dir="rtl"
                onChange={(event) => {
                  const sections = [...template.sections];
                  sections[sectionIndex] = {
                    ...section,
                    titleAr: event.target.value || undefined,
                  };
                  commit({ sections });
                }}
                placeholder="عنوان القسم"
                aria-label={t("Arabic specification section title")}
                className="h-9 min-w-0 rounded-lg border border-slate-200 px-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400"
              />
              <div className="flex items-center gap-1">
                <button type="button" disabled={sectionIndex === 0}
                  aria-label={(ar ? "نقل القسم للأعلى: " : "Move section up: ") + section.title}
                  onClick={() => moveSection(sectionIndex, -1)}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:opacity-30 dark:border-slate-700 dark:text-slate-200">
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" disabled={sectionIndex === template.sections.length - 1}
                  aria-label={(ar ? "نقل القسم للأسفل: " : "Move section down: ") + section.title}
                  onClick={() => moveSection(sectionIndex, 1)}
                  className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:opacity-30 dark:border-slate-700 dark:text-slate-200">
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={t("Delete specification section")}
                  onClick={() =>
                    commit({
                      sections: template.sections.filter((_, index) => index !== sectionIndex),
                    })
                  }
                  className="grid size-9 place-items-center rounded-lg border border-rose-100 text-rose-500"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {section.fields.map((field, fieldIndex) => (
                <div
                  key={field.key + fieldIndex}
                  className={
                    "grid gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2 dark:border-slate-700 dark:bg-slate-800/40 " +
                    (showTechnical ? "sm:grid-cols-[1fr_1fr_.85fr_.55fr_auto]" : "sm:grid-cols-[1fr_1fr_.7fr_auto]")
                  }
                >
                  <input
                    value={field.label}
                    onChange={(event) => {
                      const sections = [...template.sections];
                      const fields = [...section.fields];
                      fields[fieldIndex] = { ...field, label: event.target.value };
                      sections[sectionIndex] = { ...section, fields };
                      commit({ sections });
                    }}
                    placeholder={t("Label")}
                    aria-label={t("Specification field label")}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold outline-none focus:border-indigo-400"
                  />
                  <input
                    value={field.labelAr ?? ""}
                    dir="rtl"
                    onChange={(event) => {
                      const sections = [...template.sections];
                      const fields = [...section.fields];
                      fields[fieldIndex] = {
                        ...field,
                        labelAr: event.target.value || undefined,
                      };
                      sections[sectionIndex] = { ...section, fields };
                      commit({ sections });
                    }}
                    placeholder="الاسم بالعربية"
                    aria-label={t("Arabic specification field label")}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold outline-none focus:border-indigo-400"
                  />
                  {showTechnical ? (
                    <input
                      value={field.key}
                      onChange={(event) => {
                        const sections = [...template.sections];
                        const fields = [...section.fields];
                        fields[fieldIndex] = {
                          ...field,
                          key: normalizeSpecificationKey(event.target.value),
                        };
                        sections[sectionIndex] = { ...section, fields };
                        commit({ sections });
                      }}
                      placeholder={t("field_key")}
                      aria-label={t("Specification field key")}
                      className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-[10px] outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  ) : null}
                  <input
                    value={field.unit ?? ""}
                    onChange={(event) => {
                      const sections = [...template.sections];
                      const fields = [...section.fields];
                      fields[fieldIndex] = {
                        ...field,
                        unit: event.target.value || undefined,
                      };
                      sections[sectionIndex] = { ...section, fields };
                      commit({ sections });
                    }}
                    placeholder={t("Unit")}
                    aria-label={t("Specification field unit")}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] outline-none focus:border-indigo-400"
                  />
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={fieldIndex === 0}
                      aria-label={(ar ? "نقل الحقل للأعلى: " : "Move field up: ") + field.label}
                      onClick={() => moveField(sectionIndex, fieldIndex, -1)}
                      className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:opacity-30 dark:border-slate-700 dark:text-slate-200">
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button type="button" disabled={fieldIndex === section.fields.length - 1}
                      aria-label={(ar ? "نقل الحقل للأسفل: " : "Move field down: ") + field.label}
                      onClick={() => moveField(sectionIndex, fieldIndex, 1)}
                      className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:opacity-30 dark:border-slate-700 dark:text-slate-200">
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("Delete specification field")}
                      onClick={() => {
                        const sections = [...template.sections];
                        const fields = section.fields.filter((_, index) => index !== fieldIndex);
                        if (!fields.length) {
                          sections.splice(sectionIndex, 1);
                        } else {
                          sections[sectionIndex] = { ...section, fields };
                        }
                        commit({ sections });
                      }}
                      className="grid size-9 place-items-center rounded-lg border border-rose-100 text-rose-500"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const used = new Set(
                    template.sections.flatMap((item) =>
                      item.fields.map((itemField) => itemField.key),
                    ),
                  );
                  const key = nextFieldKey("new field", used);
                  const sections = [...template.sections];
                  sections[sectionIndex] = {
                    ...section,
                    fields: [...section.fields, { key, label: "New field", labelAr: "حقل جديد" }],
                  };
                  commit({ sections });
                }}
                disabled={section.fields.length >= 24}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-[10px] font-bold text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="size-3.5" />
                {ar ? "إضافة حقل" : t("Add field")}
              </button>
            </div>
          </section>
        ))}

        {!template.sections.length ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[10px] text-slate-400">
            {ar
              ? "لا توجد حقول مواصفات بعد. أضف قسمًا لربط هذا التصنيف بالمواصفات."
              : t(
                  "No specification fields yet. Add a section to make this category specification-aware.",
                )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
