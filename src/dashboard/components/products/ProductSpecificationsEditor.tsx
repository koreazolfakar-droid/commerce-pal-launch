import { useState } from "react";

import AiAssistPanel from "@/dashboard/components/ai/AiAssistPanel";
import {
  keySpecificationRows,
  validateSpecifications,
  type ProductSpecifications,
  type SpecSection,
  type SpecTemplate,
} from "@/lib/specifications";

type Props = {
  template: SpecTemplate;
  value: ProductSpecifications;
  onChange: (value: ProductSpecifications) => void;
  title: string;
  description: string;
  brand: string;
  categoryId: string;
};

export default function ProductSpecificationsEditor({
  template,
  value,
  onChange,
  title,
  description,
  brand,
  categoryId,
}: Props) {
  const [aiKeys, setAiKeys] = useState<string[]>([]);
  const sections = template.sections;
  const fields = sections.flatMap((section) => section.fields);
  const errors = validateSpecifications(value, template);
  const currentData = Object.fromEntries(
    fields.map((field) => [`spec__${field.key}`, value.values[field.key] ?? ""]),
  );
  const aiFields = (sectionFields: SpecSection["fields"]) =>
    sectionFields.map((field) => ({
      key: `spec__${field.key}`,
      label: field.label,
      description: `Exact, verified ${field.label} for this model and variant. ${
        field.unit ? `Include the ${field.unit} unit. ` : ""
      }Leave uncertain values blank.`,
      review: true,
      maxLength: 240,
    }));

  const applyAi = (patch: Record<string, string>) => {
    const nextValues = { ...value.values };
    const applied: string[] = [];

    for (const field of fields) {
      const suggestion = patch[`spec__${field.key}`]?.trim();
      if (!suggestion) continue;
      nextValues[field.key] = suggestion;
      applied.push(field.key);
    }

    onChange({ ...value, values: nextValues });
    setAiKeys((current) => [...new Set([...current, ...applied])]);
  };

  const setField = (key: string, raw: string) => {
    const values = { ...value.values };
    if (raw) values[key] = raw;
    else delete values[key];

    onChange({
      ...value,
      values,
      keySpecs: value.keySpecs.filter((item) => item !== key || Boolean(raw)),
    });
    setAiKeys((current) => current.filter((item) => item !== key));
  };

  const toggleKey = (key: string) =>
    onChange({
      ...value,
      keySpecs: value.keySpecs.includes(key)
        ? value.keySpecs.filter((item) => item !== key)
        : value.keySpecs.length < 6
          ? [...value.keySpecs, key]
          : value.keySpecs,
    });

  const moveKey = (key: string, direction: number) => {
    const order = [...value.keySpecs];
    const index = order.indexOf(key);
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    onChange({ ...value, keySpecs: order });
  };

  if (!categoryId) {
    return <p className="text-xs text-slate-500">Select a category to edit specifications.</p>;
  }

  if (!fields.length) {
    return (
      <p className="text-xs text-slate-500">
        This category has no template yet. Add fields in Dashboard → Categories.
      </p>
    );
  }

  const context = {
    categoryId,
    productBrand: brand,
    productDescription: description.slice(0, 500),
    store: "Space Call",
    market: "Lebanon",
  };
  const researchQuery = `${brand} ${title}`.trim();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Use exact model values. Select 4–6 highlights once the fields are filled.
        </p>
        <AiAssistPanel
          entity="product"
          query={researchQuery}
          currentData={currentData}
          fields={aiFields(fields).slice(0, 40)}
          context={context}
          onApply={applyAi}
          compact
        />
      </div>

      {sections.map((section) => (
        <section key={section.title} className="rounded-xl border border-slate-200 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-800">{section.title}</h3>
            <AiAssistPanel
              entity="product"
              query={researchQuery}
              currentData={currentData}
              fields={aiFields(section.fields)}
              context={context}
              onApply={applyAi}
              compact
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {section.fields.map((field) => (
              <div key={field.key} className="min-w-0">
                <label
                  className="block text-[11px] font-semibold text-slate-600"
                  htmlFor={`spec-${field.key}`}
                >
                  {field.label}
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id={`spec-${field.key}`}
                    value={value.values[field.key] ?? ""}
                    onChange={(event) => setField(field.key, event.target.value)}
                    placeholder={field.unit ? `e.g. 128 ${field.unit}` : "Enter a verified value"}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    disabled={!value.values[field.key]}
                    aria-label={`Select ${field.label} as a key spec`}
                    onClick={() => toggleKey(field.key)}
                    className={`rounded-lg border px-2 text-xs ${
                      value.keySpecs.includes(field.key)
                        ? "border-indigo-500 text-indigo-600"
                        : "text-slate-400"
                    }`}
                  >
                    ★
                  </button>
                </div>
                {aiKeys.includes(field.key) ? (
                  <span className="text-[10px] text-amber-600">
                    AI suggestion — review before saving
                  </span>
                ) : null}
                <AiAssistPanel
                  entity="product"
                  query={researchQuery}
                  currentData={currentData}
                  fields={aiFields([field])}
                  context={context}
                  onApply={applyAi}
                  compact
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {value.keySpecs.length > 0 ? (
        <div className="rounded-xl bg-slate-50 p-3">
          <h3 className="mb-2 text-xs font-bold">
            Key specifications ({value.keySpecs.length}/6)
          </h3>
          {keySpecificationRows(value, template).map((row, index) => (
            <div
              key={value.keySpecs[index]}
              className="flex items-center justify-between gap-2 py-1 text-xs"
            >
              <span>
                {row.label}: {row.value}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveKey(value.keySpecs[index], -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === value.keySpecs.length - 1}
                  onClick={() => moveKey(value.keySpecs[index], 1)}
                >
                  ↓
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {errors.map((error) => (
        <p key={error} className="text-xs text-rose-600">
          {error}
        </p>
      ))}
    </div>
  );
}
