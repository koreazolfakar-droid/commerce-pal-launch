import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/categories")({
  component: CategoriesDashboardPage,
});

function CategoriesDashboardPage() {
  return (
    <CollectionEditor
      table="store_categories"
      title="التصنيفات"
      description="إدارة تصنيفات المتجر الأصلية مباشرة من Supabase."
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
        { key: "name", label: "الاسم", type: "text", required: true },
        { key: "name_ar", label: "الاسم بالعربي", type: "text" },
        { key: "slug", label: "Slug", type: "text", required: true, placeholder: "smartphones" },
        { key: "description", label: "الوصف", type: "textarea" },
        { key: "image_url", label: "الصورة", type: "image" },
        { key: "icon", label: "اسم الأيقونة", type: "text", placeholder: "Smartphone" },
        { key: "sort_order", label: "الترتيب", type: "number" },
        { key: "is_active", label: "مفعّل", type: "boolean" },
      ]}
    />
  );
}
