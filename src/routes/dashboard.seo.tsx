import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/seo")({
  component: SeoEditorPage,
});

function SeoEditorPage() {
  const { text } = useDashboardLanguage();

  return (
    <CollectionEditor
      table="cms_seo_pages"
      title={text("إعدادات SEO", "SEO settings")}
      description={text(
        "عنوان ووصف كل صفحة بالعربية والإنجليزية مع صورة المشاركة وبيانات الفهرسة.",
        "Manage Arabic and English page titles and descriptions, social images and indexing metadata.",
      )}
      labelKey="page_slug"
      idKey="page_slug"
      orderBy="page_slug"
      newRow={{ page_slug: "new-page", robots: "index,follow", json_ld: {}, is_public: true }}
      fields={[
        {
          key: "page_slug",
          label: text("معرّف الصفحة", "Page slug"),
          type: "text",
          required: true,
          placeholder: "shop",
        },
        { key: "title_en", label: text("العنوان بالإنجليزية", "English title"), type: "text" },
        { key: "title_ar", label: text("العنوان بالعربية", "Arabic title"), type: "text" },
        {
          key: "description_en",
          label: text("الوصف بالإنجليزية", "English description"),
          type: "textarea",
        },
        {
          key: "description_ar",
          label: text("الوصف بالعربية", "Arabic description"),
          type: "textarea",
        },
        { key: "og_image_url", label: text("صورة المشاركة", "Social share image"), type: "image" },
        { key: "canonical_url", label: "Canonical URL", type: "text" },
        { key: "robots", label: "Robots", type: "text", placeholder: "index,follow" },
        { key: "json_ld", label: "JSON-LD", type: "json" },
        {
          key: "is_public",
          label: text("عام / قابل للنشر", "Public / publishable"),
          type: "boolean",
        },
      ]}
    />
  );
}
