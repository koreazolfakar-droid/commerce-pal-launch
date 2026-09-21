import { productPrimaryVariant, productCompareAt } from "@/lib/productPricing";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
import { Link } from "@tanstack/react-router";
import { Heart, Loader2, ShoppingCart } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/ProductImage";
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
import { resolveBrand } from "@/lib/taxonomy";
import { useLanguage } from "@/lib/i18n";

/** Compact premium tile used by homepage product grids and rails. */
export const CompactProductCard = memo(function CompactProductCard({
  product,
  className,
  listItem = false,
  eager = false,
  market = false,
}: {
  product: ShopifyProduct;
  className?: string;
  listItem?: boolean;
  eager?: boolean;
  market?: boolean;
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

  const wishlistButton = (
    <button
      type="button"
      onClick={() => toggleWishlist(node.handle)}
      aria-label={wishlisted ? `Remove ${node.title} from wishlist` : `Save ${node.title}`}
      aria-pressed={wishlisted}
      className={cn(
        "press absolute z-20 grid place-items-center rounded-full border border-border/65",
        "bg-background/95 text-muted-foreground shadow-sm backdrop-blur",
        "transition-[color,background-color,border-color,transform]",
        "hover:border-primary/35 hover:bg-background hover:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        market
          ? "market-wishlist-button end-1.5 top-1.5 !min-h-8 !min-w-8 h-8 w-8 after:absolute after:-inset-2 after:content-['']"
          : "end-2.5 top-2.5 h-9 w-9",
      )}
    >
      <Heart
        aria-hidden
        className={cn(
          market ? "h-[17px] w-[17px]" : "h-4 w-4",
          wishlisted && "fill-primary text-primary",
        )}
        strokeWidth={1.9}
      />
    </button>
  );

  const addButton = (
    <button
      type="button"
      onClick={handleAdd}
      disabled={isAdding || !variant || !inStock}
      aria-label={`Add ${node.title} to bag`}
      className={cn(
        "press grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground",
        "shadow-md transition-[opacity,transform,box-shadow]",
        "hover:scale-[1.03] hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:scale-100 disabled:opacity-40",
        market ? "h-11 w-11" : "h-9 w-9",
      )}
    >
      {isAdding ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <ShoppingCart aria-hidden className={market ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2} />
      )}
    </button>
  );

  if (market) {
    return (
      <article
        role={listItem ? "listitem" : undefined}
        className={cn(
          "market-product-card group relative flex h-full min-w-0 w-full flex-col",
          className,
        )}
      >
        <div className="market-product-media relative min-w-0">
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
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 31vw, 31vw"
              eager={eager}
              className="market-product-image"
              imageClassName={cn(
                "!p-[5%] transition-[transform,filter,opacity] duration-300 group-hover:scale-[1.035]",
                !inStock && "scale-[1.01] blur-[2px] opacity-70 grayscale-[0.12]",
              )}
            />
          </Link>

          {!inStock && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[5] bg-black/15 backdrop-blur-[0.5px]"
              />
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-2">
                <span className="rounded-full bg-red-600/95 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white shadow">
                  {t("soldOut")}
                </span>
              </div>
            </>
          )}

          {discount !== null && (
            <span className="absolute start-1.5 top-1.5 z-20 rounded-lg bg-destructive px-2 py-1 text-[9px] font-extrabold text-destructive-foreground shadow-sm sm:text-[10px]">
              {discount}% OFF
            </span>
          )}

          {wishlistButton}

          <div className="absolute -bottom-2 end-0.5 z-20">{addButton}</div>
        </div>

        <div className="market-product-copy flex min-w-0 flex-1 flex-col pt-3.5">
          {brand ? (
            <div className="mb-1 flex min-w-0 items-center gap-1">
              <BrandLogo slug={brand.slug} label={brand.label} size={14} className="rounded" />
              <span className="break-words text-[9px] font-bold uppercase leading-3 tracking-[0.045em] text-muted-foreground sm:text-[10px]">
                {brand.label}
              </span>
            </div>
          ) : null}

          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <bdi className="whitespace-nowrap text-[0.95rem] font-extrabold tracking-tight text-foreground sm:text-base">
              {formatPrice(price.amount, price.currencyCode)}
            </bdi>
            {discount !== null && compareAt && (
              <bdi className="whitespace-nowrap text-[10px] text-muted-foreground line-through sm:text-xs">
                {formatPrice(compareAt, price.currencyCode)}
              </bdi>
            )}
          </div>

          <Link
            to="/product/$handle"
            params={{ handle: node.handle }}
            className="mt-1 min-w-0"
          >
            <h3 className="break-words text-[0.8rem] font-medium leading-[1.45] text-foreground transition-colors group-hover:text-primary sm:text-sm">
              {node.title}
            </h3>
          </Link>

          {summary ? (
            <p className="mt-0.5 break-words text-[10px] leading-4 text-muted-foreground sm:text-xs">
              {summary}
            </p>
          ) : null}

          <p
            className={cn(
              "mt-1 text-[10px] font-semibold leading-4 sm:text-xs",
              inStock ? "text-success" : "text-destructive",
            )}
          >
            {inStock ? t("inStock") : t("outOfStock")}
          </p>
        </div>
      </article>
    );
  }

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

        {wishlistButton}
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

          {addButton}
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
