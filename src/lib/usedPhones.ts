import type { StoreProduct } from "@/lib/storeTypes";

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

  const phoneSignal =
    /phone|smartphone|iphone|galaxy|pixel|redmi|xiaomi|oneplus|oppo|vivo|honor|huawei|هاتف|هواتف|جوال/.test(
      text,
    );
  return phoneSignal && USED_TERMS.some((term) => text.includes(term));
}

export function usedPhoneProducts(products: StoreProduct[]) {
  return products.filter(isUsedPhone);
}
