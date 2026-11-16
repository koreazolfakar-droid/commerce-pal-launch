/**
 * Read-only publish preflight. Conditions in the "blocker" group mirror the
 * existing editor validation; optional merchandising tips do not add new gates.
 */
export type ProductReviewIssue = {
  id: string;
  kind: "blocker" | "recommendation";
  sectionId: string;
  fieldKey?: string;
  specKey?: string;
  titleEn: string;
  titleAr: string;
  detailEn: string;
  detailAr: string;
};
export type ProductReviewInput = {
  validationErrors: Partial<Record<
    "title" | "price" | "stock" | "compareAt" | "productType" |
    "tags" | "titleAr" | "descriptionAr", string
  >>;
  invalidSpecifications: { key: string; label: string; labelAr?: string; message: string }[];
  isNew: boolean;
  hasPublishImage: boolean;
  hasAnyImage: boolean;
  description: string;
  brandId: string;
  categoryId: string;
  sku: string;
  barcode: string;
  seoTitle: string;
  seoDescription: string;
  stock: string;
  specificationFields: number;
  filledSpecifications: number;
};
export type ProductReviewResult = {
  blockers: ProductReviewIssue[];
  recommendations: ProductReviewIssue[];
  checksPassed: number;
  checksTotal: number;
  canPublish: boolean;
};

const FIELD_META: Record<
  keyof ProductReviewInput["validationErrors"],
  { sectionId: string; titleEn: string; titleAr: string }
> = {
  title: { sectionId: "product-information", titleEn: "Product name", titleAr: "اسم المنتج" },
  price: { sectionId: "product-pricing", titleEn: "Selling price", titleAr: "سعر البيع" },
  stock: { sectionId: "product-inventory", titleEn: "Inventory quantity", titleAr: "كمية المخزون" },
  compareAt: { sectionId: "product-pricing", titleEn: "Compare-at price", titleAr: "سعر المقارنة" },
  productType: { sectionId: "product-organization", titleEn: "Product type", titleAr: "نوع المنتج" },
  tags: { sectionId: "product-organization", titleEn: "Product tags", titleAr: "وسوم المنتج" },
  titleAr: { sectionId: "product-information", titleEn: "Arabic title", titleAr: "اسم المنتج بالعربية" },
  descriptionAr: { sectionId: "product-information", titleEn: "Arabic description", titleAr: "وصف المنتج بالعربية" },
};

