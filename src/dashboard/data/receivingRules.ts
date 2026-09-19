/** Receiving preview rules. Approval must revalidate these against locked PO rows
 * on the server; this module never authorizes or mutates inventory.
 */
export type ReceivingLineInput = {
  /** Ordered quantity still awaiting usable stock before this receipt. */
  remainingQuantity: number;
  /** Usable units only; damaged units are recorded separately. */
  receivedQuantity: number;
  damagedQuantity: number;
  overageConfirmed?: boolean;
  overageReason?: string;
};

const MAX_QUANTITY = 2_147_483_647;

function quantity(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0 || value > MAX_QUANTITY) {
    throw new Error(`${name} must be a non-negative whole number within the stock limit.`);
  }
  return value;
}

export function previewReceivingLine(input: ReceivingLineInput) {
  const remaining = quantity(input.remainingQuantity, "Remaining quantity");
  const received = quantity(input.receivedQuantity, "Received quantity");
  const damaged = quantity(input.damagedQuantity, "Damaged quantity");
  const deliveredQuantity = quantity(received + damaged, "Delivered quantity");
  const difference = deliveredQuantity - remaining;
  const overageQuantity = Math.max(0, difference);
  const overageReason = (input.overageReason ?? "").trim();
  const hasOverage = overageQuantity > 0;
  const errors: string[] = [];

  if (deliveredQuantity === 0) errors.push("Enter at least one received or damaged unit.");
  if (hasOverage && input.overageConfirmed !== true) {
    errors.push("Confirm the warning before receiving more than the remaining PO quantity.");
  }
  if (hasOverage && !overageReason) errors.push("A reason is required for excess delivery.");
  if (overageReason.length > 500) errors.push("The excess delivery reason must be 500 characters or fewer.");

  return {
    deliveredQuantity,
    stockIncrease: received,
    damagedQuantity: damaged,
    difference,
    // Missing means physically absent, distinct from delivered but damaged.
    missingQuantity: Math.max(0, -difference),
    // Damaged units do not fulfill the order's requirement for usable stock.
    remainingUsableQuantity: Math.max(0, remaining - received),
    overageQuantity,
    requiresOverageConfirmation: hasOverage,
    overageReason: hasOverage ? overageReason : null,
    canSubmit: errors.length === 0,
    errors,
  };
}
