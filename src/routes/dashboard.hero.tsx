import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/hero")({
  component: HeroEditorPage,
});

function HeroEditorPage() {
  const { text } = useDashboardLanguage();

  return (
    <CollectionEditor
      table="cms_hero_slides"
      title={text("صور الهيرو", "Hero slides")}
      description={text(
        "الصور الظاهرة في أعلى الصفحة الرئيسية مع نصوص عربية وإنجليزية مستقلة.",
        "Slides shown at the top of the homepage with separate Arabic and English copy.",
      )}
      labelKey="title_en"
      newRow={{ image_url: null, target_type: "none", sort_order: 0, is_published: false }}
      fields={[
        { key: "image_url", label: text("صورة (سطح المكتب)", "Desktop image"), type: "image" },
        { key: "mobile_image_url", label: text("صورة الجوال", "Mobile image"), type: "image" },
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
          key: "button_label_en",
          label: text("نص الزر بالإنجليزية", "English button label"),
          type: "text",
        },
        {
          key: "button_label_ar",
          label: text("نص الزر بالعربية", "Arabic button label"),
          type: "text",
        },
        {
          key: "target_type",
          label: text("نوع الرابط", "Link type"),
          type: "select",
          options: [
            { value: "none", label: text("بدون", "None") },
            { value: "product", label: text("منتج", "Product") },
            { value: "collection", label: text("تصنيف", "Collection") },
            { value: "url", label: text("رابط", "URL") },
          ],
        },
        { key: "target_value", label: text("قيمة الرابط", "Link value"), type: "text" },
        {
          key: "starts_at",
          label: text("بدء العرض (ISO اختياري)", "Start time (optional ISO)"),
          type: "text",
        },
        {
          key: "ends_at",
          label: text("انتهاء العرض (ISO اختياري)", "End time (optional ISO)"),
          type: "text",
        },
        { key: "sort_order", label: text("الترتيب", "Sort order"), type: "number" },
        { key: "is_published", label: text("منشور", "Published"), type: "boolean" },
      ]}
    />
  );
}
