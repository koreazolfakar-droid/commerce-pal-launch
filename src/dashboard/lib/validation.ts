export type ProductDraft = { title: string; price: string; sku: string; stock: string };

export function validateProductDraft(draft: ProductDraft) {
  const errors: Partial<Record<keyof ProductDraft, string>> = {};
  if (!draft.title.trim()) errors.title = "Product title is required";
  if (!draft.sku.trim()) errors.sku = "SKU is required";
  if (!draft.price || Number(draft.price) <= 0) errors.price = "Price must be greater than zero";
  if (draft.stock === "" || Number(draft.stock) < 0) errors.stock = "Stock cannot be negative";
  return { valid: Object.keys(errors).length === 0, errors };
}
