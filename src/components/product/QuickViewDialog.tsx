import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const maxQuantity =
    variant?.trackInventory && !variant.allowBackorder
      ? Math.max(0, Math.min(99, Math.trunc(variant.stockQuantity ?? 0)))
      : 99;
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
    if (!variant?.availableForSale || !validQuantity || busy) return;
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
    <DialogContent
      dir={direction}
      className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-lg p-5 sm:p-7"
    >
      <DialogHeader className="pe-7 text-start sm:text-start">
        <DialogTitle className="break-words leading-snug">{displayTitle}</DialogTitle>
        <DialogDescription>{t("quickViewDescription")}</DialogDescription>
      </DialogHeader>
      <div className="grid min-w-0 gap-6 md:grid-cols-2">
        <ProductGallery
          compact
          images={images}
          title={displayTitle}
          activeIndex={activeImage}
          onSelect={setActiveImage}
        />
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-baseline gap-2" aria-live="polite">
            <bdi className="text-2xl font-bold">
              {formatPrice(price.amount, price.currencyCode)}
            </bdi>
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
              onChange={(event) => setQuantity(event.target.value)}
              aria-invalid={!validQuantity}
              aria-describedby={!validQuantity ? `${quantityId}-error` : undefined}
              className="h-11 w-24 rounded-xl border bg-background px-3 text-foreground"
            />
            {!validQuantity && (
              <p id={`${quantityId}-error`} className="mt-2 text-sm text-destructive">
                {t("invalidQuantity")}
              </p>
            )}
          </div>
          <Button
            onClick={add}
            disabled={busy || !variant?.availableForSale || !validQuantity}
            className="min-h-11 w-full"
          >
            {busy ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingBag aria-hidden className="h-4 w-4" />
            )}
            {t(busy ? "addingToCart" : variant?.availableForSale ? "addToCart" : "outOfStock")}
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
    </DialogContent>
  );
}
