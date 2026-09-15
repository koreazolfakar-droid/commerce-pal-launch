import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor, type EditorField } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/brands" as never)({
  component: DashboardBrands,
});

const fields: EditorField[] = [
  { key: "name", label: "اسم البراند", type: "text", required: true },
  { key: "slug", label: "Slug", type: "text", required: true },
  { key: "logo_url", label: "الشعار", type: "image", fullWidth: true },
  { key: "href", label: "الرابط", type: "text", placeholder: "/brand/apple" },
  { key: "sort_order", label: "الترتيب", type: "number" },
  { key: "is_visible", label: "ظاهر", type: "boolean" },
];

function DashboardBrands() {
  return (
    <CollectionEditor
      resource="brands"
      title="البراندات والشعارات"
      description="مكتبة CMS مستقلة للبراندات. يمكن رفع الشعارات وترتيبها وتجهيز الروابط بدون تخزين ملفات داخل الكود."
      fields={fields}
      labelKey="name"
      newRow={{
        name: "Brand",
        slug: `brand-${Date.now()}`,
        logo_url: "",
        href: "",
        sort_order: 0,
        is_visible: false,
      }}
    />
  );
}
