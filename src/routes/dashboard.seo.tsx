import { createFileRoute } from "@tanstack/react-router";

import { CollectionEditor, type EditorField } from "@/components/admin/CollectionEditor";

export const Route = createFileRoute("/dashboard/seo" as never)({
  component: DashboardSeo,
});

const fields: EditorField[] = [
  { key: "page_slug", label: "Page slug", type: "text", required: true },
  { key: "title", label: "SEO title", type: "text" },
  { key: "description", label: "Meta description", type: "textarea" },
  { key: "og_image_url", label: "Open Graph image", type: "image", fullWidth: true },
  { key: "canonical_url", label: "Canonical URL", type: "text" },
  { key: "robots", label: "Robots", type: "text", placeholder: "index,follow" },
  { key: "json_ld", label: "JSON-LD", type: "json", fullWidth: true },
  { key: "is_public", label: "مفعّل", type: "boolean" },
];

function DashboardSeo() {
  return (
    <CollectionEditor
      resource="seo"
      title="إعدادات SEO"
      description="تحرير بيانات SEO المخزنة في CMS. ربط هذه القيم بمخرجات SSR يتم بشكل منفصل ومحكوم حتى لا يتأثر SEO الحالي دون اختبار."
      fields={fields}
      identityKey="page_slug"
      labelKey="page_slug"
      newRow={{
        page_slug: `page-${Date.now()}`,
        title: "",
        description: "",
        og_image_url: "",
        canonical_url: "",
        robots: "index,follow",
        json_ld: {},
        is_public: false,
      }}
    />
  );
}
