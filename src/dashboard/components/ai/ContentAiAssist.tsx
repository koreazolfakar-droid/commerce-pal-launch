import AiAssistPanel from "./AiAssistPanel";
import type { DashboardAiFieldDefinition } from "@/dashboard/ai/types";

const collectionFields: DashboardAiFieldDefinition[] = [
  {
    key: "title",
    label: "Title",
    maxLength: 180,
    description: "Clear accurate collection title in English.",
  },
  {
    key: "titleAr",
    label: "Title — Arabic",
    maxLength: 180,
    description: "Natural Arabic collection title, preserving official names.",
  },
  {
    key: "handle",
    label: "Handle",
    maxLength: 120,
    review: true,
    description: "Short unique lowercase URL handle using letters, digits and single hyphens.",
  },
  {
    key: "description",
    label: "Description",
    maxLength: 5000,
    description:
      "Useful original collection copy describing only the products or themes supplied by the user.",
  },
  { key: "seoTitle", label: "SEO title", maxLength: 70 },
  { key: "seoDescription", label: "Meta description", maxLength: 180 },
];
const seoFields: DashboardAiFieldDefinition[] = [
  { key: "titleEn", label: "Title — English", maxLength: 70 },
  { key: "titleAr", label: "Title — Arabic", maxLength: 70 },
  { key: "descriptionEn", label: "Description — English", maxLength: 180 },
  { key: "descriptionAr", label: "Description — Arabic", maxLength: 180 },
];

export default function ContentAiAssist({
  entity,
  query,
  values,
  onApply,
  entityId = "",
  pageSlug = "",
}: {
  entity: "collection" | "seo_page";
  query: string;
  values: Record<string, unknown>;
  onApply: (patch: Record<string, string>) => void;
  entityId?: string;
  pageSlug?: string;
}) {
  const fields = entity === "collection" ? collectionFields : seoFields;
  return (
    <AiAssistPanel
      entity={entity}
      query={query}
      fields={fields}
      currentData={Object.fromEntries(
        fields.map((field) => [
          field.key,
          typeof values[field.key] === "string" ? (values[field.key] as string) : "",
        ]),
      )}
      context={{ entityId, pageSlug, store: "Space Call", market: "Lebanon" }}
      onApply={(patch) =>
        onApply(
          Object.fromEntries(
            Object.entries(patch).filter(([key]) => fields.some((field) => field.key === key)),
          ),
        )
      }
      compact
    />
  );
}
