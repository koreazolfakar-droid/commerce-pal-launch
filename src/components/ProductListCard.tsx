import { productPrimaryVariant, productCompareAt } from "@/lib/productPricing";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
import { Link } from "@tanstack/react-router";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { CompareButton } from "@/components/CompareButton";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { discountPercent, formatPrice, variantSummary, type ShopifyProduct } from "@/lib/shopify";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { primaryCategory, resolveBrand } from "@/lib/taxonomy";
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
  const isPhone = primaryCategory(product)?.slug === "smartphones";

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
    if (success) toast.success(`${node.title}: ${t("addedToCart")}`, { position: "top-center" });
    else toast.error(t("addToCartFailed"), { position: "top-center" });
  };
  const wish = () => {
    toggleWishlist(node.handle);
  };

  return (
    <article className="product-list-card group overflow-hidden rounded-2xl border bg-card shadow-card transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-card-hover">
      <div className="product-list-media">
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
            sizes="(min-width: 640px) 144px, 128px"
            eager={eager}
            className="product-list-image rounded-xl border"
            imageClassName="!p-[7%] group-hover:scale-[1.025]"
          />
        </Link>
        {discount !== null && (
          <span className="absolute start-1.5 top-1.5 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
            -{discount}%
          </span>
        )}
        {!inStock && (
          <span className="absolute bottom-1.5 start-1.5 rounded-full bg-foreground/85 px-2 py-0.5 text-[10px] font-semibold text-background">
            {t("soldOut")}
          </span>
        )}
      </div>

      <div className="product-list-info">
        <div className="product-list-heading">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {brand && (
              <>
                <BrandLogo slug={brand.slug} label={brand.label} size={18} className="rounded-md" />
                <span className="truncate text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                  {brand.label}
                </span>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={wish}
              aria-label={wishlisted ? `Remove ${node.title} from wishlist` : `Save ${node.title}`}
              aria-pressed={wishlisted}
              className="press grid h-11 w-11 place-items-center rounded-full border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Heart className={cn("h-4 w-4", wishlisted && "fill-primary text-primary")} />
            </button>
            {isPhone && <CompareButton handle={node.handle} compact className="h-11 w-11" />}
          </div>
        </div>

        <Link to="/product/$handle" params={{ handle: node.handle }} className="min-w-0">
          <h3 className="line-clamp-2 break-words text-sm font-bold leading-snug transition-colors group-hover:text-primary sm:text-base">
            {node.title}
          </h3>
        </Link>
        {summary && (
          <p className="line-clamp-2 break-words text-xs leading-snug text-muted-foreground">
            {summary}
          </p>
        )}
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="break-words text-base font-extrabold leading-snug tracking-tight">
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
            "text-xs font-semibold leading-snug",
            inStock ? "text-success" : "text-muted-foreground",
          )}
        >
          {t(inStock ? "inStock" : "outOfStock")}
        </p>
        <Button
          onClick={add}
          disabled={isLoading || !variant || !inStock}
          size="sm"
          className="product-list-add press h-11 w-full rounded-xl"
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
    </article>
  );
});
