import { Link } from "@tanstack/react-router";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  discountPercent,
  formatPrice,
  variantSummary,
  type ShopifyProduct,
} from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

export function ProductCard({
  product,
  badge,
  className,
}: {
  product: ShopifyProduct;
  badge?: string;
  className?: string;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const wishlisted = useWishlistStore((state) => state.handles.includes(product.node.handle));
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const node = product.node;
  const selectedVariant = node.variants.edges[0]?.node;
  const image = node.images.edges[0]?.node;
  const price = selectedVariant?.price ?? node.priceRange.minVariantPrice;
  const compareAt =
    selectedVariant?.compareAtPrice?.amount ?? node.compareAtPriceRange?.minVariantPrice.amount;
  const discount = discountPercent(price.amount, compareAt);
  const summary = variantSummary(selectedVariant?.selectedOptions);
  const inStock = selectedVariant?.availableForSale ?? node.availableForSale ?? true;
  const brand = node.vendor;

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    await addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions ?? [],
    });
    toast.success(`${node.title} added to your bag`, { position: "top-center" });
  };

  const handleWishlist = () => {
    toggleWishlist(node.handle);
    toast.success(wishlisted ? "Removed from wishlist" : "Saved to wishlist", {
      position: "top-center",
    });
  };

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-shadow hover:shadow-card-hover",
        className,
      )}
    >
      <div className="relative">
        {badge && (
          <span className="absolute left-3 top-3 z-10 rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-accent-foreground">
            {badge}
          </span>
        )}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wishlisted}
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border bg-background/90 text-muted-foreground transition-colors hover:text-primary"
        >
          <Heart className={cn("h-4 w-4", wishlisted && "fill-primary text-primary")} />
        </button>
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          className="block aspect-square overflow-hidden bg-surface"
        >
          {image ? (
            <img
              src={image.url}
              alt={image.altText ?? node.title}
              loading="lazy"
              width={480}
              height={480}
              className="h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {brand && (
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {brand}
          </p>
        )}
        <Link to="/product/$handle" params={{ handle: node.handle }} className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-snug">{node.title}</h3>
        </Link>
        <p className="min-h-4 truncate text-xs text-muted-foreground">{summary}</p>

        {/* Rating slot — intentionally empty until a real review integration supplies data. */}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-base font-bold">
            {formatPrice(price.amount, price.currencyCode)}
          </span>
          {discount !== null && compareAt && (
            <>
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(compareAt, price.currencyCode)}
              </span>
              <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
                -{discount}%
              </span>
            </>
          )}
        </div>

        <p className={cn("text-xs font-medium", inStock ? "text-success" : "text-muted-foreground")}>
          {inStock ? "In stock" : "Out of stock"}
        </p>

        <Button
          onClick={handleAddToCart}
          disabled={isLoading || !selectedVariant || !inStock}
          className="mt-3 w-full"
          size="sm"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to cart"}
        </Button>
      </div>
    </article>
  );
}
