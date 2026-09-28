import { Plus, Trash2 } from "lucide-react";
import {
  normalizeSpecificationKey,
  type ProductSpecificationTemplate,
} from "@/lib/productSpecifications";

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
}: {
  value: ProductSpecificationTemplate;
  onChange: (value: ProductSpecificationTemplate) => void;
}) {
  const template = value;

  const commit = (next: ProductSpecificationTemplate) => {
    onChange(next);
  };

  const addSection = () => {
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
          fields: [{ key, label: "New field" }],
        },
      ],
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black text-slate-700">Specification template</div>
          <p className="mt-1 max-w-xl text-[10px] leading-4 text-slate-400">
            These fields appear automatically in products assigned to this category and define the storefront specification sections.
          </p>
        </div>
        <button
          type="button"
          onClick={addSection}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 text-[10px] font-bold text-indigo-600"
        >
          <Plus className="size-3.5" />
          Add section
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {template.sections.map((section, sectionIndex) => (
          <section key={sectionIndex} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                value={section.title}
                onChange={(event) => {
                  const sections = [...template.sections];
                  sections[sectionIndex] = { ...section, title: event.target.value };
                  commit({ sections });
                }}
                placeholder="Section title (English)"
                aria-label="Specification section title in English"
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
                placeholder="عنوان القسم بالعربية"
                aria-label="Specification section title in Arabic"
                className="h-9 min-w-0 rounded-lg border border-slate-200 px-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400"
              />
              <button
                type="button"
                aria-label="Delete specification section"
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

            <div className="mt-3 space-y-2">
              {section.fields.map((field, fieldIndex) => (
                <div
                  key={field.key + fieldIndex}
                  className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2 sm:grid-cols-[1fr_1fr_.9fr_.6fr_auto]"
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
                    placeholder="Label (English)"
                    aria-label="Specification field label in English"
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
                    placeholder="التسمية بالعربية"
                    aria-label="Specification field label in Arabic"
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold outline-none focus:border-indigo-400"
                  />
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
                    placeholder="field_key"
                    aria-label="Specification field key"
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-[9px] outline-none focus:border-indigo-400"
                  />
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
                    placeholder="Unit"
                    aria-label="Specification field unit"
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    aria-label="Delete specification field"
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
              ))}

              <button
                type="button"
                onClick={() => {
                  const used = new Set(
                    template.sections.flatMap((item) => item.fields.map((itemField) => itemField.key)),
                  );
                  const key = nextFieldKey("new field", used);
                  const sections = [...template.sections];
                  sections[sectionIndex] = {
                    ...section,
                    fields: [...section.fields, { key, label: "New field" }],
                  };
                  commit({ sections });
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-[10px] font-bold text-slate-500"
              >
                <Plus className="size-3.5" />
                Add field
              </button>
            </div>
          </section>
        ))}

        {!template.sections.length ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[10px] text-slate-400">
            No specification fields yet. Add a section to make this category specification-aware.
          </div>
        ) : null}
      </div>
    </div>
  );
}
