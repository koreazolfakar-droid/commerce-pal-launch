import { productCompareAt, productPrimaryVariant } from "@/lib/productPricing";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
import { Link } from "@tanstack/react-router";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import {
  discountPercent,
  formatPrice,
  variantSummary,
  type ShopifyProduct,
} from "@/lib/shopify";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { resolveBrand } from "@/lib/taxonomy";
import { useLanguage } from "@/lib/i18n";

export const ProductListCard = memo(function ProductListCard({
  product,
  eager = false,
}: {
  product: ShopifyProduct;
  eager?: boolean;
}) {
  const { t } = useLanguage();
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
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

  const add = async () => {
    if (!variant) return;
    const success = await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions ?? [],
    });

    if (success) {
      toast.success(`${node.title}: ${t("addedToCart")}`, { position: "top-center" });
    } else {
      toast.error(t("addToCartFailed"), { position: "top-center" });
    }
  };

  return (
    <article className="product-list-card group !grid !grid-cols-[6.25rem_minmax(0,1fr)] !items-center !gap-3 !overflow-hidden !rounded-[1.35rem] !border !border-border/75 !bg-card !p-3 !shadow-card transition-[border-color,box-shadow,transform] hover:!border-primary/30 hover:!shadow-card-hover sm:!grid-cols-[7.5rem_minmax(0,1fr)] sm:!gap-4 sm:!p-4">
      <div className="relative flex min-w-0 self-center items-center justify-center">
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          aria-label={node.title}
          className="block w-full overflow-hidden rounded-[1rem] bg-white"
        >
          <ProductImage
            url={image?.url}
            alt={image?.altText ?? node.title}
            size={360}
            sizes="(min-width: 640px) 120px, 100px"
            eager={eager}
            className="!aspect-square !w-full"
            imageClassName="!p-[8%] transition-transform duration-300 group-hover:scale-[1.035]"
          />
        </Link>

        {discount !== null && (
          <span className="absolute start-1.5 top-1.5 z-20 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-destructive-foreground shadow-sm">
            -{discount}%
          </span>
        )}

        {!inStock && (
          <span className="absolute bottom-1.5 start-1.5 z-20 rounded-full bg-foreground/85 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-background">
            {t("soldOut")}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5 py-0.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {brand ? (
              <>
                <BrandLogo
                  slug={brand.slug}
                  label={brand.label}
                  size={16}
                  className="shrink-0 rounded-md"
                />
                <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.065em] text-muted-foreground sm:text-[11px]">
                  {brand.label}
                </span>
              </>
            ) : (
              <span aria-hidden className="h-4" />
            )}
          </div>

          <button
            type="button"
            onClick={() => toggleWishlist(node.handle)}
            aria-label={wishlisted ? `Remove ${node.title} from wishlist` : `Save ${node.title}`}
            aria-pressed={wishlisted}
            className="press grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border/70 bg-background/95 text-muted-foreground shadow-sm transition-[color,background-color,border-color,transform] hover:border-primary/40 hover:bg-background hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Heart
              aria-hidden
              className={cn("h-[18px] w-[18px]", wishlisted && "fill-primary text-primary")}
              strokeWidth={1.9}
            />
          </button>
        </div>

        <Link to="/product/$handle" params={{ handle: node.handle }} className="min-w-0">
          <h3 className="line-clamp-2 break-words text-[0.84rem] font-extrabold leading-[1.25] tracking-[-0.018em] transition-colors group-hover:text-primary sm:text-[0.95rem]">
            {node.title}
          </h3>
        </Link>

        {summary ? (
          <p className="truncate text-[11px] leading-4 text-muted-foreground sm:text-xs">
            {summary}
          </p>
        ) : (
          <span aria-hidden className="h-4" />
        )}

        <div className="mt-0.5 flex min-w-0 items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <bdi className="text-[0.98rem] font-extrabold leading-tight tracking-tight sm:text-[1.05rem]">
                {formatPrice(price.amount, price.currencyCode)}
              </bdi>
              {discount !== null && compareAt && (
                <bdi className="truncate text-[10px] text-muted-foreground line-through sm:text-[11px]">
                  {formatPrice(compareAt, price.currencyCode)}
                </bdi>
              )}
            </div>
            <p
              className={cn(
                "mt-1 truncate text-[10px] font-bold leading-none sm:text-[11px]",
                inStock ? "text-success" : "text-muted-foreground",
              )}
            >
              {t(inStock ? "inStock" : "outOfStock")}
            </p>
          </div>

          <Button
            onClick={add}
            disabled={isLoading || !variant || !inStock}
            size="sm"
            className="press h-11 min-w-[7.25rem] shrink-0 rounded-full px-3 text-xs font-bold shadow-sm sm:min-w-[8rem] sm:px-4"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                <span>{t(inStock ? "addToCart" : "outOfStock")}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
});
