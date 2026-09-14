import { useState } from "react";
import { toast } from "sonner";

import type { TranslationKey } from "@/lib/i18n";
import type { ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

type ShopifyVariant = ShopifyProduct["node"]["variants"]["edges"][number]["node"];
type Translate = (key: TranslationKey) => string;

/** Shared quick-add state and Shopify cart mutation used by product-card variants. */
export function useProductQuickAdd(
  product: ShopifyProduct,
  variant: ShopifyVariant | undefined,
  t: Translate,
) {
  const addItem = useCartStore((state) => state.addItem);
  const [isAdding, setIsAdding] = useState(false);

  const add = async () => {
    if (!variant || isAdding) return;

    setIsAdding(true);
    try {
      const success = await addItem({
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        quantity: 1,
        selectedOptions: variant.selectedOptions ?? [],
      });

      if (success) {
        toast.success(`${product.node.title}: ${t("addedToCart")}`, { position: "top-center" });
      } else {
        toast.error(t("addToCartFailed"), { position: "top-center" });
      }
    } finally {
      setIsAdding(false);
    }
  };

  return { add, isAdding };
}
