import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Heart,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { CompareButton } from "@/components/CompareButton";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProseSections } from "@/components/product/ProseSection";
import { SpecSheet } from "@/components/product/SpecSheet";
import { VariantPicker } from "@/components/product/VariantPicker";
import { ProductGrid } from "@/components/ProductGrid";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupSpecs, parseDescription, splitSections, type SpecRow } from "@/lib/productContent";
import { catalogQueryOptions, recommendationsQueryOptions } from "@/lib/queries";
import {
  discountPercent,
  fetchProductByHandle,
  formatPrice,
  type ShopifyProduct,
} from "@/lib/shopify";
import { PURCHASE_ASSURANCES } from "@/lib/storeAssurances";
import { primaryCategory, resolveBrand } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { productWhatsAppUrl } from "@/lib/whatsapp";
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

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: ShopifyProduct };
  const node = product.node;
  const variants = useMemo(() => node.variants.edges.map((edge) => edge.node), [node]);
  const images = useMemo(() => node.images.edges.map((edge) => edge.node), [node]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (variants[0]?.selectedOptions ?? []).map((option) => [option.name, option.value]),
    ),
  );
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState<"cart" | "buy" | null>(null);

  const selectedVariant = useMemo(() => {
    const match = variants.find((variant) =>
      variant.selectedOptions.every((option) => selectedOptions[option.name] === option.value),
    );
    return match ?? variants[0];
  }, [variants, selectedOptions]);

  const addItem = useCartStore((state) => state.addItem);
  const cartLoading = useCartStore((state) => state.isLoading);
  const wishlisted = useWishlistStore((state) => state.handles.includes(node.handle));
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const addRecentlyViewed = useRecentlyViewedStore((state) => state.add);
  const { data: catalog } = useQuery(catalogQueryOptions());
  const { data: recommended } = useQuery(recommendationsQueryOptions(node.handle));

  useEffect(() => {
    addRecentlyViewed(node.handle);
    setActiveImage(0);
    setQuantity(1);
    setSelectedOptions(
      Object.fromEntries(
        (variants[0]?.selectedOptions ?? []).map((option) => [option.name, option.value]),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.handle]);

  // Keep the gallery in sync with the variant's own Shopify image when present.
  useEffect(() => {
    const variantImage = selectedVariant?.image?.url;
    if (!variantImage) return;
    const index = images.findIndex((image) => image.url === variantImage);
    if (index >= 0) setActiveImage(index);
  }, [selectedVariant?.image?.url, images]);

  const handleOptionSelect = (name: string, value: string) => {
    setSelectedOptions((current) => ({ ...current, [name]: value }));
  };

  const handleAddToCart = async (checkout = false) => {
    if (!selectedVariant) return;
    setPending(checkout ? "buy" : "cart");
    try {
      await addItem({
        product,
        variantId: selectedVariant.id,
        variantTitle: selectedVariant.title,
        price: selectedVariant.price,
        quantity,
        selectedOptions: selectedVariant.selectedOptions ?? [],
      });
      toast.success(`${node.title} added to your bag`, { position: "top-center" });
      if (checkout) {
        const checkoutUrl = useCartStore.getState().getCheckoutUrl();
        if (checkoutUrl) window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        else toast.error("Checkout is unavailable right now. Please try again.");
      }
    } catch {
      toast.error("We couldn't add this to your bag. Please try again.");
    } finally {
      setPending(null);
    }
  };

  const compareAt =
    selectedVariant?.compareAtPrice?.amount ?? node.compareAtPriceRange?.minVariantPrice.amount;
  const discount = discountPercent(selectedVariant?.price.amount, compareAt);
  const currency = selectedVariant?.price.currencyCode ?? "USD";
  const inStock = Boolean(selectedVariant?.availableForSale);
  const brand = resolveBrand(product);
  const category = primaryCategory(product);
  const busy = pending !== null || cartLoading;
  const isPhone = category?.slug === "smartphones";
  const whatsappOrderUrl = productWhatsAppUrl({
    title: node.title,
    url: typeof window === "undefined" ? `https://spacecallapp.store/product/${node.handle}` : window.location.href,
    quantity,
    options: selectedVariant?.selectedOptions ?? [],
  });

  const content = useMemo(
    () => splitSections(parseDescription(node.descriptionHtml, node.description)),
    [node.descriptionHtml, node.description],
  );

  const specGroups = useMemo(() => {
    const rows: SpecRow[] = [
      ...content.specs,
      ...(selectedVariant?.selectedOptions ?? [])
        .filter((option) => option.value !== "Default Title")
        .map((option) => ({ label: option.name, value: option.value })),
      ...(node.productType ? [{ label: "Product type", value: node.productType }] : []),
      ...(node.vendor ? [{ label: "Brand", value: node.vendor }] : []),
      ...(selectedVariant?.sku ? [{ label: "SKU", value: selectedVariant.sku }] : []),
      ...(selectedVariant?.barcode ? [{ label: "Barcode", value: selectedVariant.barcode }] : []),
      ...(selectedVariant?.weight != null && selectedVariant.weight > 0 && selectedVariant.weightUnit
        ? [{ label: "Weight", value: `${selectedVariant.weight} ${selectedVariant.weightUnit}` }]
        : []),
    ];
    return groupSpecs(rows);
  }, [content.specs, selectedVariant, node.productType, node.vendor]);

  // Shopify's own recommendations first, then same-category products as backup.
  const similar = useMemo(() => {
    const fromShopify = (recommended ?? []).filter(
      (candidate) => candidate.node.handle !== node.handle,
    );
    if (fromShopify.length >= 4) return fromShopify.slice(0, 8);
    const seen = new Set([node.handle, ...fromShopify.map((item) => item.node.handle)]);
    const fallback = (catalog?.products ?? []).filter((candidate) => {
      if (seen.has(candidate.node.handle)) return false;
      if (category) {
        return (catalog?.categoryOf.get(candidate.node.handle) ?? []).includes(category.slug);
      }
      return brand ? catalog?.brandOf.get(candidate.node.handle)?.slug === brand.slug : false;
    });
    return [...fromShopify, ...fallback].slice(0, 8);
  }, [recommended, catalog, category, brand, node.handle]);

  const hasOverview = content.overview.length > 0;
  const hasBox = content.box.length > 0;
  const hasShipping = content.shipping.length > 0;
  const hasSpecs = specGroups.length > 0;
  const defaultTab = hasOverview ? "overview" : hasSpecs ? "specifications" : hasBox ? "box" : "shipping";

  return (
    <StoreLayout>
      <main className="mx-auto max-w-7xl px-4 py-6 pb-32 lg:py-10 lg:pb-14">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Link to="/" className="transition-colors hover:text-primary">
            Home
          </Link>
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          <Link to="/shop" className="transition-colors hover:text-primary">
            Shop
          </Link>
          {category && (
            <>
              <ChevronRight aria-hidden className="h-3.5 w-3.5" />
              <Link
                to="/category/$slug"
                params={{ slug: category.slug }}
                className="transition-colors hover:text-primary"
              >
                {category.label}
              </Link>
            </>
          )}
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          <span className="truncate text-foreground">{node.title}</span>
        </nav>

        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
          <ProductGallery
            images={images}
            title={node.title}
            activeIndex={activeImage}
            onSelect={setActiveImage}
            badge={
              discount !== null ? (
                <span className="absolute left-4 top-4 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground shadow-card">
                  -{discount}%
                </span>
              ) : null
            }
          />

          <div className="flex min-w-0 flex-col gap-7">
            <div className="min-w-0">
              {brand && (
                <Link
                  to="/brand/$slug"
                  params={{ slug: brand.slug }}
                  className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  <BrandLogo slug={brand.slug} label={brand.label} size={26} className="rounded-full" />
                  {brand.label}
                </Link>
              )}
              <h1 className="mt-3 text-[1.6rem] font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-[2.35rem] lg:leading-[1.1]">
                {node.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <span className="text-2xl font-extrabold tracking-tight text-foreground lg:text-[2rem]">
                  {selectedVariant && formatPrice(selectedVariant.price.amount, currency)}
                </span>
                {discount !== null && compareAt && (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(compareAt, currency)}
                    </span>
                    <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-primary">
                      Save {discount}%
                    </span>
                  </>
                )}
              </div>

              <p
                className={cn(
                  "mt-3.5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                  inStock ? "border-success/30 text-success" : "text-muted-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    inStock ? "bg-success" : "bg-muted-foreground",
                  )}
                />
                {inStock ? "In stock" : "Out of stock"}
              </p>
            </div>

            <VariantPicker
              options={node.options ?? []}
              variants={variants}
              selected={selectedOptions}
              onSelect={handleOptionSelect}
            />

            <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <div
                className="flex h-12 w-fit items-center rounded-full border bg-card p-1"
                aria-label="Quantity"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-9 text-center text-sm font-semibold" aria-live="polite">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="hidden gap-3 sm:flex">
                <Button
                  size="lg"
                  onClick={() => handleAddToCart()}
                  disabled={busy || !inStock}
                  className="press flex-1 rounded-full"
                >
                  {pending === "cart" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}
                  {inStock ? "Add to cart" : "Sold out"}
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => handleAddToCart(true)}
                  disabled={busy || !inStock}
                  className="press rounded-full"
                >
                  {pending === "buy" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Buy now
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
                  aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                  className="press rounded-full"
                >
                  <Heart className={cn("h-4 w-4", wishlisted && "fill-primary text-primary")} />
                  <span className="sr-only sm:not-sr-only">{wishlisted ? "Saved" : "Save"}</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className="rounded-full border-success/40 text-success hover:bg-success/10 hover:text-success">
                <a href={whatsappOrderUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> Order via WhatsApp
                </a>
              </Button>
              {isPhone && <CompareButton handle={node.handle} />}
            </div>

            <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {PURCHASE_ASSURANCES.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border bg-card p-3 text-center shadow-card"
                >
                  <item.icon aria-hidden className="mx-auto h-5 w-5 text-primary" />
                  <p className="mt-2 text-[12px] font-bold leading-tight text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {(hasOverview || hasSpecs || hasBox || hasShipping) && (
          <section className="mt-14 border-t pt-8" aria-label="Product details">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="scroll-rail h-auto w-full justify-start gap-1 rounded-2xl bg-surface p-1.5">
                {hasOverview && <TabsTrigger value="overview">Description</TabsTrigger>}
                {hasSpecs && <TabsTrigger value="specifications">Specifications</TabsTrigger>}
                {hasBox && <TabsTrigger value="box">In the box</TabsTrigger>}
                {hasShipping && <TabsTrigger value="shipping">Shipping &amp; returns</TabsTrigger>}
              </TabsList>
              {hasOverview && (
                <TabsContent value="overview" className="pt-6">
                  <ProseSections sections={content.overview} />
                </TabsContent>
              )}
              {hasSpecs && (
                <TabsContent value="specifications" className="pt-6">
                  <SpecSheet groups={specGroups} />
                </TabsContent>
              )}
              {hasBox && (
                <TabsContent value="box" className="pt-6">
                  <ProseSections sections={content.box} />
                </TabsContent>
              )}
              {hasShipping && (
                <TabsContent value="shipping" className="pt-6">
                  <ProseSections sections={content.shipping} />
                </TabsContent>
              )}
            </Tabs>
          </section>
        )}

        {similar.length > 0 && (
          <section className="mt-16 border-t pt-10" aria-labelledby="similar-products">
            <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
              <div className="min-w-0">
                <h2 id="similar-products" className="text-xl font-bold tracking-tight">
                  You may also like
                </h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  Recommended from the live Space Cell catalogue
                </p>
              </div>
              {category && (
                <Link
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  View all <ChevronRight aria-hidden className="h-4 w-4" />
                </Link>
              )}
            </div>
            <ProductGrid products={similar} />
          </section>
        )}
      </main>

      {/* Mobile sticky buy bar — sits above the bottom navigation. */}
      <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 border-t bg-background/90 px-4 py-2.5 backdrop-blur-xl sm:hidden">
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
            className="press grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-card"
          >
            <Heart className={cn("h-5 w-5", wishlisted && "fill-primary text-primary")} />
          </button>
          <Button
            onClick={() => handleAddToCart()}
            disabled={busy || !inStock}
            className="press h-11 flex-1 rounded-full text-sm font-bold"
          >
            {pending === "cart" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : inStock ? (
              <>
                <ShoppingBag className="h-4 w-4" />
                Add to cart ·{" "}
                {selectedVariant && formatPrice(selectedVariant.price.amount, currency)}
              </>
            ) : (
              "Sold out"
            )}
          </Button>
          <Button asChild variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-full border-success/40 text-success">
            <a href={whatsappOrderUrl} target="_blank" rel="noopener noreferrer" aria-label="Order via WhatsApp">
              <MessageCircle className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}
