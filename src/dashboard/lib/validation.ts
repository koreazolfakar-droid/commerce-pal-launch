export type ProductDraft = {
  title: string;
  price: string;
  compareAt?: string;
  sku: string;
  stock: string;
  productType?: string;
  tags?: string;
  titleAr?: string;
  descriptionAr?: string;
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

  if ((draft.productType?.trim().length ?? 0) > 120)
    errors.productType = "Product type must be 120 characters or fewer";
  if ((draft.titleAr?.trim().length ?? 0) > 180)
    errors.titleAr = "Product title must be 180 characters or fewer";
  if ((draft.descriptionAr?.trim().length ?? 0) > 5000)
    errors.descriptionAr = "Arabic description must be 5000 characters or fewer";
  const tags = (draft.tags ?? "")
    .split(/[,،\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (tags.length > 250 || tags.some((tag) => tag.length > 255))
    errors.tags = "Use at most 250 tags of 255 characters each";

  return { valid: Object.keys(errors).length === 0, errors };
}
