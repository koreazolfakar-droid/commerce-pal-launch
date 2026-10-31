import { ProductRail } from "@/components/ProductRail";
import { useLanguage } from "@/lib/i18n";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
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
import { buildProductHighlights, buildProductSuggestions } from "@/lib/productPresentation";
import { buildDisplayOverview, buildDisplaySpecificationGroups, inferredBoxContents } from "@/lib/productDetailDisplay";
import { recommendationsQueryOptions, vendorProductsQueryOptions } from "@/lib/queries";
import { cmsQueryOptions } from "@/lib/cmsQuery";
import { fetchProductByHandle } from "@/lib/storefrontData";
import { discountPercent, formatPrice } from "@/lib/productPricing";
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
});

const FEATURE_ICONS = {
  power: Zap, technology: Cpu, port: Plug, display: Monitor, cable: Cable,
  storage: HardDrive, ram: Cpu, battery: Battery, camera: Camera,
  bluetooth: Bluetooth, color: Palette,
} as const;

function ProductPage() {
  const { t, language } = useLanguage();
  const { data: cms } = useQuery(cmsQueryOptions());
  const cmsStoreName = cms?.settings["site_name"];
  const cmsWhatsApp = cms?.settings["whatsapp_number"];
  const storeName =
    typeof cmsStoreName === "string" && cmsStoreName.trim() ? cmsStoreName.trim() : STORE_NAME;
  const whatsappNumber =
    typeof cmsWhatsApp === "string" && cmsWhatsApp.trim() ? cmsWhatsApp : undefined;
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
        window.location.assign("/cart");
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
  const category = primaryCategory(product);
  const busy = pending !== null || cartLoading;
  const isPhone = category?.slug === "smartphone" || category?.slug === "smartphones";
  const whatsappOrderUrl = productWhatsAppUrl({
    title: node.title,
    url: absoluteUrl(`/product/${node.handle}`),
    quantity,
    options: selectedVariant?.selectedOptions ?? [],
    whatsappNumber,
    storeName,
  });

  const content = useMemo(
    () => splitSections(parseDescription(node.descriptionHtml, node.description)),
    [node.descriptionHtml, node.description],
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

    return buildDisplaySpecificationGroups([...structuredGroups, ...groupSpecs(fallbackRows)], node.title, language);
  }, [
    content.specs,
    selectedVariant,
    node.productType,
    node.vendor,
    node.specificationGroups,
    node.title,
    language,
  ]);

  const { similar, sameVendor } = useMemo(
    () => buildProductSuggestions({ current: product, recommendations: recommended, vendorProducts }),
    [product, recommended, vendorProducts],
  );
  const highlights = useMemo(
    () => buildProductHighlights(specGroups, node.title),
    [specGroups, node.title],
  );

  const displayOverview = useMemo(
    () => buildDisplayOverview(content.overview, node.title, node.vendor, language),
    [content.overview, node.title, node.vendor, language],
  );
  const displayBox = useMemo(
    () => content.box.length ? content.box : inferredBoxContents(node.title, language),
    [content.box, node.title, language],
  );
  const hasOverview = displayOverview.length > 0;
  const hasBox = displayBox.length > 0;
  const hasShipping = content.shipping.length > 0;
  const hasSpecs = specGroups.length > 0;
  const defaultTab = hasOverview ? "overview" : "specifications";
  const selectedOptionSummary = (selectedVariant?.selectedOptions ?? [])
    .filter((option) => option.value !== "Default Title")
    .map((option) => option.value)
    .join(" · ");
  const maxQuantity =
    selectedVariant?.trackInventory && !selectedVariant.allowBackorder
      ? Math.max(0, Math.min(99, Math.trunc(selectedVariant.stockQuantity ?? 0)))
      : 99;

  useEffect(() => {
    setQuantity((current) => Math.max(1, Math.min(current, Math.max(1, maxQuantity))));
  }, [maxQuantity, selectedVariant?.id]);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-4 pb-[calc(var(--mobile-nav-height)+5.75rem)] sm:px-5 sm:pb-16 lg:px-6 lg:py-10 lg:pb-14">
        <nav
          aria-label="Breadcrumb"
          className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"
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

        <div
          data-testid="product-detail-canvas"
          className="mt-0 grid gap-6 sm:mt-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.95fr)] lg:gap-12"
        >
          <ProductGallery
            images={images}
            title={node.title}
            activeIndex={activeImage}
            onSelect={setActiveImage}
            badge={
              discount !== null ? (
                <span className="absolute left-3 top-3 rounded-lg bg-destructive px-2.5 py-1 text-[11px] font-semibold text-destructive-foreground sm:left-4 sm:top-4">
                  -{discount}%
                </span>
              ) : null
            }
          />

          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:py-2">
            <div className="min-w-0">
              {brand && (
                <Link
                  to="/brand/$slug"
                  params={{ slug: brand.slug }}
                  className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-primary"
                >
                  {brand.label}
                </Link>
              )}
              <h1 className="mt-1.5 max-w-3xl text-balance break-words text-[1.45rem] font-semibold leading-[1.24] tracking-[-0.025em] text-foreground sm:text-3xl lg:text-[2rem] lg:leading-[1.16]">
                {node.title}
              </h1>
              {selectedOptionSummary && (
                <p className="mt-2 text-sm text-muted-foreground">{selectedOptionSummary}</p>
              )}
              <p
                className={cn(
                  "mt-2 inline-flex items-center gap-2 text-xs font-medium",
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
            </div>

            <VariantPicker
              options={node.options ?? []}
              variants={variants}
              selected={selectedOptions}
              onSelect={handleOptionSelect}
            />

            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-xl font-semibold tabular-nums tracking-[-0.02em] text-foreground sm:text-2xl">
                    {selectedVariant && formatPrice(selectedVariant.price.amount, currency)}
                  </span>
                  {discount !== null && compareAt && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(compareAt, currency)}
                    </span>
                  )}
                </div>
                {discount !== null && (
                  <p className="mt-1 text-[11px] font-medium text-primary">{language === "ar" ? "وفّر" : "Save"} {discount}%</p>
                )}
              </div>

              <div
                className="flex h-11 shrink-0 items-center rounded-xl border border-border/70 bg-background"
                aria-label={language === "ar" ? "الكمية" : "Quantity"}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-xl"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={busy || quantity <= 1}
                  aria-label={t("decreaseQuantity")}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-xl"
                  onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                  disabled={busy || !inStock || quantity >= maxQuantity}
                  aria-label={t("increaseQuantity")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="hidden gap-2 sm:flex">
              <Button
                size="lg"
                onClick={() => handleAddToCart()}
                disabled={busy || !inStock}
                className="press flex-1 rounded-xl"
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
                className="press rounded-xl"
              >
                {pending === "buy" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {language === "ar" ? "اشترِ الآن" : "Buy now"}
              </Button>
            </div>

            {highlights.length > 0 && (
              <section
                data-testid="product-key-features"
                aria-label={language === "ar" ? "أبرز المواصفات" : "Key product highlights"}
                className="min-w-0"
              >
                <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground">
                  {language === "ar" ? "أبرز المميزات" : "Key features"}
                </h2>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {highlights.map((highlight) => {
                    const HighlightIcon = FEATURE_ICONS[highlight.key as keyof typeof FEATURE_ICONS] ?? Sparkles;
                    return (
                      <div key={highlight.key} className="flex min-w-0 items-start gap-2.5 rounded-2xl border border-primary/10 bg-primary/[0.05] p-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <HighlightIcon aria-hidden className="h-[18px] w-[18px]" />
                        </span>
                        <div className="min-w-0">
                          <strong className="block break-words text-sm font-semibold leading-snug text-foreground">
                            {highlight.value}
                          </strong>
                          <span className="mt-1 block break-words text-[11px] leading-snug text-muted-foreground">
                            {language === "ar" ? highlight.labelAr : highlight.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <div
              className="grid grid-cols-3 border-y border-border/60 py-1"
              aria-label="Product actions"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleWishlist(node.handle)}
                aria-pressed={wishlisted}
                aria-label={wishlisted ? t("removeWishlist") : t("saveWishlist")}
                className="h-11 min-w-0 rounded-lg px-2 text-xs sm:text-sm"
              >
                <Heart className={cn("h-4 w-4 shrink-0", wishlisted && "fill-primary text-primary")} />
                <span className="truncate sm:hidden">{t(wishlisted ? "saved" : "wishlistShort")}</span>
                <span className="hidden truncate sm:inline">{t(wishlisted ? "saved" : "saveWishlist")}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                aria-label={t("shareProduct")}
                className="h-11 min-w-0 rounded-lg px-2 text-xs sm:text-sm"
              >
                <Share2 aria-hidden className="h-4 w-4 shrink-0" />
                <span className="truncate sm:hidden">{t("shareShort")}</span>
                <span className="hidden truncate sm:inline">{t("shareProduct")}</span>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-11 min-w-0 rounded-lg px-2 text-xs text-success hover:bg-success/10 hover:text-success sm:text-sm"
              >
                <a href={whatsappOrderUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  <span className="truncate">WhatsApp</span>
                </a>
              </Button>
            </div>

            {isPhone && <div className="-mt-2 flex justify-start"><CompareButton handle={node.handle} /></div>}

            <ul className="flex flex-wrap items-center gap-x-4 gap-y-3 text-xs text-muted-foreground">
              {PURCHASE_ASSURANCES.slice(0, 3).map((item) => (
                <li key={item.title} className="flex min-w-[7rem] flex-1 basis-[30%] items-center gap-1.5">
                  <item.icon aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-medium text-foreground">{item.title}</span>
                </li>
              ))}
            </ul>

          </div>
        </div>

        {(hasOverview || hasSpecs) && (
          <section
            data-testid="product-information"
            className="mt-9 min-w-0 border-t border-border/60 pt-7 sm:mt-11"
            aria-label={language === "ar" ? "معلومات المنتج" : "Product details"}
          >
            <div className="mb-5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {language === "ar" ? "معلومات المنتج" : "Product information"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {language === "ar" ? "الوصف والمواصفات المتوفرة لهذا المنتج" : "Description and confirmed technical details"}
              </p>
            </div>
            <Tabs defaultValue={defaultTab} className="w-full min-w-0">
              <TabsList className="mb-5 h-auto w-full justify-start gap-7 rounded-none border-b border-border/70 bg-transparent p-0">
                {hasOverview && (
                  <TabsTrigger
                    value="overview"
                    className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:text-base"
                  >
                    {language === "ar" ? "الوصف" : "Description"}
                  </TabsTrigger>
                )}
                {hasSpecs && (
                  <TabsTrigger
                    value="specifications"
                    className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:text-base"
                  >
                    {language === "ar" ? "المواصفات التقنية" : "Specifications"}
                  </TabsTrigger>
                )}
              </TabsList>
              {hasOverview && (
                <TabsContent value="overview" className="mt-0 min-w-0">
                  <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
                    <h3 className="mb-3 text-base font-semibold text-foreground">
                      {language === "ar" ? "نظرة عامة" : "Product overview"}
                    </h3>
                    <ProseSections sections={displayOverview} plain language={language} />
                  </div>
                </TabsContent>
              )}
              {hasSpecs && (
                <TabsContent value="specifications" className="mt-0 min-w-0">
                  <SpecSheet groups={specGroups} language={language} />
                </TabsContent>
              )}
            </Tabs>
          </section>
        )}

        {(hasBox || hasShipping) && (
          <section className="mt-7 grid min-w-0 gap-4 sm:grid-cols-2" aria-label={language === "ar" ? "محتويات المنتج والتوصيل" : "Product contents and delivery"}>
            {hasBox && (
              <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <h2 className="mb-3 text-base font-semibold">
                  {language === "ar" ? "محتويات العلبة" : "What's in the box"}
                </h2>
                <ProseSections sections={displayBox} plain language={language} />
              </div>
            )}
            {hasShipping && (
              <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <h2 className="mb-3 text-base font-semibold">
                  {language === "ar" ? "الشحن والإرجاع" : "Shipping & returns"}
                </h2>
                <ProseSections sections={content.shipping} plain language={language} />
              </div>
            )}
          </section>
        )}

        <nav
          aria-label={language === "ar" ? "سياسات المتجر" : "Store policies"}
          className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-5 text-sm font-medium"
        >
          <p className="w-full text-xs font-normal text-muted-foreground">
            {language === "ar" ? "اطّلع على تفاصيل التوصيل والضمان والإرجاع في سياسات المتجر." : "Review our delivery, warranty and returns policies for details."}
          </p>
          <Link to="/shipping" className="text-primary hover:underline">{t("shippingTitle")}</Link>
          <Link to="/warranty" className="text-primary hover:underline">{t("warrantyTitle")}</Link>
          <Link to="/returns" className="text-primary hover:underline">{t("returnsTitle")}</Link>
        </nav>

        {similar.length > 0 && (
          <section className="mt-12 border-t border-border/60 pt-8" aria-labelledby="similar-products">
            <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
              <div className="min-w-0">
                <h2 id="similar-products" className="text-xl font-semibold tracking-tight">
                  {language === "ar" ? "منتجات قد تعجبك" : "You may also like"}
                </h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {language === "ar" ? "اكتشف منتجات مشابهة" : "Discover similar products"}
                </p>
              </div>
              {category && (
                <Link
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  {t("viewAll")} <ChevronRight aria-hidden className="h-4 w-4 rtl:rotate-180" />
                </Link>
              )}
            </div>
            <ProductGrid products={similar} />
          </section>
        )}

        {sameVendor.length > 0 && (
          <section className="mt-12 border-t border-border/60 pt-8" aria-labelledby="more-from-brand">
            <div className="home-section-header">
              <h2 id="more-from-brand" className="min-w-0 break-words text-xl font-semibold">
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
            <ProductRail products={sameVendor} storageKey={`more-from-${node.vendor}`} />
          </section>
        )}
      </div>

      <div
        data-testid="product-purchase-bar"
        className="fixed bottom-[var(--mobile-nav-height)] left-0 right-0 z-40 border-t border-border/70 bg-background/95 supports-[backdrop-filter]:bg-background/90 supports-[backdrop-filter]:backdrop-blur-md sm:hidden"
      >
        <div className="mx-auto flex min-h-16 max-w-[560px] items-center gap-4 px-4 py-2.5">
          <div className="min-w-0 shrink-0">
            <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {language === "ar" ? "السعر" : "Price"}
            </span>
            <span className="block truncate text-base font-semibold tabular-nums text-foreground">
              {selectedVariant && formatPrice(selectedVariant.price.amount, currency)}
            </span>
          </div>
          <Button
            onClick={() => handleAddToCart()}
            disabled={busy || !inStock}
            className="press h-11 min-w-0 flex-1 rounded-xl text-sm font-semibold"
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
        </div>
      </div>
    </StoreLayout>
  );
}
