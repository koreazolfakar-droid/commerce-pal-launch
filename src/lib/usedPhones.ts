import type { StoreProduct } from "@/lib/storeTypes";
import { primaryCategory } from "@/lib/taxonomy";

const USED_TERMS = [
  "used",
  "pre-owned",
  "preowned",
  "refurbished",
  "renewed",
  "second hand",
  "second-hand",
  "مستعمل",
  "مستعملة",
  "مجدد",
  "مجددة",
  "مستخدم",
  "مستخدمة",
];

export function isUsedPhone(product: StoreProduct) {
  const node = product.node;
  const text = [
    node.title,
    node.productType,
    node.vendor,
    ...(node.tags ?? []),
    ...(node.collections?.edges ?? []).flatMap((edge) => [edge.node.handle, edge.node.title]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Resolve the item itself: a brand or compatibility mention is not a phone.
  const category = primaryCategory(product);
  // Managed categories preserve their merchant slug (e.g. "smartphone"),
  // while legacy taxonomy uses "smartphones" for the same product kind.
  const phoneCategory =
    category &&
    [category.slug, category.label].some((value) =>
      /^(?:smart[ -]?phones?|phones?|used-phones|هاتف(?: ذكي)?|هواتف(?: ذكية)?)$/iu.test(
        value.trim(),
      ),
    );
  if (category && !phoneCategory) return false;
  if (
    !category &&
    !/(?:^|[^\p{L}\p{N}])(?:smartphones?|phones?|iphone|galaxy|pixel|هاتف|هواتف|جوال)(?:$|[^\p{L}\p{N}])/u.test(
      text,
    )
  )
    return false;
  return USED_TERMS.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, "u").test(text);
  });
}

export function usedPhoneProducts(products: StoreProduct[]) {
  return products.filter(isUsedPhone);
}
