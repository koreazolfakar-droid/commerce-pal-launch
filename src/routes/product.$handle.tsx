import { ProductRail } from "@/components/ProductRail";
import { useLanguage } from "@/lib/i18n";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
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
  Share2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { CompareButton } from "@/components/CompareButton";
import { ProductGallery } from "@/components/product/ProductGallery";
import { OfficialProductResearch } from "@/components/product/OfficialProductResearch";
import { ProseSections } from "@/components/product/ProseSection";
import { SpecSheet } from "@/components/product/SpecSheet";
import { VariantPicker } from "@/components/product/VariantPicker";
import { ProductGrid } from "@/components/ProductGrid";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupSpecs, parseDescription, splitSections, type SpecRow } from "@/lib/productContent";
import { recommendationsQueryOptions, vendorProductsQueryOptions } from "@/lib/queries";
import { discountPercent, formatPrice } from "@/lib/productPricing";
import { fetchProductByHandle } from "@/lib/storefrontFacade";
import type { StoreProduct } from "@/lib/storefrontTypes";
import { PURCHASE_ASSURANCES } from "@/lib/storeAssurances";
import { primaryCategory, resolveBrand } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { productWhatsAppUrl } from "@/lib/whatsapp";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  canonicalLink,
  jsonLd,
  productJsonLd,
  productMetaDescription,
  socialMeta,
} from "@/lib/seo";
import { STORE_NAME } from "@/lib/storeConfig";
import { useCartStore } from "@/stores/cartStore";
import { useRecentlyViewedStore } from "@/stores/recentlyViewedStore";
import { useWishlistStore } from "@/stores/wishlistStore";

