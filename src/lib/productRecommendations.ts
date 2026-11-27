import { parseDescription, splitSections } from "@/lib/productContent";
import { productOptionKind, productOptionValue } from "@/lib/productOptionDisplay";
import { buildProductHighlights, formatProductHighlight } from "@/lib/productPresentation";
import { productInStock, productPrimaryVariant } from "@/lib/productPricing";
import type { StoreProduct } from "@/lib/storeTypes";
import { primaryCategory } from "@/lib/taxonomy";

function recommendationCategory(product: StoreProduct) {
  const slug = primaryCategory(product)?.slug;
  return slug === "smartphone" ? "smartphones" : slug;
}

function comparableSpecs(product: StoreProduct, variant: ReturnType<typeof productPrimaryVariant>) {
  const { node } = product;
  const options = (variant?.selectedOptions ?? []).flatMap(({ name, value }) => {
    const kind = productOptionKind(name);
    return kind === "storage" || kind === "memory"
      ? [{ label: kind, value: productOptionValue(name, value) }]
      : [];
  });
  const groups = node.specificationGroups ?? [];
  const description = splitSections(parseDescription(node.descriptionHtml, node.description));
  const arabicDescription = splitSections(parseDescription(undefined, node.descriptionAr));
  const highlights = buildProductHighlights(
    [
      { title: "", rows: options },
      ...groups,
      ...groups.map(({ title, rows }) => ({
        title,
        rows: rows.flatMap(({ labelAr, value }) => (labelAr ? [{ label: labelAr, value }] : [])),
      })),
      { title: "", rows: [...description.specs, ...arabicDescription.specs] },
    ],
    node.title,
    6,
  );

  return new Map(highlights.map(({ key, value }) => [key, comparableSpec(key, value)]));
}

function comparableSpec(key: string, value: string): number | string {
  const text = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/(?<=\d)[,٬](?=\d{3}\b)/g, "")
    .replace(/٫/g, ".");

  if (key === "storage" || key === "ram") {
    const capacity = text.match(
      /(\d+(?:\.\d+)?)\s*(tb|gb|تيرابايت|جيجابايت|جيغابايت)(?![\p{L}\p{N}])/u,
    );
    if (capacity) return Number(capacity[1]) * (/^(?:tb|تيرا)/u.test(capacity[2]) ? 1024 : 1);
  }
  if (key === "battery" || key === "camera") {
    const unit =
      key === "battery"
        ? /([\d.]+)\s*(?:mah\b|مللي أمبير)/u
        : /([\d.]+)\s*(?:mp\b|ميغابكسل|ميجابكسل)/u;
    const amount = Number(text.match(unit)?.[1]);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return formatProductHighlight(key, text).replace(/\s+/g, "");
}

function specificationDistance(
  current: ReturnType<typeof comparableSpecs>,
  candidate: ReturnType<typeof comparableSpecs>,
) {
  if (!current.size) return 0;
  let distance = 0;
  for (const [key, value] of current) {
    const other = candidate.get(key);
    if (typeof value === "number" && typeof other === "number" && Math.max(value, other) > 0) {
      distance += Math.abs(value - other) / Math.max(value, other);
    } else if (other !== value) {
      distance += other === undefined ? 0.5 : 1;
    }
  }
  return distance / current.size;
}

export function rankProductRecommendations(
  current: StoreProduct,
  products: StoreProduct[],
  first: number,
) {
  const categoryId = current.node.categoryId;
  const category = recommendationCategory(current);
  if (first <= 0 || !(categoryId || category)) return [];

  const currentVariant = productPrimaryVariant(current);
  const currentPrice = currentVariant?.price ?? current.node.priceRange.minVariantPrice;
  const currentAmount = Number(currentPrice.amount);
  const hasCurrentPrice = Number.isFinite(currentAmount) && currentAmount > 0;
  const currentSpecs = comparableSpecs(current, currentVariant);

  return products
    .filter((product) => {
      const node = product.node;
      if (
        node.id === current.node.id ||
        node.handle === current.node.handle ||
        !productInStock(product)
      ) {
        return false;
      }
      if (categoryId && node.categoryId) return categoryId === node.categoryId;
      return Boolean(category && recommendationCategory(product) === category);
    })
    .flatMap((product) => {
      const variant = productPrimaryVariant(product);
      const price = variant?.price ?? product.node.priceRange.minVariantPrice;
      if (hasCurrentPrice && price.currencyCode !== currentPrice.currencyCode) return [];
      const amount = Number(price.amount);
      const priceDistance = !hasCurrentPrice
        ? 0
        : Number.isFinite(amount) && amount > 0
          ? Math.abs(amount - currentAmount) / currentAmount
          : Infinity;
      const specsDistance = currentSpecs.size
        ? specificationDistance(currentSpecs, comparableSpecs(product, variant))
        : 0;
      // A complete specification mismatch adds the equivalent of a 20% price gap.
      return [{ product, priceDistance, score: priceDistance + 0.2 * specsDistance }];
    })
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.priceDistance - b.priceDistance ||
        a.product.node.title.localeCompare(b.product.node.title, "en", { numeric: true }),
    )
    .slice(0, first)
    .map(({ product }) => product);
}
