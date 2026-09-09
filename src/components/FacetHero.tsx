import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { cdnImage, cdnSrcSet } from "@/lib/image";
import { useLanguage } from "@/lib/i18n";
import type { ShopifyCollection } from "@/lib/shopify";

/** Copy never overlays artwork, so merchant images and long Arabic titles remain legible. */
export function FacetHero({
  id,
  title,
  description,
  image,
  href,
  flip = false,
  brand,
  eager = false,
  headingLevel = 2,
  showAction = true,
}: {
  id: string;
  title: string;
  description?: string | undefined;
  image: ShopifyCollection["image"];
  href: string;
  flip?: boolean;
  brand?: { slug: string; label: string; image?: string } | undefined;
  eager?: boolean;
  headingLevel?: 1 | 2;
  showAction?: boolean;
}) {
  const { t } = useLanguage();
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="facet-hero" data-flip={flip}>
      <div className="facet-hero-image">
        {image ? (
          <img
            src={cdnImage(image.url, 1100)}
            srcSet={cdnSrcSet(image.url, 1100)}
            sizes="(min-width: 1280px) 600px, (min-width: 768px) 48vw, 90vw"
            alt={image.altText || title}
            width={1100}
            height={720}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
          />
        ) : (
          <span className="py-12 text-sm text-muted-foreground">{t("galleryEmpty")}</span>
        )}
      </div>
      <div className="facet-hero-copy">
        {brand && (
          <BrandLogo
            slug={brand.slug}
            label={brand.label}
            wordmark
            size={32}
            {...(brand.image ? { imageUrl: brand.image } : {})}
            className="mb-4 rounded-lg p-1"
          />
        )}
        <Heading
          id={id}
          className="break-words text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
        >
          {title}
        </Heading>
        {description && (
          <p className="mt-3 max-w-lg break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
        {showAction && (
          <Link
            to={href as "/shop"}
            className="mt-5 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span className="min-w-0 break-words">
              {t("viewAll")}
              {brand ? ` ${brand.label}` : ""}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
