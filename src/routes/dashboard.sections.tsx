import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor, type EditorField } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/sections" as never)({
  component: DashboardSections,
});

const fields: EditorField[] = [
  { key: "page_slug", label: "الصفحة", type: "text", required: true },
  { key: "section_key", label: "Section key", type: "text", required: true },
  { key: "section_type", label: "النوع", type: "text", required: true },
  { key: "title", label: "العنوان", type: "text" },
  { key: "subtitle", label: "العنوان الفرعي", type: "textarea" },
  { key: "content", label: "محتوى JSON", type: "json", fullWidth: true },
  { key: "sort_order", label: "الترتيب", type: "number" },
  { key: "is_visible", label: "ظاهر", type: "boolean" },
];

function DashboardSections() {
  return (
    <CollectionEditor
      resource="sections"
      title="أقسام الموقع"
      description="تحكم بظهور وترتيب أقسام الصفحة وبالمحتوى الإضافي المخزن بصيغة JSON."
      fields={fields}
      labelKey="section_key"
      newRow={{
        page_slug: "home",
        section_key: `custom_${Date.now()}`,
        section_type: "custom",
        title: "قسم جديد",
        subtitle: "",
        content: {},
        sort_order: 0,
        is_visible: false,
      }}
    />
  );
}
