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
      description="عنوان ووصف كل صفحة وصورة المشاركة."
      labelKey="path"
      orderBy="path"
      newRow={{ path: "/", noindex: false }}
      fields={[
        { key: "path", label: "المسار", type: "text", required: true, placeholder: "/shop" },
        { key: "title", label: "العنوان", type: "text" },
        { key: "description", label: "الوصف", type: "textarea" },
        { key: "og_image_url", label: "صورة المشاركة", type: "image" },
        { key: "noindex", label: "منع الفهرسة", type: "boolean" },
      ]}
    />
  );
}
