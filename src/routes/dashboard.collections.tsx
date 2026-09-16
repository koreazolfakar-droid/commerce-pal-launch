import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/collections")({
  component: CollectionsDashboardPage,
});

function CollectionsDashboardPage() {
  const { text } = useDashboardLanguage();

  return (
    <CollectionEditor
      table="store_collections"
      title={text("المجموعات", "Collections")}
      description={text(
        "مجموعات المنتجات الأصلية في Space Call بدون Shopify.",
        "Manage Space Call's native product collections without Shopify.",
      )}
      labelKey="title"
      newRow={{
        handle: "",
        title: "",
        title_ar: "",
        description: "",
        image_url: null,
        sort_order: 0,
        is_active: true,
        is_featured: false,
      }}
      fields={[
        { key: "title", label: text("الاسم", "Name"), type: "text", required: true },
        { key: "title_ar", label: text("الاسم بالعربي", "Arabic name"), type: "text" },
        { key: "handle", label: "Handle", type: "text", required: true, placeholder: "iphone" },
        { key: "description", label: text("الوصف", "Description"), type: "textarea" },
        { key: "image_url", label: text("الصورة", "Image"), type: "image" },
        { key: "sort_order", label: text("الترتيب", "Sort order"), type: "number" },
        { key: "is_featured", label: text("مميز", "Featured"), type: "boolean" },
        { key: "is_active", label: text("مفعّل", "Active"), type: "boolean" },
      ]}
    />
  );
}
