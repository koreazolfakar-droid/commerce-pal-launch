import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/hero")({
  component: HeroEditorPage,
});

function HeroEditorPage() {
  return (
    <CollectionEditor
      table="cms_hero_slides"
      title="صور الهيرو"
      description="الصور الظاهرة في أعلى الصفحة الرئيسية وروابطها وحالة النشر."
      labelKey="title"
      newRow={{ image_url: null, target_type: "none", sort_order: 0, is_published: false }}
      fields={[
        { key: "image_url", label: "صورة (سطح المكتب)", type: "image" },
        { key: "mobile_image_url", label: "صورة الجوال", type: "image" },
        { key: "title", label: "العنوان", type: "text" },
        { key: "subtitle", label: "العنوان الفرعي", type: "textarea" },
        { key: "button_label", label: "نص الزر", type: "text" },
        {
          key: "target_type",
          label: "نوع الرابط",
          type: "select",
          options: [
            { value: "none", label: "بدون" },
            { value: "product", label: "منتج" },
            { value: "collection", label: "تصنيف" },
            { value: "url", label: "رابط" },
          ],
        },
        { key: "target_value", label: "قيمة الرابط", type: "text" },
        { key: "starts_at", label: "بدء العرض (ISO اختياري)", type: "text" },
        { key: "ends_at", label: "انتهاء العرض (ISO اختياري)", type: "text" },
        { key: "sort_order", label: "الترتيب", type: "number" },
        { key: "is_published", label: "منشور", type: "boolean" },
      ]}
    />
  );
}
