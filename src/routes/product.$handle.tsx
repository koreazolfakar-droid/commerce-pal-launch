import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { CartDrawer } from "@/components/CartDrawer";
import { Button } from "@/components/ui/button";
import { fetchProductByHandle, formatPrice } from "@/lib/shopify";
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
  const { product } = Route.useLoaderData();
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </Link>
          <CartDrawer />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-muted">
          {image ? (
            <img
              src={image.url}
              alt={image.altText ?? node.title}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{node.title}</h1>
            <p className="mt-3 text-2xl font-semibold text-primary">
              {selectedVariant &&
                formatPrice(selectedVariant.price.amount, selectedVariant.price.currencyCode)}
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
              "Add to Cart"
            ) : (
              "Sold out"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
