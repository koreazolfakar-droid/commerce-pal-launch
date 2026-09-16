import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/sections")({
  component: SectionsEditorPage,
});

function SectionsEditorPage() {
  return (
    <CollectionEditor
      table="cms_sections"
      title="أقسام الصفحة"
      description="عناوين الأقسام وترتيبها وإظهارها."
      labelKey="section_key"
      newRow={{
        page_slug: "home",
        section_key: "",
        section_type: "custom",
        sort_order: 0,
        is_visible: true,
      }}
      fields={[
        { key: "page_slug", label: "الصفحة", type: "text", placeholder: "home" },
        { key: "section_key", label: "معرّف القسم", type: "text", required: true },
        { key: "section_type", label: "نوع القسم", type: "text" },
        { key: "title", label: "العنوان", type: "text" },
        { key: "subtitle", label: "العنوان الفرعي", type: "textarea" },
        { key: "sort_order", label: "الترتيب", type: "number" },
        { key: "is_visible", label: "ظاهر", type: "boolean" },
      ]}
    />
  );
}
