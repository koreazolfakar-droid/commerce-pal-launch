import { productPrimaryVariant, productCompareAt } from "@/lib/productPricing";
import { QuickViewButton } from "@/components/product/QuickViewButton";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
import { Link } from "@tanstack/react-router";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/ProductImage";
import { CompareButton } from "@/components/CompareButton";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { trackProductEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { discountPercent, formatPrice, variantSummary, type ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { primaryCategory, resolveBrand } from "@/lib/taxonomy";
import { useLanguage } from "@/lib/i18n";

/** Full product card used across grids (shop, category, brand, search, wishlist). */
export const ProductCard = memo(function ProductCard({
  product,
  badge,
  className,
  eager = false,
}: {
  product: ShopifyProduct;
  badge?: string;
  className?: string;
  eager?: boolean;
}) {
  const { t } = useLanguage();
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const wishlisted = useWishlistStore((state) => state.handles.includes(product.node.handle));
  const toggleWishlist = useWishlistToggle();

  const node = product.node;
  const selectedVariant = productPrimaryVariant(product);
  const image = node.images.edges[0]?.node;
  const price = selectedVariant?.price ?? node.priceRange.minVariantPrice;
  const compareAt = productCompareAt(product);
  const discount = discountPercent(price.amount, compareAt);
  const summary = variantSummary(selectedVariant?.selectedOptions);
  const inStock = selectedVariant?.availableForSale ?? node.availableForSale ?? true;
  const brand = resolveBrand(product);
  const isPhone = primaryCategory(product)?.slug === "smartphones";

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    const success = await addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions ?? [],
    });
    if (success) toast.success(`${node.title}: ${t("addedToCart")}`, { position: "top-center" });
    else toast.error(t("addToCartFailed"), { position: "top-center" });
  };

  const handleWishlist = () => {
    toggleWishlist(node.handle);
  };

  const handleSelect = () => trackProductEvent("select_item", product);

  return (
    <article
      className={cn(
        "card-lift group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-card hover:border-primary/30",
        className,
      )}
    >
      <div className="relative border-b bg-image-stage">
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          aria-label={node.title}
          className="block"
          onClick={handleSelect}
        >
          <ProductImage
            url={image?.url}
            alt={image?.altText ?? node.title}
            size={480}
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 45vw"
            eager={eager}
            imageClassName="group-hover:scale-[1.045]"
          />
        </Link>
        <QuickViewButton product={product} />

        <div className="pointer-events-none absolute start-2.5 top-2.5 z-10 flex flex-col gap-1.5 sm:start-3 sm:top-3">
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
              {t("soldOut")}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? t("removeWishlist") : t("saveWishlist")}
          aria-pressed={wishlisted}
          className="press absolute end-2.5 top-2.5 z-20 grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-background/95 text-muted-foreground shadow-sm backdrop-blur transition-[color,background-color,border-color,transform] hover:border-primary/40 hover:bg-background hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:end-3 sm:top-3"
        >
          <Heart
            aria-hidden
            className={cn("h-[18px] w-[18px]", wishlisted && "fill-primary text-primary")}
            strokeWidth={1.9}
          />
        </button>
        {isPhone && (
          <CompareButton
            handle={node.handle}
            compact
            className="absolute end-2.5 top-14 h-10 w-10 sm:end-3 sm:top-[3.65rem]"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3.5 sm:p-4">
        {brand && (
          <div className="flex min-w-0 items-center gap-1.5">
            <BrandLogo slug={brand.slug} label={brand.label} size={20} className="rounded-md" />
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {brand.label}
            </p>
          </div>
        )}
        <Link to="/product/$handle" params={{ handle: node.handle }} className="min-w-0" onClick={handleSelect}>
          <h3 className="line-clamp-2 min-h-[2.65rem] break-words text-sm font-semibold leading-[1.4] transition-colors group-hover:text-primary">
            {node.title}
          </h3>
        </Link>
        {summary && <p className="truncate text-xs text-muted-foreground">{summary}</p>}

        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base font-extrabold tracking-tight">
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
            "inline-flex items-center gap-1.5 text-xs font-medium",
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
          {t(inStock ? "inStock" : "outOfStock")}
        </p>

        <div className="mt-auto pt-2">
          <Button
            onClick={handleAddToCart}
            disabled={isLoading || !selectedVariant || !inStock}
            className="press h-11 w-full rounded-xl"
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                {t(inStock ? "addToCart" : "outOfStock")}
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
});
