import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/sections")({
  component: SectionsEditorPage,
});

function SectionsEditorPage() {
  const { text } = useDashboardLanguage();

  return (
    <CollectionEditor
      table="cms_sections"
      title={text("أقسام الصفحة", "Page sections")}
      description={text(
        "عناوين ومحتوى الأقسام بالعربية والإنجليزية مع ترتيبها وإظهارها.",
        "Manage section titles and content in Arabic and English, including order and visibility.",
      )}
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
        { key: "page_slug", label: text("الصفحة", "Page"), type: "text", placeholder: "home" },
        {
          key: "section_key",
          label: text("معرّف القسم", "Section key"),
          type: "text",
          required: true,
        },
        { key: "section_type", label: text("نوع القسم", "Section type"), type: "text" },
        { key: "title_en", label: text("العنوان بالإنجليزية", "English title"), type: "text" },
        { key: "title_ar", label: text("العنوان بالعربية", "Arabic title"), type: "text" },
        {
          key: "subtitle_en",
          label: text("العنوان الفرعي بالإنجليزية", "English subtitle"),
          type: "textarea",
        },
        {
          key: "subtitle_ar",
          label: text("العنوان الفرعي بالعربية", "Arabic subtitle"),
          type: "textarea",
        },
        {
          key: "content_en",
          label: text("المحتوى بالإنجليزية (JSON)", "English content (JSON)"),
          type: "json",
        },
        {
          key: "content_ar",
          label: text("المحتوى بالعربية (JSON)", "Arabic content (JSON)"),
          type: "json",
        },
        { key: "sort_order", label: text("الترتيب", "Sort order"), type: "number" },
        { key: "is_visible", label: text("ظاهر", "Visible"), type: "boolean" },
      ]}
    />
  );
}
