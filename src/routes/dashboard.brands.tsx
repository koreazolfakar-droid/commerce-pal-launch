import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/brands")({
  component: BrandsEditorPage,
});

function BrandsEditorPage() {
  return (
    <CollectionEditor
      table="cms_brands"
      title="البراندات"
      description="أسماء الشركات وشعاراتها والتصنيف المرتبط بها."
      labelKey="name"
      newRow={{ name: "", slug: "", sort_order: 0, is_visible: true }}
      fields={[
        { key: "name", label: "الاسم", type: "text", required: true },
        { key: "slug", label: "المعرّف", type: "text", required: true, placeholder: "samsung" },
        { key: "logo_url", label: "الشعار", type: "image" },
        { key: "collection_handle", label: "تصنيف Shopify", type: "text" },
        { key: "sort_order", label: "الترتيب", type: "number" },
        { key: "is_visible", label: "ظاهر", type: "boolean" },
      ]}
    />
  );
}
