import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  Heart,
  Loader2,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import {
  discountPercent,
  fetchProductByHandle,
  formatPrice,
  type ShopifyProduct,
} from "@/lib/shopify";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useRecentlyViewedStore } from "@/stores/recentlyViewedStore";
import { useWishlistStore } from "@/stores/wishlistStore";

export const Route = createFileRoute("/product/$handle")({
  loader: async ({ params }) => {
    const product = await fetchProductByHandle(params.handle);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.product.node.title ?? "Product";
    const description =
      loaderData?.product.node.description?.slice(0, 150) ||
      "Shop phones, tablets and accessories at Space Cell.";
    const image = loaderData?.product.node.images.edges[0]?.node.url;
    return {
      meta: [
        { title: `${title} — Space Cell` },
        { name: "description", content: description },
        { property: "og:title", content: `${title} — Space Cell` },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  component: ProductPage,
});

const TRUST = [
  { icon: ShieldCheck, label: "Authentic with official warranty" },
  { icon: Truck, label: "Fast delivery on every order" },
  { icon: RotateCcw, label: "Easy returns and real support" },
];

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: ShopifyProduct };
  const node = product.node;
  const variants = node.variants.edges.map((edge) => edge.node);
  const images = node.images.edges.map((edge) => edge.node);
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const [activeImage, setActiveImage] = useState(0);
  const selectedVariant = variants.find((variant) => variant.id === variantId) ?? variants[0];
  const image = images[Math.min(activeImage, Math.max(images.length - 1, 0))];

  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const wishlisted = useWishlistStore((state) => state.handles.includes(node.handle));
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const addRecentlyViewed = useRecentlyViewedStore((state) => state.add);

  useEffect(() => {
    addRecentlyViewed(node.handle);
    setActiveImage(0);
    setVariantId(variants[0]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.handle]);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    await addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions ?? [],
    });
    toast.success(`${node.title} added to your bag`, { position: "top-center" });
  };

  const compareAt =
    selectedVariant?.compareAtPrice?.amount ?? node.compareAtPriceRange?.minVariantPrice.amount;
  const discount = discountPercent(selectedVariant?.price.amount, compareAt);
  const currency = selectedVariant?.price.currencyCode ?? "USD";
  const inStock = Boolean(selectedVariant?.availableForSale);

  return (
    <StoreLayout>
      <main className="mx-auto max-w-7xl px-4 py-6 pb-28 lg:py-10 lg:pb-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/shop" className="hover:text-primary">
            Shop
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-foreground">{node.title}</span>
        </nav>

        <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="media-frame aspect-square rounded-3xl border">
              {image ? (
                <img
                  src={cdnImage(image.url, 900)}
                  srcSet={cdnSrcSet(image.url, 900)}
                  sizes="(min-width: 1024px) 560px, 92vw"
                  alt={image.altText ?? node.title}
                  fetchPriority="high"
                  decoding="async"
                  width={900}
                  height={900}
                  className="h-full w-full object-contain p-8"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
              {discount !== null && (
                <span className="absolute left-4 top-4 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
                  -{discount}%
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="scroll-rail mt-3 flex gap-2.5">
                {images.map((thumb, index) => (
                  <button
                    key={thumb.url}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`View image ${index + 1}`}
                    aria-current={index === activeImage}
                    className={cn(
                      "press media-frame h-16 w-16 shrink-0 rounded-2xl border-2 transition-colors",
                      index === activeImage ? "border-primary" : "border-transparent",
                    )}
                  >
                    <img
                      src={cdnImage(thumb.url, 128)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={64}
                      height={64}
                      className="h-full w-full object-contain p-1.5"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div>
              {node.vendor && (
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  {node.vendor}
                </p>
              )}
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-[2.5rem] lg:leading-[1.08]">
                {node.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-2xl font-extrabold tracking-tight lg:text-3xl">
                  {selectedVariant && formatPrice(selectedVariant.price.amount, currency)}
                </span>
                {discount !== null && compareAt && (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(compareAt, currency)}
                    </span>
                    <span className="rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-destructive-foreground">
                      Save {discount}%
                    </span>
                  </>
                )}
              </div>
              <p
                className={cn(
                  "mt-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold",
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
                {inStock ? "In stock — ready to ship" : "Out of stock"}
              </p>
            </div>

            {variants.length > 1 && (
              <div>
                <h2 className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
                  Options
                </h2>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={!variant.availableForSale}
                      onClick={() => setVariantId(variant.id)}
                      aria-pressed={variant.id === selectedVariant?.id}
                      className={cn(
                        "press rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
                        variant.id === selectedVariant?.id
                          ? "border-primary bg-accent text-primary"
                          : "hover:border-primary",
                        !variant.availableForSale && "opacity-40 line-through",
                      )}
                    >
                      {variant.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="hidden gap-3 lg:flex">
              <Button
                size="lg"
                onClick={handleAddToCart}
                disabled={isLoading || !inStock}
                className="press flex-1 rounded-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : inStock ? (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    Add to cart
                  </>
                ) : (
                  "Sold out"
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  toggleWishlist(node.handle);
                  toast.success(wishlisted ? "Removed from wishlist" : "Saved to wishlist", {
                    position: "top-center",
                  });
                }}
                aria-pressed={wishlisted}
                className="press rounded-full"
              >
                <Heart className={cn("h-4 w-4", wishlisted && "fill-primary text-primary")} />
                {wishlisted ? "Saved" : "Save"}
              </Button>
            </div>

            <ul className="grid gap-2.5 rounded-2xl border bg-card p-4 shadow-card">
              {TRUST.map((item) => (
                <li key={item.label} className="flex items-center gap-2.5 text-[13px]">
                  <item.icon className="h-4 w-4 shrink-0 text-primary" />
                  {item.label}
                </li>
              ))}
            </ul>

            {node.description && (
              <div>
                <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
                  Description
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {node.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile sticky buy bar — sits above the bottom navigation. */}
      <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 border-t bg-background/90 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              toggleWishlist(node.handle);
              toast.success(wishlisted ? "Removed from wishlist" : "Saved to wishlist", {
                position: "top-center",
              });
            }}
            aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
            aria-pressed={wishlisted}
            className="press grid h-11 w-11 shrink-0 place-items-center rounded-full border"
          >
            <Heart className={cn("h-5 w-5", wishlisted && "fill-primary text-primary")} />
          </button>
          <Button
            onClick={handleAddToCart}
            disabled={isLoading || !inStock}
            className="press h-11 flex-1 rounded-full text-sm font-bold"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : inStock ? (
              <>
                Add to cart ·{" "}
                {selectedVariant && formatPrice(selectedVariant.price.amount, currency)}
              </>
            ) : (
              "Sold out"
            )}
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}
