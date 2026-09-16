import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/brands")({
  component: BrandsEditorPage,
});

function BrandsEditorPage() {
  const { text } = useDashboardLanguage();

  return (
    <CollectionEditor
      table="cms_brands"
      title={text("البراندات", "Brands")}
      description={text(
        "أسماء الشركات وشعاراتها وروابطها في المتجر.",
        "Manage brand names, logos and storefront links.",
      )}
      labelKey="name"
      newRow={{ name: "", slug: "", sort_order: 0, is_visible: true }}
      fields={[
        { key: "name", label: text("الاسم", "Name"), type: "text", required: true },
        {
          key: "slug",
          label: text("المعرّف", "Slug"),
          type: "text",
          required: true,
          placeholder: "samsung",
        },
        { key: "logo_url", label: text("الشعار", "Logo"), type: "image" },
        {
          key: "href",
          label: text("الرابط", "Link"),
          type: "text",
          placeholder: "/brand/samsung",
        },
        { key: "sort_order", label: text("الترتيب", "Sort order"), type: "number" },
        { key: "is_visible", label: text("ظاهر", "Visible"), type: "boolean" },
      ]}
    />
  );
}
