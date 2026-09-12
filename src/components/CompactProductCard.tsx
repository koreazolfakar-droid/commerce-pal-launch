import { productPrimaryVariant } from "@/lib/productPricing";
import { QuickViewButton } from "@/components/product/QuickViewButton";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
import { Link } from "@tanstack/react-router";
import { Heart, Loader2, Plus } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/ProductImage";
import { CompareButton } from "@/components/CompareButton";
import { BrandLogo } from "@/components/BrandLogo";
import { discountPercent, formatPrice, variantSummary, type ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { primaryCategory, resolveBrand } from "@/lib/taxonomy";
import { useLanguage } from "@/lib/i18n";

/** Compact rail/grid tile: optimized image, discount badge, quick add, price, stock. */
export const CompactProductCard = memo(function CompactProductCard({
  product,
  className,
}: {
  product: ShopifyProduct;
  className?: string;
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
  const compareAt = variant
    ? (variant.compareAtPrice?.amount ?? null)
    : (node.compareAtPriceRange?.minVariantPrice.amount ?? null);
  const discount = discountPercent(price.amount, compareAt);
  const summary = variantSummary(variant?.selectedOptions);
  const inStock = variant?.availableForSale ?? node.availableForSale ?? true;
  const brand = resolveBrand(product);
  const isPhone = primaryCategory(product)?.slug === "smartphones";

  const handleAdd = async () => {
    if (!variant) return;
    const success = await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions ?? [],
    });
    if (success) toast.success(`${node.title}: ${t("addedToCart")}`, { position: "top-center" });
    else toast.error(t("addToCartFailed"), { position: "top-center" });
  };

  return (
    <article className={cn("group relative flex h-full min-w-0 w-full flex-col", className)}>
      <div className="card-lift relative overflow-hidden rounded-2xl border bg-card shadow-card hover:border-primary/30">
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
            imageClassName="group-hover:scale-[1.045]"
          />
        </Link>
        <QuickViewButton product={product} />

        {discount !== null && (
          <span className="absolute start-2 top-2 z-10 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold tracking-wide text-destructive-foreground">
            -{discount}%
          </span>
        )}
        {!inStock && (
          <span className="absolute start-2 top-12 z-10 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold text-background">
            {t("soldOut")}
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            toggleWishlist(node.handle);
          }}
          aria-label={wishlisted ? `Remove ${node.title} from wishlist` : `Save ${node.title}`}
          aria-pressed={wishlisted}
          className="press absolute end-2 top-2 z-20 grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-background/95 text-muted-foreground shadow-sm backdrop-blur transition-[color,background-color,border-color,transform] hover:border-primary/40 hover:bg-background hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Heart
            aria-hidden
            className={cn("h-[18px] w-[18px]", wishlisted && "fill-primary text-primary")}
            strokeWidth={1.9}
          />
        </button>
        {isPhone && (
          <CompareButton handle={node.handle} compact className="absolute end-2 top-14 h-10 w-10" />
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading || !variant || !inStock}
          aria-label={`Add ${node.title} to bag`}
          className="press absolute bottom-2.5 end-2.5 z-20 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-card-hover transition-[opacity,transform] hover:scale-[1.03] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:scale-100 disabled:opacity-40"
        >
          {isLoading ? (
            <Loader2 aria-hidden className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
          )}
        </button>
      </div>

      <div className="mt-3 flex min-w-0 flex-1 flex-col gap-1.5">
        {brand && (
          <div className="flex min-w-0 items-center gap-1.5">
            <BrandLogo slug={brand.slug} label={brand.label} size={18} className="rounded-md" />
            <p className="truncate text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              {brand.label}
            </p>
          </div>
        )}
        <Link to="/product/$handle" params={{ handle: node.handle }} className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2.75rem] break-words text-sm font-semibold leading-relaxed transition-colors group-hover:text-primary">
            {node.title}
          </h3>
        </Link>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <bdi className="text-sm font-extrabold tracking-tight">
            {formatPrice(price.amount, price.currencyCode)}
          </bdi>
          {discount !== null && compareAt && (
            <bdi className="text-xs text-muted-foreground line-through">
              {formatPrice(compareAt, price.currencyCode)}
            </bdi>
          )}
        </div>
        {summary && <p className="truncate text-xs text-muted-foreground">{summary}</p>}
      </div>
    </article>
  );
});
