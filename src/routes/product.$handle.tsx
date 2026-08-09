import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  discountPercent,
  fetchProductByHandle,
  formatPrice,
  type ShopifyProduct,
} from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

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
  const variants = node.variants.edges.map((e) => e.node);
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const selectedVariant = variants.find((v) => v.id === variantId) ?? variants[0];
  const image = node.images.edges[0]?.node;

  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);

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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border bg-surface">
            {image ? (
              <img
                src={image.url}
                alt={image.altText ?? node.title}
                width={800}
                height={800}
                className="aspect-square w-full object-contain p-8"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div>
              {node.vendor && (
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {node.vendor}
                </p>
              )}
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{node.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-2xl font-bold">
                  {selectedVariant && formatPrice(selectedVariant.price.amount, currency)}
                </span>
                {discount !== null && compareAt && (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(compareAt, currency)}
                    </span>
                    <span className="rounded bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                      -{discount}%
                    </span>
                  </>
                )}
              </div>
              <p
                className={`mt-2 text-sm font-medium ${
                  selectedVariant?.availableForSale ? "text-success" : "text-muted-foreground"
                }`}
              >
                {selectedVariant?.availableForSale ? "In stock" : "Out of stock"}
              </p>
            </div>

            {node.description && (
              <p className="leading-relaxed text-muted-foreground">{node.description}</p>
            )}

            {variants.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => (
                  <Button
                    key={variant.id}
                    variant={variant.id === selectedVariant?.id ? "default" : "outline"}
                    size="sm"
                    disabled={!variant.availableForSale}
                    onClick={() => setVariantId(variant.id)}
                  >
                    {variant.title}
                  </Button>
                ))}
              </div>
            )}

            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={isLoading || !selectedVariant?.availableForSale}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : selectedVariant?.availableForSale ? (
                "Add to cart"
              ) : (
                "Sold out"
              )}
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

