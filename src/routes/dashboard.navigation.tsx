import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/navigation")({
  component: NavigationEditorPage,
});

function NavigationEditorPage() {
  return (
    <CollectionEditor
      table="cms_navigation_items"
      title="القوائم والأيقونات"
      description="عناصر الهيدر والقوائم مع نص مستقل بالعربية والإنجليزية."
      labelKey="label_en"
      newRow={{
        area: "header",
        label: "Navigation item",
        label_en: "",
        label_ar: "",
        icon_type: "none",
        sort_order: 0,
        is_visible: true,
      }}
      fields={[
        {
          key: "area",
          label: "الموقع",
          type: "select",
          options: [
            { value: "header", label: "الهيدر" },
            { value: "bottom", label: "الشريط السفلي" },
            { value: "footer", label: "الفوتر" },
            { value: "mobile_menu", label: "قائمة الجوال" },
            { value: "trust", label: "شريط الثقة" },
          ],
        },
        { key: "label_en", label: "النص بالإنجليزية", type: "text", required: true },
        { key: "label_ar", label: "النص بالعربية", type: "text", required: true },
        {
          key: "icon_type",
          label: "نوع الأيقونة",
          type: "select",
          options: [
            { value: "none", label: "بدون" },
            { value: "lucide", label: "أيقونة جاهزة" },
            { value: "image", label: "صورة" },
            { value: "svg", label: "SVG" },
          ],
        },
        { key: "icon_value", label: "الأيقونة / الصورة", type: "text" },
        { key: "href", label: "الرابط", type: "text", placeholder: "/shop" },
        { key: "sort_order", label: "الترتيب", type: "number" },
        { key: "is_visible", label: "ظاهر", type: "boolean" },
      ]}
    />
  );
}
