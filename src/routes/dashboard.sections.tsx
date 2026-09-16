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
      description="عناوين ومحتوى الأقسام بالعربية والإنجليزية مع ترتيبها وإظهارها."
      labelKey="section_key"
      newRow={{
        page_slug: "home",
        section_key: "",
        section_type: "custom",
        content: {},
        content_en: {},
        content_ar: {},
        sort_order: 0,
        is_visible: true,
      }}
      fields={[
        { key: "page_slug", label: "الصفحة", type: "text", placeholder: "home" },
        { key: "section_key", label: "معرّف القسم", type: "text", required: true },
        { key: "section_type", label: "نوع القسم", type: "text" },
        { key: "title_en", label: "العنوان بالإنجليزية", type: "text" },
        { key: "title_ar", label: "العنوان بالعربية", type: "text" },
        { key: "subtitle_en", label: "العنوان الفرعي بالإنجليزية", type: "textarea" },
        { key: "subtitle_ar", label: "العنوان الفرعي بالعربية", type: "textarea" },
        { key: "content_en", label: "المحتوى بالإنجليزية (JSON)", type: "json" },
        { key: "content_ar", label: "المحتوى بالعربية (JSON)", type: "json" },
        { key: "sort_order", label: "الترتيب", type: "number" },
        { key: "is_visible", label: "ظاهر", type: "boolean" },
      ]}
    />
  );
}
