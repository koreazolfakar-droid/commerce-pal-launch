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
import { GeminiShoppingAdvisor } from "@/components/GeminiShoppingAdvisor";
import { ProseSections } from "@/components/product/ProseSection";
import { SpecSheet } from "@/components/product/SpecSheet";
import { VariantPicker } from "@/components/product/VariantPicker";
import { ProductGrid } from "@/components/ProductGrid";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupSpecs, parseDescription, splitSections, type SpecRow } from "@/lib/productContent";
import { recommendationsQueryOptions, vendorProductsQueryOptions } from "@/lib/queries";
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
import { absoluteUrl, breadcrumbJsonLd, canonicalLink, jsonLd, productJsonLd, socialMeta } from "@/lib/seo";
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
    const title = loaderData.product.node.title ?? "Product";
    const metaTitle = `${title} | ${STORE_NAME} Lebanon`;
    const description =
      loaderData.product.node.description?.replace(/\s+/g, " ").trim().slice(0, 155) ||
      `Shop ${title} in Lebanon at ${STORE_NAME} with live availability and secure Shopify checkout.`;
    const image = loaderData.product.node.images.edges[0]?.node.url;
    const path = `/product/${params.handle}`;
    const product = loaderData.product;
    return {
      meta: [
        { title: metaTitle },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
        ...socialMeta({
          title: metaTitle,
          description,
          path,
          image: image || absoluteUrl("/logo.png"),
          type: "product",
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
  const { t } = useLanguage();
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
      await addItem({ product, variantId: selectedVariant.id, quantity });
      if (checkout) {
        const url = useCartStore.getState().getCheckoutUrl();
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast.success(t("addedToBag"));
      }
    } catch {
      toast.error(t("addToBagFailed"));
    } finally {
      setPending(null);
    }
  };

  const parsed = useMemo(
    () => splitSections(parseDescription(node.descriptionHtml, node.description)),
    [node.descriptionHtml, node.description],
  );
  const specs = useMemo(() => groupSpecs(parsed.specs), [parsed.specs]);
  const brand = resolveBrand(node);
  const category = primaryCategory(node);
  const price = selectedVariant?.price ?? node.priceRange.minVariantPrice;
  const compareAt = selectedVariant?.compareAtPrice;
  const sale = compareAt ? discountPercent(compareAt, price) : null;

  return (
    <StoreLayout>
      <main className="mx-auto max-w-7xl px-4 py-6 lg:py-10">
        <nav className="mb-5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary">{t("home")}</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/shop" className="hover:text-primary">{t("shop")}</Link>
          {category && <><ChevronRight className="h-3.5 w-3.5" /><Link to="/category/$slug" params={{ slug: category.slug }} className="hover:text-primary">{category.label}</Link></>}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-foreground">{node.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12">
          <ProductGallery images={images} activeIndex={activeImage} onActiveIndexChange={setActiveImage} title={node.title} />

          <section>
            {brand && (
              <div className="mb-3 flex items-center gap-2">
                <BrandLogo slug={brand.slug} label={brand.label} size={28} />
                <Link to="/brand/$slug" params={{ slug: brand.slug }} className="text-sm font-semibold text-muted-foreground hover:text-primary">{brand.label}</Link>
              </div>
            )}
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">{node.title}</h1>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <span className="text-2xl font-black">{formatPrice(price)}</span>
              {compareAt && Number(compareAt.amount) > Number(price.amount) && (
                <span className="text-base text-muted-foreground line-through">{formatPrice(compareAt)}</span>
              )}
              {sale !== null && sale > 0 && <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">-{sale}%</span>}
            </div>

            <VariantPicker variants={variants} selectedOptions={selectedOptions} onSelect={handleOptionSelect} />

            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-11 items-center rounded-full border">
                <button type="button" aria-label={t("decreaseQuantity")} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-11 w-10 place-items-center"><Minus className="h-4 w-4" /></button>
                <span className="min-w-8 text-center text-sm font-bold tabular-nums">{quantity}</span>
                <button type="button" aria-label={t("increaseQuantity")} onClick={() => setQuantity((value) => value + 1)} className="grid h-11 w-10 place-items-center"><Plus className="h-4 w-4" /></button>
              </div>
              <Button disabled={!selectedVariant?.availableForSale || cartLoading || pending !== null} onClick={() => handleAddToCart(false)} className="h-11 flex-1 rounded-full font-bold">
                {pending === "cart" ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="me-2 h-4 w-4" />}
                {selectedVariant?.availableForSale ? t("addToBag") : t("outOfStock")}
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button variant="secondary" disabled={!selectedVariant?.availableForSale || pending !== null} onClick={() => handleAddToCart(true)} className="h-11 rounded-full font-bold">
                {pending === "buy" ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Zap className="me-2 h-4 w-4" />}{t("buyNow")}
              </Button>
              <a href={productWhatsAppUrl(node.title, absoluteUrl(`/product/${node.handle}`))} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-bold hover:border-primary hover:text-primary"><MessageCircle className="me-2 h-4 w-4" />WhatsApp</a>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => toggleWishlist(node.handle)} className={cn("inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold", wishlisted && "border-primary text-primary")}><Heart className={cn("h-4 w-4", wishlisted && "fill-current")} />{t("wishlistTitle")}</button>
              <CompareButton product={product} />
              <button type="button" onClick={handleShare} className="inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold"><Share2 className="h-4 w-4" />{t("share")}</button>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {PURCHASE_ASSURANCES.map((assurance) => (
                <div key={assurance.title} className="rounded-xl border bg-surface px-3 py-3">
                  <p className="text-xs font-bold">{assurance.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{assurance.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <Tabs defaultValue="details" className="mt-10">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
            <TabsTrigger value="details">{t("details")}</TabsTrigger>
            <TabsTrigger value="specs">{t("specifications")}</TabsTrigger>
            <TabsTrigger value="research">{t("officialResearch")}</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-5"><ProseSections sections={parsed.sections} fallback={node.description} /></TabsContent>
          <TabsContent value="specs" className="mt-5"><SpecSheet groups={specs as Array<{ title: string; rows: SpecRow[] }>} /></TabsContent>
          <TabsContent value="research" className="mt-5"><OfficialProductResearch product={product} /></TabsContent>
        </Tabs>

        <GeminiShoppingAdvisor product={product} />

        {recommended?.length ? <section className="mt-12"><h2 className="mb-5 text-xl font-black">{t("youMayAlsoLike")}</h2><ProductRail products={recommended} storageKey={`recommended-${node.handle}`} /></section> : null}
        {vendorProducts?.length ? <section className="mt-12"><h2 className="mb-5 text-xl font-black">{t("moreFromBrand")}</h2><ProductGrid products={vendorProducts.filter((item) => item.node.handle !== node.handle).slice(0, 8)} /></section> : null}
      </main>
    </StoreLayout>
  );
}
