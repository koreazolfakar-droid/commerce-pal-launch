import { productPrimaryVariant, productCompareAt } from "@/lib/productPricing";
import { Link } from "@tanstack/react-router";
import { ProductImage } from "@/components/ProductImage";
import { QuickViewButton } from "@/components/product/QuickViewButton";
import { discountPercent, formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { useLanguage } from "@/lib/i18n";

/** Give a small set of offers enough space without leaving an almost empty rail. */
export function DealSpotlight({ products }: { products: ShopifyProduct[] }) {
  const { t } = useLanguage();
  return (
    <div data-testid="deal-spotlight" className="grid gap-4">
      {products.map((product) => {
        const node = product.node;
        const variant = productPrimaryVariant(product);
        const price = variant?.price ?? node.priceRange.minVariantPrice;
        const compareAt = productCompareAt(product);
        const discount = discountPercent(price.amount, compareAt);
        const image = node.images.edges[0]?.node;
        return (
          <article
            key={node.id}
            className="group grid min-w-0 overflow-hidden rounded-3xl border bg-card shadow-card sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          >
            <div className="relative min-w-0 bg-image-stage">
              <Link to="/product/$handle" params={{ handle: node.handle }} aria-label={node.title}>
                <ProductImage
                  url={image?.url}
                  alt={image?.altText ?? node.title}
                  size={640}
                  sizes="(min-width: 1024px) 420px, (min-width: 640px) 40vw, 92vw"
                />
              </Link>
              <QuickViewButton product={product} />
            </div>
            <div className="flex min-w-0 flex-col items-start justify-center gap-4 p-5 sm:p-8">
              {discount !== null && (
                <span className="rounded-full bg-destructive px-3 py-1.5 text-lg font-bold text-destructive-foreground">
                  −{discount}%
                </span>
              )}
              <h3 className="break-words text-xl font-bold leading-snug sm:text-2xl">
                <Link to="/product/$handle" params={{ handle: node.handle }}>
                  {node.title}
                </Link>
              </h3>
              {node.description && (
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {node.description}
                </p>
              )}
              <div className="flex flex-wrap items-baseline gap-3">
                <bdi className="text-2xl font-bold">
                  {formatPrice(price.amount, price.currencyCode)}
                </bdi>
                {discount !== null && compareAt && (
                  <del className="text-sm text-muted-foreground">
                    <bdi>{formatPrice(compareAt, price.currencyCode)}</bdi>
                  </del>
                )}
              </div>
              <Link
                to="/product/$handle"
                params={{ handle: node.handle }}
                className="press inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
              >
                {t("shopDeal")}
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