export function buildProductPublishReadiness(input: ProductReviewInput): ProductReviewResult {
  const blockers: ProductReviewIssue[] = [];
  const recommendations: ProductReviewIssue[] = [];
  const addTip = (
    id: string, sectionId: string, titleEn: string, titleAr: string,
    detailEn: string, detailAr: string,
  ) => recommendations.push({
    id, kind: "recommendation", sectionId, titleEn, titleAr, detailEn, detailAr,
  });

  for (const [key, message] of Object.entries(input.validationErrors)) {
    if (!message) continue;
    const meta = FIELD_META[key as keyof typeof FIELD_META];
    if (!meta) continue;
    blockers.push({
      id: "invalid-" + key, kind: "blocker", sectionId: meta.sectionId,
      fieldKey: key, titleEn: meta.titleEn, titleAr: meta.titleAr,
      detailEn: message,
      detailAr: "صحّح هذه الخانة قبل النشر. " + (
        key === "title" ? "اكتب اسماً واضحاً للمنتج." :
        key === "price" ? "يجب أن يكون السعر رقماً أكبر من صفر." :
        key === "stock" ? "اكتب كمية صحيحة لا تقل عن صفر." :
        key === "compareAt" ? "تأكد أن سعر المقارنة ليس أقل من سعر البيع." :
        "راجع طول النص أو تنسيقه."
      ),
    });
  }
  if (input.isNew && !input.hasPublishImage) {
    blockers.push({
      id: "missing-image", kind: "blocker", sectionId: "product-media",
      titleEn: "Product photo", titleAr: "صورة المنتج",
      detailEn: "New products need at least one queued image before publishing.",
      detailAr: "أضف صورة واحدة على الأقل للمنتج الجديد قبل النشر.",
    });
  }
  for (const field of input.invalidSpecifications) {
    blockers.push({
      id: "invalid-spec-" + field.key, kind: "blocker",
      sectionId: "product-specifications", specKey: field.key,
      titleEn: field.label, titleAr: field.labelAr || field.label,
      detailEn: field.message,
      detailAr: "تحقق من تنسيق القيمة ووحدة القياس.",
    });
  }

  if (!input.description.trim()) addTip(
    "description", "product-information", "Product description", "وصف المنتج",
    "A short verified description helps shoppers understand the product.",
    "أضف وصفاً مختصراً ودقيقاً ليساعد الزبون على فهم المنتج.",
  );
  if (!input.categoryId) addTip(
    "category", "product-information", "Category", "التصنيف",
    "Choose the matching category to show the right specifications.",
    "اختر التصنيف الصحيح لعرض المواصفات المناسبة.",
  );
  if (!input.brandId) addTip(
    "brand", "product-information", "Brand", "العلامة التجارية",
    "Select the official brand when available.", "اختر العلامة الرسمية إذا كانت متوفرة.",
  );
  if (!input.sku.trim()) addTip(
    "sku", "product-inventory", "SKU", "رمز المخزون SKU",
    "An internal product code helps identify the right item.",
    "رمز داخلي يسهّل تمييز المنتج وتتبع المخزون.",
  );
  if (!input.barcode.trim()) addTip(
    "barcode", "product-inventory", "Barcode", "الباركود",
    "Enter the exact barcode if the manufacturer supplies one; do not invent it.",
    "أدخل الباركود الحقيقي إذا كان متوفراً، ولا تستخدم رقماً افتراضياً.",
  );
  if (!input.hasAnyImage && !input.isNew) addTip(
    "image", "product-media", "Product image", "صورة المنتج",
    "An image is strongly recommended for an existing product.",
    "يُنصح بإضافة صورة للمنتج المحفوظ.",
  );
  if (input.specificationFields > 0 && input.filledSpecifications === 0) addTip(
    "specifications", "product-specifications", "Technical specifications", "المواصفات التقنية",
    "Add verified facts from the product's exact model.",
    "أدخل المواصفات المؤكدة للموديل نفسه.",
  );
  if (!input.seoTitle.trim() || !input.seoDescription.trim()) addTip(
    "seo", "product-seo", "Search appearance", "ظهور المنتج في البحث",
    "A descriptive SEO title and description can improve how the listing appears.",
    "أضف عنوان SEO ووصفاً مختصراً لتحسين طريقة ظهور المنتج في البحث.",
  );
  if (Number(input.stock) === 0 && !input.validationErrors.stock) addTip(
    "zero-stock", "product-inventory", "Out-of-stock item", "المنتج غير متوفر",
    "The item may be published as out of stock. Verify this is intentional.",
    "يمكن نشر المنتج بكمية صفر؛ تأكد أن ذلك مقصود.",
  );

  const coreKeys: (keyof ProductReviewInput["validationErrors"])[] = ["title", "price", "stock"];
  const extraValidation = (Object.keys(FIELD_META) as (keyof ProductReviewInput["validationErrors"])[])
    .filter((key) => !coreKeys.includes(key) && Boolean(input.validationErrors[key]));
  const checksTotal = coreKeys.length + extraValidation.length +
    Number(input.isNew) + Number(input.specificationFields > 0);
  const checksPassed = coreKeys.filter((key) => !input.validationErrors[key]).length +
    Number(input.isNew && input.hasPublishImage) +
    Number(input.specificationFields > 0 && input.invalidSpecifications.length === 0);

  return {
    blockers, recommendations, checksPassed, checksTotal,
    canPublish: blockers.length === 0,
  };
}
