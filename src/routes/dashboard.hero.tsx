import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor, type EditorField } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/hero" as never)({
  component: DashboardHero,
});

const fields: EditorField[] = [
  { key: "title", label: "العنوان", type: "text" },
  { key: "subtitle", label: "الوصف", type: "textarea" },
  { key: "image_url", label: "صورة Desktop", type: "image", fullWidth: true },
  { key: "mobile_image_url", label: "صورة Mobile", type: "image", fullWidth: true },
  { key: "button_label", label: "نص الزر", type: "text" },
  {
    key: "target_type",
    label: "نوع الرابط",
    type: "select",
    options: [
      { value: "none", label: "بدون رابط" },
      { value: "collection", label: "Collection" },
      { value: "product", label: "Product" },
      { value: "url", label: "رابط مخصص" },
    ],
  },
  { key: "target_value", label: "هدف الرابط / Handle", type: "text" },
  { key: "sort_order", label: "الترتيب", type: "number" },
  { key: "starts_at", label: "يبدأ في", type: "datetime" },
  { key: "ends_at", label: "ينتهي في", type: "datetime" },
  { key: "is_published", label: "منشور", type: "boolean" },
];

function DashboardHero() {
  return (
    <CollectionEditor
      resource="hero"
      title="صور Hero"
      description="إدارة صور الهيرو التي تظهر أعلى الصفحة الرئيسية مع نسخة منفصلة للموبايل وجدولة اختيارية."
      fields={fields}
      labelKey="title"
      newRow={{
        title: "Hero جديد",
        subtitle: "",
        image_url: "",
        mobile_image_url: "",
        button_label: "",
        target_type: "none",
        target_value: "",
        sort_order: 0,
        starts_at: null,
        ends_at: null,
        is_published: false,
      }}
    />
  );
}
