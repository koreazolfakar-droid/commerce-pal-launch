import { productCompareAt, productPrimaryVariant } from "@/lib/productPricing";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
import { Link } from "@tanstack/react-router";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { discountPercent, formatPrice, variantSummary, type ShopifyProduct } from "@/lib/shopify";
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
        toast.success(`${node.title}: ${t("addedToCart")}`, {
          position: "top-center",
        });
      } else {
        toast.error(t("addToCartFailed"), { position: "top-center" });
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className="product-list-card group relative !grid !grid-cols-[minmax(5.5rem,30%)_minmax(0,1fr)] !items-center !gap-2.5 !overflow-hidden !rounded-[1.25rem] !border !border-border/75 !bg-card !p-2.5 !shadow-card transition-[border-color,box-shadow,transform] hover:!border-primary/30 hover:!shadow-card-hover sm:!grid-cols-[8.25rem_minmax(0,1fr)] sm:!gap-3 sm:!p-3">
      <div className="relative flex min-w-0 self-center items-center justify-center">
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          aria-label={node.title}
          className="block w-full overflow-hidden rounded-[0.95rem] bg-image-stage"
        >
          <ProductImage
            url={image?.url}
            alt={image?.altText ?? node.title}
            size={360}
            sizes="(min-width: 640px) 132px, 30vw"
            eager={eager}
            className="!aspect-square !w-full"
            imageClassName="!p-[6%] transition-transform duration-300 group-hover:scale-[1.035]"
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

      <button
        type="button"
        onClick={() => toggleWishlist(node.handle)}
        aria-label={wishlisted ? `Remove ${node.title} from wishlist` : `Save ${node.title}`}
        aria-pressed={wishlisted}
        className="product-card-secondary-action product-action-button press absolute end-2.5 top-2.5 z-30 grid h-9 w-9 place-items-center rounded-full border border-border/65 bg-background/95 text-muted-foreground shadow-sm transition-[color,background-color,border-color,transform] hover:border-primary/40 hover:bg-background hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:end-3 sm:top-3"
      >
        <Heart
          aria-hidden
          className={cn("h-[17px] w-[17px]", wishlisted && "fill-primary text-primary")}
          strokeWidth={1.9}
        />
      </button>

      <div className="flex min-w-0 flex-col gap-1">
        {brand && (
          <div className="flex min-w-0 items-center gap-1.5 pe-10">
            <BrandLogo
              slug={brand.slug}
              label={brand.label}
              size={18}
              frameless
              className="shrink-0"
            />
            <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.045em] text-muted-foreground sm:text-xs">
              {brand.label}
            </span>
          </div>
        )}

        <Link to="/product/$handle" params={{ handle: node.handle }} className="min-w-0 pe-10">
          <h3 className="product-card-title break-words text-sm font-semibold leading-[1.5] tracking-[-0.018em] transition-colors group-hover:text-primary sm:text-sm">
            {node.title}
          </h3>
        </Link>

        {summary && (
          <p className="truncate pe-10 text-xs leading-5 text-muted-foreground sm:text-[11px]">
            {summary}
          </p>
        )}

        <div className="mt-0.5 grid min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <bdi className="product-card-price truncate text-[0.94rem] font-extrabold leading-tight tracking-tight sm:text-base">
                {formatPrice(price.amount, price.currencyCode)}
              </bdi>
              {discount !== null && compareAt && (
                <bdi className="truncate text-[9px] text-muted-foreground line-through sm:text-[10px]">
                  {formatPrice(compareAt, price.currencyCode)}
                </bdi>
              )}
            </div>
            <p
              className={cn(
                "product-card-status mt-1 truncate text-xs font-medium leading-5",
                inStock ? "text-success" : "text-muted-foreground",
              )}
            >
              {t(inStock ? "inStock" : "outOfStock")}
            </p>
          </div>

          <Button
            onClick={add}
            disabled={isAdding || !variant || !inStock}
            size="sm"
            aria-label={t(inStock ? "addToCart" : "outOfStock")}
            className="product-card-primary-action press h-11 w-11 shrink-0 rounded-full p-0 shadow-sm sm:w-auto sm:min-w-[7.25rem] sm:px-3 sm:text-xs"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">{t(inStock ? "addToCart" : "outOfStock")}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
});