export const Route = createFileRoute("/product/$handle")({
  loader: async ({ params }) => {
    const product = await fetchProductByHandle(params.handle);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: `Product unavailable — ${STORE_NAME}` },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    const product = loaderData.product;
    const title = product.node.title || "Product";
    const fullTitle = `${title} — ${STORE_NAME}`;
    const description = productMetaDescription(product);
    const image = product.node.images.edges[0]?.node.url;
    const path = `/product/${params.handle}`;
    return {
      meta: [
        { title: fullTitle },
        { name: "description", content: description },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        ...socialMeta({
          title: fullTitle,
          description,
          path,
          type: "product",
          ...(image ? { image } : {}),
        }),
      ],
      links: [canonicalLink(path)],
      scripts: [
        jsonLd(productJsonLd(product)),
        jsonLd(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
            { name: title, path },
          ]),
        ),
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { t, language } = useLanguage();
  const { product } = Route.useLoaderData() as { product: StoreProduct };
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
  const toggleWishlist = useWishlistToggle();
  const addRecentlyViewed = useRecentlyViewedStore((state) => state.add);
  const { data: recommended } = useQuery(recommendationsQueryOptions(node.handle));
  const { data: vendorProducts } = useQuery(vendorProductsQueryOptions(node.vendor ?? ""));

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

  useEffect(() => {
    const variantImage = selectedVariant?.image?.url;
    if (!variantImage) return;
    const index = images.findIndex((image) => image.url === variantImage);
    if (index >= 0) setActiveImage(index);
  }, [selectedVariant?.image?.url, images]);

  const handleOptionSelect = (name: string, value: string) => {
    setSelectedOptions((current) => ({ ...current, [name]: value }));
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) await navigator.share({ title: node.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("linkCopied"));
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(t("shareFailed"));
    }
  };

  const handleAddToCart = async (checkout = false) => {
    if (!selectedVariant) return;
    setPending(checkout ? "buy" : "cart");
    try {
      const success = await addItem({
        product,
        variantId: selectedVariant.id,
        variantTitle: selectedVariant.title,
        price: selectedVariant.price,
        quantity,
        selectedOptions: selectedVariant.selectedOptions ?? [],
      });
      if (!success) {
        toast.error(t("addToCartFailed"), { position: "top-center" });
        return;
      }
      toast.success(`${node.title}: ${t("addedToCart")}`, { position: "top-center" });
      if (checkout) {
        window.location.assign("/cart#whatsapp-checkout");
      }
    } catch {
      toast.error(t("addToCartFailed"));
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
  const sameVendorProducts = (vendorProducts ?? [])
    .filter((item) => item.node.handle !== node.handle && item.node.vendor === node.vendor)
    .slice(0, 8);
  const category = primaryCategory(product);
  const busy = pending !== null || cartLoading;
  const isPhone = category?.slug === "smartphones";
  const whatsappOrderUrl = productWhatsAppUrl({
    title: node.title,
    url: absoluteUrl(`/product/${node.handle}`),
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
      ...(selectedVariant?.weight != null &&
      selectedVariant.weight > 0 &&
      selectedVariant.weightUnit
        ? [{ label: "Weight", value: `${selectedVariant.weight} ${selectedVariant.weightUnit}` }]
        : []),
    ];
    return groupSpecs(rows);
  }, [content.specs, selectedVariant, node.productType, node.vendor]);

  const similar = useMemo(() => {
    const recommendedProducts = (recommended ?? []).filter(
      (candidate) => candidate.node.handle !== node.handle,
    );
    if (recommendedProducts.length >= 4) return recommendedProducts.slice(0, 8);
    const seen = new Set([node.handle, ...recommendedProducts.map((item) => item.node.handle)]);
    const fallback = (vendorProducts ?? []).filter((candidate) => !seen.has(candidate.node.handle));
    return [...recommendedProducts, ...fallback].slice(0, 8);
  }, [recommended, vendorProducts, node.handle]);

  const hasOverview = content.overview.length > 0;
  const hasBox = content.box.length > 0;
  const hasShipping = content.shipping.length > 0;
  const hasSpecs = specGroups.length > 0;
  const needsSeoOverview = (node.description ?? "").replace(/\s+/g, " ").trim().length < 180;
  const defaultTab = hasOverview
    ? "overview"
    : hasSpecs
      ? "specifications"
      : hasBox
        ? "box"
        : "shipping";

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-5 pb-32 lg:py-10 lg:pb-14">
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

        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] lg:gap-10">
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

          <div className="flex min-w-0 flex-col gap-4 rounded-[1.5rem] border bg-card p-5 shadow-card sm:gap-6 sm:p-7">
            <div className="min-w-0">
              {brand && (
                <Link
                  to="/brand/$slug"
                  params={{ slug: brand.slug }}
                  className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  <BrandLogo
                    slug={brand.slug}
                    label={brand.label}
                    size={26}
                    className="rounded-full"
                  />
                  {brand.label}
                </Link>
              )}
              <h1 className="mt-3 text-[1.55rem] font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-[2.35rem] lg:leading-[1.1]">
                {node.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
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
                  "mt-2.5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
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
                {t(inStock ? "inStock" : "outOfStock")}
              </p>
            </div>

            <VariantPicker
              options={node.options ?? []}
              variants={variants}
              selected={selectedOptions}
              onSelect={handleOptionSelect}
            />

            <div className="flex flex-wrap items-center gap-3">
              <div
                className="flex h-11 w-fit items-center rounded-full border bg-card p-1"
                aria-label="Quantity"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1}
                  aria-label={t("decreaseQuantity")}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold" aria-live="polite">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                  aria-label={t("increaseQuantity")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="hidden flex-1 flex-wrap gap-2 sm:flex">
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
                  {t(inStock ? "addToCart" : "soldOut")}
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
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleWishlist(node.handle)}
                aria-pressed={wishlisted}
                aria-label={wishlisted ? t("removeWishlist") : t("saveWishlist")}
                className="rounded-full"
              >
                <Heart className={cn("h-4 w-4", wishlisted && "fill-primary text-primary")} />
                {t(wishlisted ? "saved" : "saveWishlist")}
              </Button>
              {isPhone && <CompareButton handle={node.handle} />}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                aria-label={t("shareProduct")}
                className="rounded-full"
              >
                <Share2 aria-hidden className="h-4 w-4" />
                {t("shareProduct")}
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full border-success/40 text-success hover:bg-success/10 hover:text-success"
              >
                <a href={whatsappOrderUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </Button>
            </div>

            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
              {PURCHASE_ASSURANCES.slice(0, 3).map((item) => (
                <li key={item.title} className="inline-flex items-center gap-1.5">
                  <item.icon aria-hidden className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {(hasOverview || hasSpecs || hasBox || hasShipping) && (
          <section
            className="mt-8 rounded-[1.5rem] border bg-card p-5 shadow-card sm:p-7"
            aria-label="Product details"
          >
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

        {needsSeoOverview && (
          <section
            className="mt-8 rounded-[1.5rem] border bg-card p-5 shadow-card sm:p-7"
            aria-labelledby="product-buying-guide"
          >
            <h2 id="product-buying-guide" className="text-xl font-bold tracking-tight">
              {language === "ar" ? `معلومات عن ${node.title}` : `About ${node.title}`}
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground sm:text-base">
              {language === "ar"
                ? `${node.title}${brand?.label ? ` من ${brand.label}` : ""} متوفر عبر ${STORE_NAME}. راجع السعر الحالي والتوفر والخيارات والمواصفات في هذه الصفحة قبل إتمام الطلب.`
                : `${node.title}${brand?.label ? ` by ${brand.label}` : ""} is available through ${STORE_NAME}. Review the current price, availability, options and specifications on this page before ordering.`}
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-surface p-4">
                <h3 className="font-bold">
                  {language === "ar" ? "المواصفات والخيارات" : "Specifications & options"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {language === "ar"
                    ? `يمكنك مراجعة ${category?.label ?? node.productType ?? "فئة المنتج"} وخيارات النسخة المتاحة مثل السعة أو اللون عندما تكون مدرجة.`
                    : `Review the ${category?.label ?? node.productType ?? "product category"} details and available variant options such as storage or colour when listed.`}
                </p>
              </div>
              <div className="rounded-2xl bg-surface p-4">
                <h3 className="font-bold">
                  {language === "ar" ? "السعر والتوفر" : "Price & availability"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {language === "ar"
                    ? `يعرض المتجر السعر الحالي وحالة المخزون المباشرة. الحالة الحالية: ${inStock ? "متوفر" : "غير متوفر"}.`
                    : `The store shows the current price and live stock status. Current status: ${inStock ? "in stock" : "out of stock"}.`}
                </p>
              </div>
              <div className="rounded-2xl bg-surface p-4">
                <h3 className="font-bold">
                  {language === "ar" ? "التوصيل والضمان" : "Delivery & warranty"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {language === "ar"
                    ? "راجع صفحات الشحن والضمان والإرجاع أو تواصل مع الدعم قبل الطلب إذا كنت تحتاج تفاصيل إضافية."
                    : "Check the shipping, warranty and returns pages, or contact support before ordering if you need additional details."}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
              <Link to="/shipping" className="text-primary hover:underline">
                {t("shippingTitle")}
              </Link>
              <Link to="/warranty" className="text-primary hover:underline">
                {t("warrantyTitle")}
              </Link>
              <Link to="/returns" className="text-primary hover:underline">
                {t("returnsTitle")}
              </Link>
            </div>
          </section>
        )}

        <section className="mt-8" aria-label="Official manufacturer information">
          <OfficialProductResearch
            title={node.title}
            {...(node.vendor ? { vendor: node.vendor } : {})}
          />
        </section>

        {similar.length > 0 && (
          <section className="mt-16 border-t pt-10" aria-labelledby="similar-products">
            <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
              <div className="min-w-0">
                <h2 id="similar-products" className="text-xl font-bold tracking-tight">
                  You may also like
                </h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  Recommended from the live {STORE_NAME} catalogue
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

        {sameVendorProducts.length > 0 && (
          <section className="mt-12 border-t pt-8" aria-labelledby="more-from-brand">
            <div className="home-section-header">
              <h2 id="more-from-brand" className="min-w-0 break-words text-xl font-bold">
                {t("moreFromBrand")} {brand?.label}
              </h2>
              {brand && (
                <Link
                  to="/brand/$slug"
                  params={{ slug: brand.slug }}
                  className="shrink-0 text-sm font-semibold text-primary hover:underline"
                >
                  {t("viewAll")}
                </Link>
              )}
            </div>
            <ProductRail products={sameVendorProducts} storageKey={`more-from-${node.vendor}`} />
          </section>
        )}
      </div>

      <div className="fixed bottom-[var(--mobile-nav-height)] left-0 right-0 z-30 border-t bg-background/90 px-4 py-2.5 backdrop-blur-xl sm:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => toggleWishlist(node.handle)}
            aria-label={wishlisted ? t("removeWishlist") : t("saveWishlist")}
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
              t("soldOut")
            )}
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}
