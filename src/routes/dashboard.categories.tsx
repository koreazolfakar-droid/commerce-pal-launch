import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/categories")({
  component: CategoriesDashboardPage,
});

function CategoriesDashboardPage() {
  const { text } = useDashboardLanguage();

  return (
    <CollectionEditor
      table="store_categories"
      title={text("التصنيفات", "Categories")}
      description={text(
        "إدارة تصنيفات المتجر الأصلية مباشرة من Supabase.",
        "Manage the native store categories directly from Supabase.",
      )}
      labelKey="name"
      newRow={{
        name: "",
        name_ar: "",
        slug: "",
        description: "",
        image_url: null,
        icon: null,
        sort_order: 0,
        is_active: true,
      }}
      fields={[
        { key: "name", label: text("الاسم", "Name"), type: "text", required: true },
        { key: "name_ar", label: text("الاسم بالعربي", "Arabic name"), type: "text" },
        {
          key: "slug",
          label: "Slug",
          type: "text",
          required: true,
          placeholder: "smartphones",
        },
        { key: "description", label: text("الوصف", "Description"), type: "textarea" },
        { key: "image_url", label: text("الصورة", "Image"), type: "image" },
        {
          key: "icon",
          label: text("اسم الأيقونة", "Icon name"),
          type: "text",
          placeholder: "Smartphone",
        },
        { key: "sort_order", label: text("الترتيب", "Sort order"), type: "number" },
        { key: "is_active", label: text("مفعّل", "Active"), type: "boolean" },
      ]}
    />
  );
}
