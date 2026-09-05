import { Link } from "@tanstack/react-router";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/ProductImage";
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

/** Full product card used across grids (shop, category, brand, search, wishlist). */
export const ProductCard = memo(function ProductCard({
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
        "card-lift group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card",
        className,
      )}
    >
      <div className="relative border-b">
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          aria-label={node.title}
          className="block"
        >
          <ProductImage
            url={image?.url}
            alt={image?.altText ?? node.title}
            size={480}
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 45vw"
            imageClassName="group-hover:scale-[1.05]"
          />
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {badge && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
              {badge}
            </span>
          )}
          {discount !== null && (
            <span className="rounded-full bg-destructive px-2.5 py-1 text-[10px] font-bold text-destructive-foreground">
              -{discount}%
            </span>
          )}
          {!inStock && (
            <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-[10px] font-semibold text-background">
              Sold out
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wishlisted}
          className="press absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/85 text-muted-foreground backdrop-blur transition-colors hover:text-primary"
        >
          <Heart className={cn("h-4 w-4", wishlisted && "fill-primary text-primary")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {brand && (
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
            {brand}
          </p>
        )}
        <Link to="/product/$handle" params={{ handle: node.handle }} className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {node.title}
          </h3>
        </Link>
        {summary && <p className="truncate text-xs text-muted-foreground">{summary}</p>}

        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base font-bold tracking-tight">
            {formatPrice(price.amount, price.currencyCode)}
          </span>
          {discount !== null && compareAt && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(compareAt, price.currencyCode)}
            </span>
          )}
        </div>

        <p
          className={cn(
            "mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium",
            inStock ? "text-success" : "text-muted-foreground",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              inStock ? "bg-success" : "bg-muted-foreground",
            )}
          />
          {inStock ? "In stock" : "Out of stock"}
        </p>

        <div className="mt-auto pt-3">
          <Button
            onClick={handleAddToCart}
            disabled={isLoading || !selectedVariant || !inStock}
            className="press w-full rounded-xl"
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                {inStock ? "Add to cart" : "Out of stock"}
              </>
            )}
          </Button>
        </div>
      </div>

    </article>
  );
});
