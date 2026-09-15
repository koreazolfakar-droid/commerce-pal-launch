import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor, type EditorField } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/navigation" as never)({
  component: DashboardNavigation,
});

const fields: EditorField[] = [
  {
    key: "area",
    label: "المكان",
    type: "select",
    options: [
      { value: "header", label: "Header" },
      { value: "bottom", label: "Bottom navigation" },
      { value: "footer", label: "Footer" },
      { value: "mobile_menu", label: "Mobile menu" },
      { value: "trust", label: "Trust strip" },
    ],
  },
  { key: "label", label: "الاسم", type: "text", required: true },
  {
    key: "icon_type",
    label: "نوع الأيقونة",
    type: "select",
    options: [
      { value: "lucide", label: "Lucide" },
      { value: "image", label: "صورة" },
      { value: "svg", label: "SVG" },
      { value: "none", label: "بدون" },
    ],
  },
  { key: "icon_value", label: "الأيقونة / الرابط", type: "text" },
  { key: "href", label: "الرابط", type: "text" },
  { key: "sort_order", label: "الترتيب", type: "number" },
  { key: "is_visible", label: "ظاهر", type: "boolean" },
];

function DashboardNavigation() {
  return (
    <CollectionEditor
      resource="navigation"
      title="القوائم والتنقل"
      description="إدارة عناصر التنقل التي يقرأها الموقع من CMS. استخدم أسماء Lucide المعتمدة أو رابط صورة حسب نوع الأيقونة."
      fields={fields}
      labelKey="label"
      newRow={{
        area: "bottom",
        label: "عنصر جديد",
        icon_type: "lucide",
        icon_value: "Home",
        href: "/",
        sort_order: 0,
        is_visible: false,
      }}
    />
  );
}
