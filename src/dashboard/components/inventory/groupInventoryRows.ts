import type { InventoryRow } from "@/dashboard/data/inventory";

/**
 * Groups variant rows supplied by the current server-paginated page using
 * canonical product IDs, never names or SKUs.
 *
 * The new product-level RPC returns *all* variants for each matching product.
 * The legacy RPC fallback may still return only a portion of a product when
 * variants cross a page boundary. The caller must label that mode accordingly.
 */
export type InventoryProductGroup = {
  productId: string;
  productName: string;
  brand: string;
  category: string;
  image: string;
  variants: InventoryRow[];
  visibleTrackedUnits: number;
  trackedCount: number;
  lowCount: number;
  outCount: number;
};

export function groupInventoryRows(
  rows: InventoryRow[],
  threshold: number,
): InventoryProductGroup[] {
  const byProduct = new Map<string, InventoryProductGroup>();
  for (const row of rows) {
    let group = byProduct.get(row.productId);
    if (!group) {
      group = {
        productId: row.productId,
        productName: row.productName,
        brand: row.brand,
        category: row.category,
        image: row.image,
        variants: [],
        visibleTrackedUnits: 0,
        trackedCount: 0,
        lowCount: 0,
        outCount: 0,
      };
      byProduct.set(row.productId, group);
    }
    group.variants.push(row);
    if (!group.image && row.image) group.image = row.image;
    if (!row.trackInventory) continue;
    group.trackedCount += 1;
    group.visibleTrackedUnits += row.stock;
    if (row.stock <= 0) group.outCount += 1;
    else if (row.stock <= threshold) group.lowCount += 1;
  }
  return Array.from(byProduct.values());
}
