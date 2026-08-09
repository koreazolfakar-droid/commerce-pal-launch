import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

export function ProductCard({ product }: { product: ShopifyProduct }) {
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);

  const node = product.node;
  const selectedVariant = node.variants.edges[0]?.node;
  const image = node.images.edges[0]?.node;

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
    <article className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary/50">
      <Link
        to="/product/$handle"
        params={{ handle: node.handle }}
        className="block aspect-square overflow-hidden bg-muted"
      >
        {image ? (
          <img
            src={image.url}
            alt={image.altText ?? node.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to="/product/$handle" params={{ handle: node.handle }}>
          <h3 className="font-semibold leading-tight">{node.title}</h3>
        </Link>
        {node.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{node.description}</p>
        )}
        <p className="mt-auto pt-2 text-lg font-bold">
          {formatPrice(
            node.priceRange.minVariantPrice.amount,
            node.priceRange.minVariantPrice.currencyCode,
          )}
        </p>
        <Button onClick={handleAddToCart} disabled={isLoading || !selectedVariant} className="w-full">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to Cart"}
        </Button>
      </div>
    </article>
  );
}
