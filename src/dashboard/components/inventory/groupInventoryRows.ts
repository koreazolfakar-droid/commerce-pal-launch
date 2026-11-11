import type { InventoryRow } from "@/dashboard/data/inventory";

/**
 * Group *only the variants returned on this server-paginated page* by their
 * canonical product ID. Do not group by title, SKU, or option names: those
 * fields are not guaranteed unique.
 *
 * Totals here deliberately describe visible variants, never the entire product
 * or catalog. The dashboard_inventory_page RPC still paginates variants.
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
