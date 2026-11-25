import { useLanguage } from "@/lib/i18n";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  ChevronRight,
  ChevronDown,
  Cpu,
  Cable,
  HardDrive,
  Monitor,
  Battery,
  Plug,
  Palette,
  Camera,
  Bluetooth,
  Sparkles,
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

import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInformation } from "@/components/product/ProductInformation";
import "@/components/product/product-detail.css";
import { VariantPicker } from "@/components/product/VariantPicker";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { groupSpecs, parseDescription, splitSections, type SpecRow } from "@/lib/productContent";
import { productOptionKind } from "@/lib/productOptionDisplay";
import { buildProductHighlights, formatProductHighlight } from "@/lib/productPresentation";
import {
  buildDisplayOverview,
  buildDisplaySpecificationGroups,
  inferredBoxContents,
  reconcileVariantSpecifications,
} from "@/lib/productDetailDisplay";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { fetchProductByHandle } from "@/lib/storefrontData";
import { subscribeStorefrontRefresh } from "@/lib/nativeStore";
import { optionsForVariant, selectProductVariant } from "@/lib/productVariantSelection";
import { discountPercent, formatPrice, productPrimaryVariant } from "@/lib/productPricing";
import type { StoreProduct } from "@/lib/storeTypes";
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
    if (!product) throw notFound({ routeId: Route.id });
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
    const fullTitle = product.node.seoTitle?.trim() || `${title} — ${STORE_NAME}`;
    const description = product.node.seoDescription?.trim() || productMetaDescription(product);
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
  pendingComponent: ProductPending,
  notFoundComponent: ProductUnavailable,
  errorComponent: ProductLoadError,
  pendingMs: 200,
  pendingMinMs: 0,
});

