import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductGallery } from "@/components/product/ProductGallery";
import { VariantPicker } from "@/components/product/VariantPicker";
import { useLanguage } from "@/lib/i18n";
import type { StoreProduct } from "@/lib/storeTypes";
import { useCartStore } from "@/stores/cartStore";
import { discountPercent, formatPrice, productPrimaryVariant } from "@/lib/productPricing";
import { optionsForVariant, selectProductVariant } from "@/lib/productVariantSelection";

export default function QuickViewDialog({
  product,
  onClose,
}: {
  product: StoreProduct;
  onClose: () => void;
}) {
  const { t, direction, language } = useLanguage();
  const quantityId = useId();
  const node = product.node;
  const displayTitle = language === "ar" && node.titleAr?.trim() ? node.titleAr : node.title;
  const variants = useMemo(() => node.variants.edges.map(({ node: variant }) => variant), [node]);
  const initial = productPrimaryVariant(product);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(() => initial?.id);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState("1");
  const addItem = useCartStore((state) => state.addItem);
  const busy = useCartStore((state) => state.isLoading);
  const variant = variants.find((item) => item.id === selectedVariantId) ?? initial;
  const selected = optionsForVariant(variant);
  const price = variant?.price ?? node.priceRange.minVariantPrice;
  const compareAt = variant?.compareAtPrice?.amount;
  const discount = discountPercent(price.amount, compareAt);
  const amount = Number(quantity);
  const stockLimit =
    variant?.trackInventory && !variant.allowBackorder
      ? Math.max(0, Math.min(99, Math.trunc(variant.stockQuantity ?? 0)))
      : 99;
  const cartQuantity = useCartStore(
    (state) => state.items.find((item) => item.variantId === variant?.id)?.quantity ?? 0,
  );
  const maxQuantity = Math.max(0, stockLimit - cartQuantity);
  const inStock = Boolean(variant?.availableForSale && stockLimit > 0);
  const validQuantity =
    /^\d+$/.test(quantity) && Number.isInteger(amount) && amount >= 1 && amount <= maxQuantity;
  const images = useMemo(() => {
    const all = node.images.edges.map(({ node: image }) => image);
    const seen = new Set(all.map((image) => image.url));
    for (const item of variants) {
      if (!item.image?.url || seen.has(item.image.url)) continue;
      all.push({ url: item.image.url, altText: item.image.altText ?? displayTitle });
      seen.add(item.image.url);
    }
    return all;
  }, [node, variants, displayTitle]);

  useEffect(() => {
    const imageUrl = variant?.image?.url;
    if (!imageUrl) return;
    const index = images.findIndex((image) => image.url === imageUrl);
    if (index >= 0) setActiveImage(index);
  }, [variant?.image?.url, images]);

  const add = async () => {
    if (!variant || !inStock || !validQuantity || busy) return;
    try {
      const success = await addItem({
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        quantity: amount,
        selectedOptions: variant.selectedOptions,
      });
      if (!success) {
        toast.error(t("addToCartFailed"));
        return;
      }
      toast.success(t("addedToCart"));
      onClose();
    } catch {
      toast.error(t("addToCartFailed"));
    }
  };

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2 md:gap-6">
      <ProductGallery
        compact
        images={images}
        title={displayTitle}
        activeIndex={activeImage}
        onSelect={setActiveImage}
      />
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-baseline gap-2" aria-live="polite">
          <bdi className="text-2xl font-bold">{formatPrice(price.amount, price.currencyCode)}</bdi>
          {discount !== null && compareAt && (
            <>
              <del className="text-sm text-muted-foreground">
                <bdi>{formatPrice(compareAt, price.currencyCode)}</bdi>
              </del>
              <span className="rounded-full bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">
                −{discount}%
              </span>
            </>
          )}
        </div>
        <p
          data-testid="quick-view-stock"
          role="status"
          className={`flex items-center gap-2 text-sm font-medium ${inStock ? "text-success" : "text-destructive"}`}
        >
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-success" : "bg-destructive"}`}
          />
          {t(inStock ? "inStock" : "outOfStock")}
        </p>
        <VariantPicker
          options={node.options ?? []}
          variants={variants}
          selected={selected}
          onSelect={(name, value) => {
            const next = selectProductVariant(variants, variant, name, value);
            if (!next) return;
            setSelectedVariantId(next.id);
            setQuantity("1");
          }}
        />
        <div>
          <label htmlFor={quantityId} className="mb-2 block text-sm font-semibold">
            {t("quantityLabel")}
          </label>
          <input
            id={quantityId}
            type="number"
            inputMode="numeric"
            min={1}
            max={maxQuantity}
            step={1}
            value={quantity}
            disabled={busy || !inStock || maxQuantity < 1}
            onChange={(event) => setQuantity(event.target.value)}
            aria-invalid={inStock && maxQuantity > 0 && !validQuantity}
            aria-describedby={inStock ? `${quantityId}-hint` : undefined}
            className="h-11 w-24 rounded-xl border bg-background px-3 text-foreground"
          />
          {inStock && (
            <p id={`${quantityId}-hint`} className="mt-2 text-sm text-muted-foreground">
              {maxQuantity < 1
                ? t("quickViewCartLimit")
                : `${t("quickViewQuantityHint")}: ${maxQuantity}`}
              {maxQuantity > 0 && !validQuantity && (
                <span className="mt-1 block text-destructive">{t("quickViewInvalidQuantity")}</span>
              )}
            </p>
          )}
        </div>
        <Button
          onClick={add}
          disabled={busy || !inStock || !validQuantity}
          className="min-h-11 w-full"
        >
          {busy ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <ShoppingBag aria-hidden className="h-4 w-4" />
          )}
          {t(busy ? "addingToCart" : inStock ? "addToCart" : "outOfStock")}
        </Button>
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          onClick={onClose}
          className="text-sm font-semibold text-primary underline underline-offset-4"
        >
          {t("fullDetails")} <span aria-hidden>{direction === "rtl" ? "←" : "→"}</span>
        </Link>
      </div>
    </div>
  );
}
