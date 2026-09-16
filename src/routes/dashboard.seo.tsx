import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/seo")({
  component: SeoEditorPage,
});

function SeoEditorPage() {
  return (
    <CollectionEditor
      table="cms_seo_pages"
      title="إعدادات SEO"
      description="عنوان ووصف كل صفحة بالعربية والإنجليزية مع صورة المشاركة وبيانات الفهرسة."
      labelKey="page_slug"
      idKey="page_slug"
      orderBy="page_slug"
      newRow={{ page_slug: "new-page", robots: "index,follow", json_ld: {}, is_public: true }}
      fields={[
        {
          key: "page_slug",
          label: "معرّف الصفحة",
          type: "text",
          required: true,
          placeholder: "shop",
        },
        { key: "title_en", label: "العنوان بالإنجليزية", type: "text" },
        { key: "title_ar", label: "العنوان بالعربية", type: "text" },
        { key: "description_en", label: "الوصف بالإنجليزية", type: "textarea" },
        { key: "description_ar", label: "الوصف بالعربية", type: "textarea" },
        { key: "og_image_url", label: "صورة المشاركة", type: "image" },
        { key: "canonical_url", label: "Canonical URL", type: "text" },
        { key: "robots", label: "Robots", type: "text", placeholder: "index,follow" },
        { key: "json_ld", label: "JSON-LD", type: "json" },
        { key: "is_public", label: "عام / قابل للنشر", type: "boolean" },
      ]}
    />
  );
}
