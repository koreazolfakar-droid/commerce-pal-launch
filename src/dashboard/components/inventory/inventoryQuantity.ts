export const MAX_INVENTORY_QUANTITY = 2_147_483_647;

export function parseInventoryQuantity(input: string): number | null {
  const normalized = input
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0));
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return value <= MAX_INVENTORY_QUANTITY ? value : null;
}
