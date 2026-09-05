import { Link } from "@tanstack/react-router";
import { Heart, Loader2, Plus } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/ProductImage";
import { CompareButton } from "@/components/CompareButton";
import { BrandLogo } from "@/components/BrandLogo";
import {
  discountPercent,
  formatPrice,
  variantSummary,
  type ShopifyProduct,
} from "@/lib/shopify";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { primaryCategory, resolveBrand } from "@/lib/taxonomy";

/** Compact rail/grid tile: optimized image, discount badge, quick add, price, stock. */
export const CompactProductCard = memo(function CompactProductCard({
  product,
  className,
}: {
  product: ShopifyProduct;
  className?: string;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const wishlisted = useWishlistStore((state) => state.handles.includes(product.node.handle));
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const node = product.node;
  const variant = node.variants.edges[0]?.node;
  const image = node.images.edges[0]?.node;
  const price = variant?.price ?? node.priceRange.minVariantPrice;
  const compareAt =
    variant?.compareAtPrice?.amount ?? node.compareAtPriceRange?.minVariantPrice.amount;
  const discount = discountPercent(price.amount, compareAt);
  const summary = variantSummary(variant?.selectedOptions);
  const inStock = variant?.availableForSale ?? node.availableForSale ?? true;
  const brand = resolveBrand(product);
  const isPhone = primaryCategory(product)?.slug === "smartphones";

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
    <article className={cn("group relative flex w-full flex-col", className)}>
      <div className="card-lift relative overflow-hidden rounded-2xl border">
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          aria-label={node.title}
          className="block"
        >
          <ProductImage
            url={image?.url}
            alt={image?.altText ?? node.title}
            size={320}
            sizes="(min-width: 1024px) 220px, 45vw"
            imageClassName="group-hover:scale-[1.06]"
          />
        </Link>

        {discount !== null && (
          <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold tracking-wide text-destructive-foreground">
            -{discount}%
          </span>
        )}
        {!inStock && (
          <span className="absolute left-2 bottom-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold text-background">
            Sold out
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            toggleWishlist(node.handle);
            toast.success(wishlisted ? "Removed from wishlist" : "Saved to wishlist", {
              position: "top-center",
            });
          }}
          aria-label={wishlisted ? `Remove ${node.title} from wishlist` : `Save ${node.title}`}
          aria-pressed={wishlisted}
          className="press absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:text-primary"
        >
          <Heart className={cn("h-4 w-4", wishlisted && "fill-primary text-primary")} />
        </button>
        {isPhone && <CompareButton handle={node.handle} compact className="absolute right-2 top-12 h-8 w-8" />}

        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading || !variant || !inStock}
          aria-label={`Add ${node.title} to bag`}
          className="press absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-card-hover transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-1">
        {brand && (
          <div className="flex min-w-0 items-center gap-1.5">
            <BrandLogo slug={brand.slug} label={brand.label} size={18} className="rounded-md" />
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {brand.label}
            </p>
          </div>
        )}
        <Link to="/product/$handle" params={{ handle: node.handle }} className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2.25rem] text-[13px] font-semibold leading-snug transition-colors group-hover:text-primary">
            {node.title}
          </h3>
        </Link>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-bold tracking-tight">
            {formatPrice(price.amount, price.currencyCode)}
          </span>
          {discount !== null && compareAt && (
            <span className="text-[11px] text-muted-foreground line-through">
              {formatPrice(compareAt, price.currencyCode)}
            </span>
          )}
        </div>
        {summary && (
          <p className="truncate text-[11px] text-muted-foreground">{summary}</p>
        )}
      </div>
    </article>
  );
});