function ProductPending() {
  const { language } = useLanguage();
  return (
    <StoreLayout>
      <div
        className="mx-auto w-full max-w-7xl px-4 pb-6 pt-12 sm:px-5 lg:px-8"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">
          {language === "ar" ? "جارٍ تحميل المنتج" : "Loading product"}
        </span>
        <div className="product-showcase" aria-hidden="true">
          <div className="product-heading grid gap-3 py-2">
            <div className="shimmer h-5 w-24 rounded-full bg-surface" />
            <div className="shimmer h-9 w-4/5 rounded-lg bg-surface" />
          </div>
          <div className="product-showcase-gallery">
            <div className="product-gallery-stage shimmer rounded-2xl bg-surface" />
          </div>
          <div className="product-buy-panel space-y-5">
            <div className="shimmer h-8 w-28 rounded-lg bg-surface" />
            <div className="shimmer h-5 w-2/3 rounded-lg bg-surface" />
            <div className="shimmer h-12 w-full rounded-xl bg-surface" />
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}

const FEATURE_ICONS = {
  power: Zap,
  technology: Cpu,
  processor: Cpu,
  port: Plug,
  display: Monitor,
  cable: Cable,
  storage: HardDrive,
  ram: Cpu,
  battery: Battery,
  camera: Camera,
  bluetooth: Bluetooth,
  color: Palette,
} as const;

function ProductUnavailable() {
  return <ProductStatus />;
}

function ProductLoadError() {
  const router = useRouter();
  return <ProductStatus onRetry={() => void router.invalidate()} />;
}

function ProductStatus({ onRetry }: { onRetry?: () => void }) {
  const { t, language } = useLanguage();
  const ar = language === "ar";
  const title = onRetry
    ? ar
      ? "تعذّر تحميل المنتج"
      : "Unable to load this product"
    : ar
      ? "هذا المنتج غير متاح"
      : "This product is unavailable";

  return (
    <StoreLayout>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="flex flex-wrap justify-center gap-3">
          {onRetry && <Button onClick={onRetry}>{ar ? "حاول مجددًا" : "Try again"}</Button>}
          <Button asChild variant={onRetry ? "outline" : "default"}>
            <Link to="/shop">{t("shop")}</Link>
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}

// Suggestions can fail independently of the purchase experience.
const LazyProductSuggestions = lazy(() =>
  import("@/components/product/ProductSuggestions").catch(() => ({ default: () => null })),
);

function DeferredProductSuggestions(props: {
  product: StoreProduct;
  brand: ReturnType<typeof resolveBrand>;
  category: ReturnType<typeof primaryCategory>;
}) {
  const marker = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const element = marker.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px 480px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={marker} className="min-h-px">
      {nearViewport && (
        <Suspense fallback={null}>
          <LazyProductSuggestions {...props} />
        </Suspense>
      )}
    </div>
  );
}

function ProductPage() {
  const { product } = Route.useLoaderData();
  return (
    <StoreLayout productPurchaseBar>
      <ProductDetails key={product.node.handle} product={product} />
    </StoreLayout>
  );
}

function ProductDetails({ product }: { product: StoreProduct }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { data: cms } = useQuery(cmsQueryOptions());
  const cmsStoreName = cms?.settings["site_name"];
  const cmsWhatsApp = cms?.settings["whatsapp_number"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const whatsappNumber =
    typeof cmsWhatsApp === "string" && cmsWhatsApp.trim() ? cmsWhatsApp : undefined;
  const node = product.node;
  const displayTitle = language === "ar" && node.titleAr?.trim() ? node.titleAr : node.title;
  const variants = useMemo(() => node.variants.edges.map((edge) => edge.node), [node]);
  const images = useMemo(() => node.images.edges.map((edge) => edge.node), [node]);
  const galleryImages = useMemo(() => {
    const all = [...images];
    const known = new Set(images.map((image) => image.url));
    // Dashboard variants can have their own picture even if it is not in the
    // product-wide image list. Preserve both sources without duplicates.
    for (const variant of variants) {
      const image = variant.image;
      if (!image?.url || known.has(image.url)) continue;
      all.push({ url: image.url, altText: image.altText ?? displayTitle });
      known.add(image.url);
    }
    return all;
  }, [images, variants, displayTitle]);

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    () => productPrimaryVariant(product)?.id,
  );
  const [viewedImage, setViewedImage] = useState<string>();
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState<"cart" | "buy" | null>(null);

  const selectedVariant = useMemo(
    () =>
      variants.find((variant) => variant.id === selectedVariantId) ??
      productPrimaryVariant(product),
    [variants, selectedVariantId, product],
  );
  const selectedOptions = useMemo(() => optionsForVariant(selectedVariant), [selectedVariant]);
  const preferredImage = viewedImage ?? selectedVariant?.image?.url;
  const activeImage = Math.max(
    0,
    galleryImages.findIndex((image) => image.url === preferredImage),
  );

  const addItem = useCartStore((state) => state.addItem);
  const cartLoading = useCartStore((state) => state.isLoading);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );
  const wishlisted = useWishlistStore((state) => state.handles.includes(node.handle));
  const toggleWishlist = useWishlistToggle();
  const addRecentlyViewed = useRecentlyViewedStore((state) => state.add);
  useEffect(() => {
    addRecentlyViewed(node.handle);
  }, [addRecentlyViewed, node.handle]);

  // Dashboard edits invalidate the native cache and re-run this route's direct
  // Supabase loader, including changes made in another tab of this browser.
  useEffect(() => {
    const unsubscribe = subscribeStorefrontRefresh(() => {
      void router.invalidate();
    });
    return () => {
      unsubscribe();
    };
  }, [router]);

  const handleOptionSelect = (name: string, value: string) => {
    const next = selectProductVariant(variants, selectedVariant, name, value);
    if (!next) return;
    setSelectedVariantId(next.id);
    setViewedImage(undefined);
    setQuantity(1);
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) await navigator.share({ title: displayTitle, url });
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
      toast.success(`${displayTitle}: ${t("addedToCart")}`, { position: "top-center" });
      if (checkout) {
        await router.navigate({ to: "/cart" });
      }
    } catch {
      toast.error(t("addToCartFailed"));
    } finally {
      setPending(null);
    }
  };

  const price = selectedVariant?.price ?? node.priceRange.minVariantPrice;
  const priceLabel = formatPrice(price.amount, price.currencyCode);
  const compareAt = selectedVariant
    ? selectedVariant.compareAtPrice?.amount
    : node.compareAtPriceRange?.minVariantPrice.amount;
  const discount = discountPercent(price.amount, compareAt);
  const inStock = Boolean(selectedVariant?.availableForSale);
  const brand = resolveBrand(product);
  const category = primaryCategory(product);
  const busy = pending !== null || cartLoading;
  const whatsappOrderUrl = productWhatsAppUrl({
    title: displayTitle,
    url: absoluteUrl(`/product/${node.handle}`),
    quantity,
    options: selectedVariant?.selectedOptions ?? [],
    whatsappNumber,
    storeName,
  });

  const content = useMemo(
    () =>
      splitSections(
        parseDescription(
          language === "ar" && node.descriptionAr?.trim() ? undefined : node.descriptionHtml,
          language === "ar" && node.descriptionAr?.trim() ? node.descriptionAr : node.description,
        ),
      ),
    [language, node.descriptionHtml, node.description, node.descriptionAr],
  );

  const specGroups = useMemo(() => {
    const structuredGroups = (node.specificationGroups ?? []).map((group) => ({
      title: language === "ar" ? group.titleAr || group.title : group.title,
      rows: group.rows.map((row) => ({
        label: language === "ar" ? row.labelAr || row.label : row.label,
        value: row.value,
      })),
    }));
    const structuredLabels = new Set(
      structuredGroups.flatMap((group) =>
        group.rows.map((row) => row.label.trim().toLocaleLowerCase()),
      ),
    );
    const fallbackRows: SpecRow[] = [
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
    ].filter((row) => !structuredLabels.has(row.label.trim().toLocaleLowerCase()));

    return reconcileVariantSpecifications(
      buildDisplaySpecificationGroups(
        [...structuredGroups, ...groupSpecs(fallbackRows)],
        node.title,
        language,
      ),
      selectedVariant?.selectedOptions ?? [],
      language,
    );
  }, [
    content.specs,
    selectedVariant,
    node.productType,
    node.vendor,
    node.specificationGroups,
    node.title,
    language,
  ]);

  const highlights = useMemo(() => {
    const optionKeys = new Set<string>(
      (node.options ?? []).map((option) => productOptionKind(option.name)),
    );
    return buildProductHighlights(specGroups, node.title, 6)
      .filter((highlight) => !optionKeys.has(highlight.key === "ram" ? "memory" : highlight.key))
      .slice(0, 6);
  }, [specGroups, node.title, node.options]);

  const showSpecifications = (event: MouseEvent<HTMLAnchorElement>) => {
    const details = document.getElementById("product-specifications");
    if (!(details instanceof HTMLDetailsElement)) return;
    event.preventDefault();
    details.open = true;
    details.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    details.querySelector("summary")?.focus({ preventScroll: true });
  };

  const specificationsLink = specGroups.length > 0 && (
    <a
      href="#product-specifications"
      data-testid="product-specifications-link"
      aria-controls="product-specifications"
      onClick={showSpecifications}
      className="product-spec-link"
    >
      {language === "ar" ? "عرض جميع المواصفات" : "View all specifications"}
      <ChevronDown aria-hidden className="size-4" strokeWidth={1.65} />
    </a>
  );

  const displayOverview = useMemo(
    () => buildDisplayOverview(content.overview, node.title, node.vendor, language),
    [content.overview, node.title, node.vendor, language],
  );
  const displayBox = useMemo(
    () => (content.box.length ? content.box : inferredBoxContents(node.title, language)),
    [content.box, node.title, language],
  );
  const maxQuantity =
    selectedVariant?.trackInventory && !selectedVariant.allowBackorder
      ? Math.max(0, Math.min(99, Math.trunc(selectedVariant.stockQuantity ?? 0)))
      : 99;

  useEffect(() => {
    setQuantity((current) => Math.max(1, Math.min(current, Math.max(1, maxQuantity))));
  }, [maxQuantity, selectedVariant?.id]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-4 pb-6 sm:px-5 sm:pb-16 lg:px-8 lg:pt-8">
        <nav
          aria-label={language === "ar" ? "مسار التنقل" : "Breadcrumb"}
          className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:text-sm"
        >
          <Link to="/" className="shrink-0 transition-colors hover:text-primary">
            {t("home")}
          </Link>
          <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" />
          <Link to="/shop" className="shrink-0 transition-colors hover:text-primary">
            {t("shop")}
          </Link>
          {category && (
            <>
              <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" />
              <Link
                to="/category/$slug"
                params={{ slug: category.slug }}
                className="min-w-0 truncate transition-colors hover:text-primary"
              >
                {category.label}
              </Link>
            </>
          )}
          <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" />
          <span aria-current="page" className="min-w-0 truncate text-foreground">
            {displayTitle}
          </span>
        </nav>

        <div data-testid="product-detail-canvas" className="product-showcase mt-4 sm:mt-6">
          <div className="product-heading">
            <div className="product-identity-row">
              {brand && (
                <Link
                  to="/brand/$slug"
                  params={{ slug: brand.slug }}
                  className="product-brand-link"
                >
                  <bdi>{brand.label}</bdi>
                </Link>
              )}
              <span
                className={cn("product-availability", inStock && "product-availability-in-stock")}
                aria-live="polite"
              >
                <span aria-hidden="true" />
                {t(inStock ? "inStock" : "outOfStock")}
              </span>
            </div>
            <h1 className="product-title">{displayTitle}</h1>
          </div>

          <ProductGallery
            className="product-showcase-gallery"
            images={galleryImages}
            title={displayTitle}
            activeIndex={activeImage}
            onSelect={(index) => setViewedImage(galleryImages[index]?.url)}
          />

          <div data-testid="product-buy-box" className="product-buy-panel">
            <div data-testid="product-price" className="product-price-line" aria-live="polite">
              <bdi className="product-current-price">{priceLabel}</bdi>
              {discount !== null && compareAt && (
                <del className="text-sm text-muted-foreground">
                  <bdi>{formatPrice(compareAt, price.currencyCode)}</bdi>
                </del>
              )}
              {discount !== null && (
                <span className="product-price-savings">
                  {language === "ar" ? "خصم" : "Save"} <bdi>{discount}%</bdi>
                </span>
              )}
            </div>

            <VariantPicker
              compactSingleValues
              options={node.options ?? []}
              variants={variants}
              selected={selectedOptions}
              onSelect={handleOptionSelect}
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">
                {language === "ar" ? "الكمية" : "Quantity"}
              </span>
              <div
                data-testid="product-quantity"
                role="group"
                className="product-quantity-stepper"
                aria-label={language === "ar" ? "الكمية" : "Quantity"}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={busy || quantity <= 1}
                  aria-label={t("decreaseQuantity")}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span
                  className="w-8 text-center text-sm font-semibold tabular-nums"
                  aria-live="polite"
                >
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full"
                  onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                  disabled={busy || !inStock || quantity >= maxQuantity}
                  aria-label={t("increaseQuantity")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="product-order-actions">
              <Button
                size="lg"
                onClick={() => handleAddToCart()}
                disabled={busy || !inStock}
                className="product-order-button product-order-primary press hidden sm:inline-flex"
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
                variant="outline"
                onClick={() => handleAddToCart(true)}
                disabled={busy || !inStock}
                className="product-order-button press"
              >
                {pending === "buy" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {language === "ar" ? "اشترِ الآن" : "Buy now"}
              </Button>
            </div>

            <div
              className="product-utility-actions"
              role="group"
              aria-label={language === "ar" ? "إجراءات المنتج" : "Product actions"}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleWishlist(node.handle)}
                aria-pressed={wishlisted}
                aria-label={wishlisted ? t("removeWishlist") : t("saveWishlist")}
                className="product-utility-action"
              >
                <Heart
                  className={cn("h-4 w-4 shrink-0", wishlisted && "fill-primary text-primary")}
                />
                <span>{t(wishlisted ? "saved" : "wishlistShort")}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                aria-label={t("shareProduct")}
                className="product-utility-action"
              >
                <Share2 aria-hidden className="h-4 w-4 shrink-0" />
                <span>{t("shareShort")}</span>
              </Button>
              <Button asChild variant="ghost" size="sm" className="product-utility-action">
                <a
                  href={whatsappOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={language === "ar" ? "اسأل عن المنتج" : "Ask a question"}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{language === "ar" ? "اسألنا" : "Ask us"}</span>
                </a>
              </Button>
            </div>
          </div>
        </div>

        <ul
          className="product-assurances"
          aria-label={language === "ar" ? "خدمات المتجر" : "Store services"}
        >
          {PURCHASE_ASSURANCES.slice(0, 3).map((item, index) => (
            <li key={item.title}>
              <item.icon aria-hidden strokeWidth={1.65} />
              <span>
                {language === "ar"
                  ? ["منتجات أصلية", "توصيل سريع", "سهولة الإرجاع"][index]
                  : item.title}
              </span>
            </li>
          ))}
        </ul>

        {highlights.length > 0 && (
          <section className="product-feature-section" aria-labelledby="product-features-title">
            <div className="product-section-heading">
              <h2 id="product-features-title" className="product-section-title">
                {language === "ar" ? "أبرز المواصفات" : "Key features"}
              </h2>
              {specificationsLink}
            </div>
            <dl data-testid="product-key-features" className="product-feature-grid">
              {highlights.map((highlight) => {
                const Icon = FEATURE_ICONS[highlight.key as keyof typeof FEATURE_ICONS] ?? Sparkles;
                return (
                  <div key={highlight.key} className="product-feature">
                    <dt>
                      <Icon aria-hidden strokeWidth={1.65} />
                      {language === "ar" ? highlight.labelAr : highlight.label}
                    </dt>
                    <dd title={highlight.value}>
                      <bdi>{formatProductHighlight(highlight.key, highlight.value)}</bdi>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        <ProductInformation
          key={node.handle}
          overview={displayOverview}
          specifications={specGroups}
          box={displayBox}
          shipping={content.shipping}
          headingAction={highlights.length === 0 ? specificationsLink : undefined}
          language={language}
        />

        <DeferredProductSuggestions product={product} brand={brand} category={category} />
      </div>

      <div
        data-testid="product-purchase-bar"
        className="product-purchase-dock fixed inset-x-0 bottom-0 z-40 sm:hidden"
      >
        <div className="mx-auto flex min-h-16 max-w-[560px] items-center gap-2.5 px-3 pt-2.5 min-[375px]:gap-4 min-[375px]:px-4 pb-[calc(.625rem+env(safe-area-inset-bottom,0px))]">
          <div className="min-w-0 shrink-0">
            <span className="block text-xs font-medium text-muted-foreground">
              {language === "ar" ? "السعر" : "Price"}
            </span>
            <bdi className="block text-base font-bold tabular-nums text-foreground">
              {priceLabel}
            </bdi>
          </div>
          <Button
            onClick={() => handleAddToCart()}
            disabled={busy || !inStock}
            className="product-order-primary press h-11 min-w-0 flex-1 whitespace-normal rounded-full px-2 text-center text-sm font-semibold leading-tight"
          >
            {pending === "cart" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : inStock ? (
              <>
                <ShoppingBag className="h-4 w-4" />
                {t("addToCart")}
              </>
            ) : (
              t("soldOut")
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            data-testid="product-open-bag"
            aria-label={`${t("openBag")}, ${cartCount}`}
            onClick={() => document.dispatchEvent(new CustomEvent("space-cell:open-cart"))}
            className="relative h-11 w-11 shrink-0 rounded-full"
          >
            <ShoppingBag aria-hidden className="h-4 w-4" />
            {cartCount > 0 && (
              <span
                aria-hidden
                className="absolute -end-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
