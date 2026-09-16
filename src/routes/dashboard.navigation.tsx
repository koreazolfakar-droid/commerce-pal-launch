import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export const Route = createFileRoute("/dashboard/navigation")({
  component: NavigationEditorPage,
});

function NavigationEditorPage() {
  const { text } = useDashboardLanguage();

  return (
    <CollectionEditor
      table="cms_navigation_items"
      title={text("القوائم والأيقونات", "Navigation & icons")}
      description={text(
        "عناصر الهيدر والقوائم مع نص مستقل بالعربية والإنجليزية.",
        "Manage header and menu items with separate Arabic and English labels.",
      )}
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
          label: text("الموقع", "Area"),
          type: "select",
          options: [
            { value: "header", label: text("الهيدر", "Header") },
            { value: "bottom", label: text("الشريط السفلي", "Bottom bar") },
            { value: "footer", label: text("الفوتر", "Footer") },
            { value: "mobile_menu", label: text("قائمة الجوال", "Mobile menu") },
            { value: "trust", label: text("شريط الثقة", "Trust strip") },
          ],
        },
        {
          key: "label_en",
          label: text("النص بالإنجليزية", "English label"),
          type: "text",
          required: true,
        },
        {
          key: "label_ar",
          label: text("النص بالعربية", "Arabic label"),
          type: "text",
          required: true,
        },
        {
          key: "icon_type",
          label: text("نوع الأيقونة", "Icon type"),
          type: "select",
          options: [
            { value: "none", label: text("بدون", "None") },
            { value: "lucide", label: text("أيقونة جاهزة", "Lucide icon") },
            { value: "image", label: text("صورة", "Image") },
            { value: "svg", label: "SVG" },
          ],
        },
        {
          key: "icon_value",
          label: text("الأيقونة / الصورة", "Icon / image"),
          type: "text",
        },
        { key: "href", label: text("الرابط", "Link"), type: "text", placeholder: "/shop" },
        { key: "sort_order", label: text("الترتيب", "Sort order"), type: "number" },
        { key: "is_visible", label: text("ظاهر", "Visible"), type: "boolean" },
      ]}
    />
  );
}
