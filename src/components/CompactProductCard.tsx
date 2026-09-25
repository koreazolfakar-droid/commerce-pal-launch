import {
  discountPercent,
  formatPrice,
  productCompareAt,
  productPrimaryVariant,
  variantSummary,
} from "@/lib/productPricing";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
import { Link } from "@tanstack/react-router";
import { Heart, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";
import { memo, useRef, useState } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/ProductImage";
import { BrandLogo } from "@/components/BrandLogo";
import type { StoreProduct } from "@/lib/storeTypes";
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
  borderless = false,
}: {
  product: StoreProduct;
  className?: string;
  listItem?: boolean;
  eager?: boolean;
  market?: boolean;
  borderless?: boolean;
}) {
  const { t } = useLanguage();
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const cartItems = useCartStore((state) => state.items);
  const [isAdding, setIsAdding] = useState(false);
  const replacementAddButtonRef = useRef<HTMLButtonElement>(null);
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
  const cartQuantity = variant
    ? cartItems.find((item) => item.variantId === variant.id)?.quantity ?? 0
    : 0;

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

  const handleQuantityChange = async (nextQuantity: number) => {
    if (!variant || isAdding) return;
    setIsAdding(true);
    try {
      await updateQuantity(variant.id, nextQuantity);
    } finally {
      setIsAdding(false);
    }
  };

  /** Keeps keyboard focus stable when decrementing the final cart item back to the add button. */
  const handleDecrement = async (currentQuantity: number, trigger: HTMLButtonElement) => {
    const restoreFocus =
      currentQuantity === 1 && typeof document !== "undefined" && document.activeElement === trigger;

    await handleQuantityChange(currentQuantity - 1);

    if (restoreFocus && typeof window !== "undefined") {
      window.requestAnimationFrame(() => replacementAddButtonRef.current?.focus());
    }
  };

  const wishlistButton = (
    <button
      type="button"
      onClick={() => toggleWishlist(node.handle)}
      aria-label={wishlisted ? `Remove ${node.title} from wishlist` : `Save ${node.title}`}
      aria-pressed={wishlisted}
      className={cn(
        "product-card-secondary-action product-action-button press absolute z-20 grid place-items-center rounded-full border border-border/65",
        "bg-background/95 text-muted-foreground shadow-sm backdrop-blur",
        "transition-[color,background-color,border-color,transform]",
        "hover:border-primary/35 hover:bg-background hover:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        market
          ? "market-product-action market-wishlist-button end-2 top-2 h-[38px] w-[38px]"
          : "end-2.5 top-2.5 h-9 w-9",
      )}
    >
      <Heart
        aria-hidden
        className={cn(
          market ? "h-4 w-4" : "h-4 w-4",
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
        "product-card-primary-action product-action-button press relative grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground",
        "shadow-md transition-[opacity,transform,box-shadow]",
        "hover:scale-[1.03] hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:scale-100 disabled:opacity-40",
        market
          ? "market-product-action h-9 w-9"
          : "h-9 w-9",
      )}
    >
      {isAdding ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <ShoppingCart
          aria-hidden
          className={market ? "h-[17px] w-[17px]" : "h-4 w-4"}
          strokeWidth={1.9}
        />
      )}
    </button>
  );

  if (borderless) {
    return (
      <article
        role={listItem ? "listitem" : undefined}
        className={cn("group flex h-full min-w-0 w-full flex-col", className)}
      >
        <div className="relative min-w-0">
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
              sizes="(min-width: 1024px) 220px, (min-width: 640px) 24vw, 31vw"
              eager={eager}
              className="aspect-square w-full !bg-image-stage"
              imageClassName={cn(
                "!bg-image-stage !p-[7%] transition-[transform,filter,opacity] duration-200 group-hover:scale-[1.025]",
                !inStock && "blur-[2px] opacity-65 grayscale-[0.12]",
              )}
            />
          </Link>

          {!inStock && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="rounded-full bg-red-600/95 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-white">
                {t("soldOut")}
              </span>
            </div>
          )}

          {discount !== null && (
            <span className="absolute start-0 top-0 rounded-md bg-destructive px-1.5 py-0.5 text-[8px] font-bold text-destructive-foreground">
              -{discount}%
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col pt-1.5 sm:pt-2">
          <div className="flex min-h-4 items-center">
            {brand ? (
              <p className="truncate text-[10px] font-medium leading-4 text-muted-foreground sm:text-[11px]">
                {brand.label}
              </p>
            ) : (
              <span className="invisible text-[10px] leading-4" aria-hidden="true">
                Brand
              </span>
            )}
          </div>

          <bdi className="mt-0.5 whitespace-nowrap text-[0.86rem] font-semibold leading-[1.2] tabular-nums tracking-tight text-foreground sm:text-[0.95rem]">
            {formatPrice(price.amount, price.currencyCode)}
          </bdi>

          <Link to="/product/$handle" params={{ handle: node.handle }} className="mt-1 min-w-0">
            <h3 className="product-card-title line-clamp-2 min-h-[2.1rem] break-words text-[0.72rem] font-medium leading-[1.42] text-foreground sm:min-h-[2.45rem] sm:text-sm">
              {node.title}
            </h3>
          </Link>

          <p
            className={cn(
              "mt-0.5 min-h-4 truncate text-[9px] leading-4 text-muted-foreground sm:text-[10px]",
              !summary && "invisible",
            )}
            aria-hidden={!summary ? "true" : undefined}
          >
            {summary || "\u00a0"}
          </p>

          <div className="mt-1.5 flex min-h-9 items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex min-w-0 items-center gap-1.5 truncate text-[10px] font-medium leading-4 sm:text-[11px]",
                inStock ? "text-success" : "text-destructive",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  inStock ? "bg-success" : "bg-destructive",
                )}
              />
              {inStock ? t("inStock") : t("outOfStock")}
            </span>

            {cartQuantity > 0 ? (
              <div
                className="inline-flex h-9 shrink-0 items-center overflow-hidden rounded-full border border-border/70 bg-background text-primary shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                aria-label={`${node.title} quantity ${cartQuantity}`}
              >
                <button
                  type="button"
                  onClick={(event) => void handleDecrement(cartQuantity, event.currentTarget)}
                  disabled={isAdding}
                  aria-label={`Decrease ${node.title} quantity`}
                  className="press grid h-full w-8 place-items-center transition-colors hover:bg-primary/10 disabled:opacity-40"
                >
                  <Minus aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <span className="min-w-5 px-0.5 text-center text-[11px] font-semibold tabular-nums">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(cartQuantity + 1)}
                  disabled={isAdding || !inStock}
                  aria-label={`Increase ${node.title} quantity`}
                  className="press grid h-full w-8 place-items-center transition-colors hover:bg-primary/10 disabled:opacity-40"
                >
                  {isAdding ? (
                    <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </button>
              </div>
            ) : (
              <button
                ref={replacementAddButtonRef}
                type="button"
                onClick={handleAdd}
                disabled={isAdding || !variant || !inStock}
                aria-label={`Add ${node.title} to bag`}
                className="press grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 bg-background text-primary shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-[background-color,color,border-color,transform,box-shadow] hover:border-primary/35 hover:bg-primary/10 hover:shadow-sm active:scale-95 disabled:opacity-40"
              >
                {isAdding ? (
                  <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus aria-hidden className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  if (market) {
    return (
      <article
        role={listItem ? "listitem" : undefined}
        className={cn(
          "market-product-card group relative flex h-full min-w-0 w-full flex-col overflow-hidden border border-border/75 bg-card shadow-card transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover",
          className,
        )}
      >
        <div className="product-card-media market-product-media relative min-w-0">
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
                "!p-[3%] sm:!p-[4%] transition-[transform,filter,opacity] duration-300 group-hover:scale-[1.035]",
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

        </div>

        <div className="product-card-body market-product-copy market-product-copy-grid min-w-0 p-2.5 sm:p-3">
          <div className="market-product-brand flex min-h-4 min-w-0 items-center">
            {brand ? (
              <span className="market-product-brand-label truncate text-[10px] font-medium leading-4 text-muted-foreground sm:text-[11px]">
                {brand.label}
              </span>
            ) : null}
          </div>

          <Link to="/product/$handle" params={{ handle: node.handle }} className="min-w-0">
            <h3 className="product-card-title line-clamp-2 min-h-[2.15rem] break-words text-[0.8rem] font-semibold leading-[1.42] text-foreground transition-colors group-hover:text-primary sm:text-sm">
              {node.title}
            </h3>
          </Link>

          <div className="market-product-variant min-h-4">
            {summary ? (
              <p className="market-product-summary truncate text-[10px] leading-4 text-muted-foreground sm:text-xs">
                {summary}
              </p>
            ) : null}
          </div>

          <div className="market-product-price-row flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <bdi className="product-card-price whitespace-nowrap text-sm font-medium leading-tight tabular-nums tracking-normal text-foreground sm:text-[0.9375rem]">
              {formatPrice(price.amount, price.currencyCode)}
            </bdi>
            {discount !== null && compareAt && (
              <bdi className="whitespace-nowrap text-[10px] tabular-nums text-muted-foreground line-through sm:text-xs">
                {formatPrice(compareAt, price.currencyCode)}
              </bdi>
            )}
          </div>

          <div className="market-product-footer flex min-w-0 items-center justify-between gap-2">
            <p
              className={cn(
                "product-card-status market-product-stock inline-flex min-w-0 flex-1 items-center gap-1.5 text-[10px] font-medium leading-4 sm:text-xs",
                inStock ? "text-success" : "text-destructive",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  inStock ? "bg-success" : "bg-destructive",
                )}
              />
              <span className="truncate">{inStock ? t("inStock") : t("outOfStock")}</span>
            </p>

            {cartQuantity > 0 ? (
              <div
                className="market-product-quantity inline-flex h-[38px] shrink-0 items-center overflow-hidden rounded-full border border-border/70 bg-background text-primary shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                aria-label={`${node.title} quantity ${cartQuantity}`}
              >
                <button
                  type="button"
                  onClick={(event) => void handleDecrement(cartQuantity, event.currentTarget)}
                  disabled={isAdding}
                  aria-label={`Decrease ${node.title} quantity`}
                  className="press grid h-full w-8 place-items-center transition-colors hover:bg-primary/10 disabled:opacity-40"
                >
                  <Minus aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <span className="min-w-5 px-0.5 text-center text-[11px] font-bold tabular-nums">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(cartQuantity + 1)}
                  disabled={isAdding || !inStock}
                  aria-label={`Increase ${node.title} quantity`}
                  className="press grid h-full w-8 place-items-center transition-colors hover:bg-primary/10 disabled:opacity-40"
                >
                  {isAdding ? (
                    <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </button>
              </div>
            ) : (
              <button
                ref={replacementAddButtonRef}
                type="button"
                onClick={handleAdd}
                disabled={isAdding || !variant || !inStock}
                aria-label={`Add ${node.title} to bag`}
                className="market-product-action market-add-button product-card-primary-action product-action-button press relative grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border border-border/70 bg-background text-primary shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-[background-color,color,border-color,transform,box-shadow] hover:border-primary/35 hover:bg-primary/10 hover:shadow-sm active:scale-95 disabled:opacity-40"
              >
                {isAdding ? (
                  <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus aria-hidden className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      role={listItem ? "listitem" : undefined}
      className={cn(
        "sc-product-card group relative flex h-full min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-border/75 bg-card shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card-hover",
        className,
      )}
    >
      <div className="product-card-media relative bg-image-stage">
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

      <div className="product-card-body flex min-w-0 flex-1 flex-col gap-1 px-2.5 pb-2.5 pt-1 sm:px-3 sm:pb-3 sm:pt-1.5">
        <div className="flex min-h-4 min-w-0 items-center gap-1.5">
          {brand ? (
            <>
              <BrandLogo slug={brand.slug} label={brand.label} size={16} className="rounded" />
              <p className="truncate text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
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
          <h3 className="product-card-title break-words text-[0.82rem] font-semibold leading-[1.35] transition-colors group-hover:text-primary sm:text-sm">
            {node.title}
          </h3>
        </Link>

        <div className="mt-auto flex min-h-9 min-w-0 items-center justify-between gap-2 pt-0.5">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <bdi className="product-card-price text-[0.95rem] font-bold tabular-nums tracking-tight sm:text-base">
                {formatPrice(price.amount, price.currencyCode)}
              </bdi>
              {discount !== null && compareAt && (
                <bdi className="truncate text-[10px] tabular-nums text-muted-foreground line-through sm:text-xs">
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
