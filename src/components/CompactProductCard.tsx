import { productPrimaryVariant, productCompareAt } from "@/lib/productPricing";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
import { Link } from "@tanstack/react-router";
import { Heart, Loader2, ShoppingCart } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/ProductImage";
import { BrandLogo } from "@/components/BrandLogo";
import { discountPercent, formatPrice, variantSummary, type ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { resolveBrand } from "@/lib/taxonomy";
import { useLanguage } from "@/lib/i18n";

/** Compact premium tile used by homepage product grids and rails. */
export const CompactProductCard = memo(function CompactProductCard({
  product,
  className,
  listItem = false,
  eager = false,
}: {
  product: ShopifyProduct;
  className?: string;
  listItem?: boolean;
  eager?: boolean;
}) {
  const { t } = useLanguage();
  const addItem = useCartStore((state) => state.addItem);
  const [isAdding, setIsAdding] = useState(false);
  const wishlisted = useWishlistStore((state) => state.handles.includes(product.node.handle));
  const toggleWishlist = useWishlistToggle();

  const node = product.node;
  const variant = productPrimaryVariant(product);
  const image = node.images.edges[0]?.node;
  const price = variant?.price ?? node.priceRange.minVariantPrice;
  const compareAt = productCompareAt(product);
  const discount = discountPercent(price.amount, compareAt);
  const summary = variantSummary(variant?.selectedOptions);
  const inStock = variant?.availableForSale ?? node.availableForSale ?? true;
  const brand = resolveBrand(product);

  const handleAdd = async () => {
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
      if (success)
        toast.success(`${node.title}: ${t("addedToCart")}`, {
          position: "top-center",
        });
      else toast.error(t("addToCartFailed"), { position: "top-center" });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article
      role={listItem ? "listitem" : undefined}
      className={cn(
        "sc-product-card group relative flex h-full min-w-0 w-full flex-col overflow-hidden rounded-[1.15rem] border border-border/75 bg-card shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card-hover",
        className,
      )}
    >
      <div className="relative bg-image-stage">
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          aria-label={node.title}
          className="block"
        >
          <ProductImage
            url={image?.url}
            alt={image?.altText ?? node.title}
            size={280}
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 31vw, 44vw"
            eager={eager}
            imageClassName={cn(
              "transition-[transform,filter,opacity] duration-300 group-hover:scale-[1.045]",
              !inStock && "scale-[1.01] blur-[2px] opacity-70 grayscale-[0.12]",
            )}
          />
        </Link>

        {!inStock && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[5] bg-black/20 backdrop-blur-[0.6px]"
            />
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-3">
              <span className="rounded-full border border-red-300/70 bg-red-600/95 px-3.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.11em] text-white shadow-lg shadow-red-950/20 backdrop-blur-md sm:px-4 sm:py-2 sm:text-[10px]">
                {t("soldOut")}
              </span>
            </div>
          </>
        )}
        {discount !== null && (
          <span className="absolute start-2.5 top-2.5 z-20 rounded-full bg-destructive px-2 py-0.5 text-[9px] font-bold tracking-wide text-destructive-foreground">
            -{discount}%
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            toggleWishlist(node.handle);
          }}
          aria-label={wishlisted ? `Remove ${node.title} from wishlist` : `Save ${node.title}`}
          aria-pressed={wishlisted}
          className="press absolute end-2.5 top-2.5 z-20 grid h-9 w-9 place-items-center rounded-full border border-border/65 bg-background/92 text-muted-foreground shadow-sm backdrop-blur transition-[color,background-color,border-color,transform] hover:border-primary/35 hover:bg-background hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Heart
            aria-hidden
            className={cn("h-4 w-4", wishlisted && "fill-primary text-primary")}
            strokeWidth={1.9}
          />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 px-2.5 pb-2.5 pt-1 sm:px-3 sm:pb-3 sm:pt-1.5">
        <div className="flex min-h-4 min-w-0 items-center gap-1.5">
          {brand ? (
            <>
              <BrandLogo slug={brand.slug} label={brand.label} size={16} className="rounded" />
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.055em] text-foreground sm:text-[11px]">
                {brand.label}
              </p>
            </>
          ) : (
            <span className="invisible text-[10px]" aria-hidden="true">
              Brand
            </span>
          )}
        </div>

        <Link to="/product/$handle" params={{ handle: node.handle }} className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2.35rem] break-words text-[0.82rem] font-semibold leading-[1.35] transition-colors group-hover:text-primary sm:text-sm">
            {node.title}
          </h3>
        </Link>

        <div className="mt-auto flex min-h-9 min-w-0 items-center justify-between gap-2 pt-0.5">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <bdi className="text-[0.95rem] font-extrabold tracking-tight sm:text-base">
                {formatPrice(price.amount, price.currencyCode)}
              </bdi>
              {discount !== null && compareAt && (
                <bdi className="truncate text-[10px] text-muted-foreground line-through sm:text-xs">
                  {formatPrice(compareAt, price.currencyCode)}
                </bdi>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding || !variant || !inStock}
            aria-label={`Add ${node.title} to bag`}
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-[opacity,transform,box-shadow] hover:scale-[1.03] hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:scale-100 disabled:opacity-40"
          >
            {isAdding ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart aria-hidden className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>

        <p
          className={cn(
            "min-h-4 truncate text-[10px] leading-4 text-muted-foreground sm:text-xs",
            !summary && "invisible",
          )}
          aria-hidden={!summary ? "true" : undefined}
        >
          {summary || "\u00a0"}
        </p>
      </div>
    </article>
  );
});
