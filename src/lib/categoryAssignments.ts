import type { StoreProduct } from "@/lib/storeTypes";

export type ManagedCategoryIdentity = {
  id: string;
  name: string;
};

/**
 * A managed category's UUID is authoritative, even if its name changes or
 * Product Type contains a custom merchandising label. Only legacy products
 * without a category assignment may use the old name-based matching.
 */
export function productsInManagedCategory(
  products: StoreProduct[],
  category: ManagedCategoryIdentity,
): StoreProduct[] {
  const normalizedName = category.name.trim().toLocaleLowerCase();

  return products.filter(({ node }) => {
    if (node.categoryId) return node.categoryId === category.id;
    return (node.productType?.trim().toLocaleLowerCase() ?? "") === normalizedName;
  });
}
