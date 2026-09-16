import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/collections")({
  component: CollectionsDashboardPage,
});

function CollectionsDashboardPage() {
  return (
    <CollectionEditor
      table="store_collections"
      title="Collections"
      description="مجموعات المنتجات الأصلية في Space Call بدون Shopify."
      labelKey="title"
      newRow={{ handle: "", title: "", title_ar: "", description: "", image_url: null, sort_order: 0, is_active: true, is_featured: false }}
      fields={[
        { key: "title", label: "الاسم", type: "text", required: true },
        { key: "title_ar", label: "الاسم بالعربي", type: "text" },
        { key: "handle", label: "Handle", type: "text", required: true, placeholder: "iphone" },
        { key: "description", label: "الوصف", type: "textarea" },
        { key: "image_url", label: "الصورة", type: "image" },
        { key: "sort_order", label: "الترتيب", type: "number" },
        { key: "is_featured", label: "Featured", type: "boolean" },
        { key: "is_active", label: "مفعّل", type: "boolean" },
      ]}
    />
  );
}
