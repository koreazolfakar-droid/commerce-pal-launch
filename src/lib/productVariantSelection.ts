/** Keep every displayed product option tied to a real, purchasable Dashboard variant. */
export type SelectableProductVariant = {
  id: string;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
};

export function defaultProductVariant<T extends SelectableProductVariant>(
  variants: readonly T[],
): T | undefined {
  return variants.find((variant) => variant.availableForSale) ?? variants[0];
}

export function optionsForVariant(
  variant: SelectableProductVariant | undefined,
): Record<string, string> {
  return Object.fromEntries(
    (variant?.selectedOptions ?? []).map(({ name, value }) => [name, value]),
  );
}

/**
 * Keep all other option choices where possible; otherwise move to an available
 * matching variant instead of silently displaying the first unrelated variant.
 */
export function selectProductVariant<T extends SelectableProductVariant>(
  variants: readonly T[],
  current: SelectableProductVariant | undefined,
  optionName: string,
  optionValue: string,
): T | undefined {
  const choices = variants.filter(
    (variant) =>
      variant.availableForSale &&
      variant.selectedOptions.some(
        (option) => option.name === optionName && option.value === optionValue,
      ),
  );
  if (!choices.length) return undefined;

  const currentOptions = optionsForVariant(current);
  return (
    choices.find((variant) =>
      variant.selectedOptions.every(
        (option) =>
          option.name === optionName || currentOptions[option.name] === option.value,
      ),
    ) ?? choices[0]
  );
}
