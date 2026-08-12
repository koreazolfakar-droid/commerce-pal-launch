import { Link } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  discountPercent,
  formatPrice,
  variantSummary,
  type ShopifyProduct,
} from "@/lib/shopify";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";

/** Compact app-style product tile: image, discount badge, quick add, price, name, variant. */
export function CompactProductCard({
  product,
  className,
}: {
  product: ShopifyProduct;
  className?: string;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);

  const node = product.node;
  const variant = node.variants.edges[0]?.node;
  const image = node.images.edges[0]?.node;
  const price = variant?.price ?? node.priceRange.minVariantPrice;
  const compareAt =
    variant?.compareAtPrice?.amount ?? node.compareAtPriceRange?.minVariantPrice.amount;
  const discount = discountPercent(price.amount, compareAt);
  const summary = variantSummary(variant?.selectedOptions);
  const inStock = variant?.availableForSale ?? node.availableForSale ?? true;

  const handleAdd = async () => {
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions ?? [],
    });
    toast.success(`${node.title} added to your bag`, { position: "top-center" });
  };

  return (
    <article className={cn("relative flex w-full flex-col", className)}>
      <div className="relative">
        {discount !== null && (
          <span className="absolute left-0 top-0 z-10 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
            {discount}% OFF
          </span>
        )}
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          className="block aspect-square overflow-hidden rounded-lg bg-surface"
        >
          {image ? (
            <img
              src={image.url}
              alt={image.altText ?? node.title}
              loading="lazy"
              width={320}
              height={320}
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <span className="grid h-full place-items-center text-xs text-muted-foreground">
              No image
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading || !variant || !inStock}
          aria-label={`Add ${node.title} to bag`}
          className="absolute -bottom-2 right-0 grid h-8 w-8 place-items-center rounded-full border bg-card text-primary shadow-card transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      <Link to="/product/$handle" params={{ handle: node.handle }} className="mt-3 block">
        <h3 className="line-clamp-2 text-xs font-medium leading-snug hover:text-primary">
          {node.title}
        </h3>
      </Link>
      <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
        <span className="text-sm font-semibold">
          {formatPrice(price.amount, price.currencyCode)}
        </span>
        {discount !== null && compareAt && (
          <span className="text-[11px] text-muted-foreground line-through">
            {formatPrice(compareAt, price.currencyCode)}
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{summary}</p>
      <p
        className={cn(
          "mt-0.5 text-[11px] font-medium",
          inStock ? "text-success" : "text-destructive",
        )}
      >
        {inStock ? "In stock" : "Out of stock"}
      </p>
    </article>
  );
}
