export type ProductDraft = {
  title: string;
  price: string;
  compareAt?: string;
  sku: string;
  stock: string;
};

export function validateProductDraft(draft: ProductDraft) {
  const errors: Partial<Record<keyof ProductDraft, string>> = {};
  const title = draft.title.trim();
  const price = Number(draft.price);
  const compareAt = draft.compareAt?.trim() ? Number(draft.compareAt) : null;
  const stock = Number(draft.stock);

  if (!title) {
    errors.title = "Product title is required";
  } else if (title.length > 180) {
    errors.title = "Product title must be 180 characters or fewer";
  }

  if (!draft.price.trim() || !Number.isFinite(price) || price <= 0) {
    errors.price = "Price must be a finite number greater than zero";
  }

  if (compareAt !== null) {
    if (!Number.isFinite(compareAt) || compareAt < 0) {
      errors.compareAt = "Compare-at price must be a valid non-negative number";
    } else if (Number.isFinite(price) && compareAt < price) {
      errors.compareAt = "Compare-at price cannot be lower than the selling price";
    }
  }

  if (
    draft.stock.trim() === "" ||
    !Number.isFinite(stock) ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    errors.stock = "Stock must be a non-negative whole number";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
