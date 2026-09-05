import { Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, CreditCard, Grid2x2, PackageCheck, SlidersHorizontal } from "lucide-react";

import { availableEntries, BRANDS, CATEGORIES, type CatalogEntry } from "@/lib/catalog";

export function CategorySidebar({ handles }: { handles: Set<string> }) {
  const categories = availableEntries(CATEGORIES, handles);

  return (
    <aside className="rounded-xl border bg-card p-4 shadow-card">
      <h2 className="px-2 text-sm font-semibold">Shop by category</h2>
      {categories.length === 0 ? (
        <p className="mt-3 px-2 text-xs text-muted-foreground">
          Category collections will appear here once they exist in Shopify.
        </p>
      ) : (
        <ul className="mt-3 space-y-0.5">
          {categories.map((category) => (
            <li key={category.handle}>
              <Link
                to="/collections/$handle"
                params={{ handle: category.handle }}
                className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-surface hover:text-primary"
              >
                {category.icon && <category.icon className="h-4 w-4 shrink-0 text-primary" />}
                <span className="truncate">{category.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/collections"
        className="mt-3 flex items-center justify-center gap-1 rounded-md bg-surface px-3 py-2 text-xs font-medium hover:text-primary"
      >
        <Grid2x2 className="h-3.5 w-3.5" />
        View all categories
      </Link>
    </aside>
  );
}

export function CategoryChips({ handles }: { handles: Set<string> }) {
  const categories = availableEntries(CATEGORIES, handles);
  if (categories.length === 0) return null;
  return (
    <div className="scroll-rail flex gap-2 lg:hidden">
      {categories.map((category) => (
        <Link
          key={category.handle}
          to="/collections/$handle"
          params={{ handle: category.handle }}
          className="flex shrink-0 items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs font-medium"
        >
          {category.icon && <category.icon className="h-3.5 w-3.5 text-primary" />}
          {category.label}
        </Link>
      ))}
    </div>
  );
}

export function BrandRail({ handles }: { handles: Set<string> }) {
  const brands: CatalogEntry[] = availableEntries(BRANDS, handles);
  if (brands.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Top brands</h2>
        <Link
          to="/collections"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          View all brands <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="scroll-rail flex gap-3 lg:grid lg:grid-cols-8">
        {brands.map((brand) => (
          <Link
            key={brand.handle}
            to="/collections/$handle"
            params={{ handle: brand.handle }}
            className="grid h-24 w-32 shrink-0 place-items-center rounded-lg border bg-card text-sm font-semibold tracking-tight shadow-card transition-shadow hover:shadow-card-hover lg:w-auto"
          >
            {brand.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

const BENEFITS = [
  { icon: PackageCheck, title: "Live availability", detail: "Stock synced with Shopify" },
  { icon: CreditCard, title: "Secure checkout", detail: "Checkout powered by Shopify" },
  { icon: SlidersHorizontal, title: "Product options", detail: "Choose available variants" },
  { icon: Boxes, title: "Live catalogue", detail: "Products update automatically" },
];

export function BenefitsBar() {
  return (
    <section className="mx-auto max-w-7xl px-4">
      <div className="grid gap-4 rounded-2xl border bg-card p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
        {BENEFITS.map((benefit) => (
          <div key={benefit.title} className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
              <benefit.icon className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{benefit.title}</p>
              <p className="truncate text-xs text-muted-foreground">{benefit.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const PROMOS = [
  {
    handle: "earbuds",
    title: "Earbuds",
    copy: "Adaptive audio. Now playing.",
  },
  {
    handle: "smartwatches",
    title: "Smartwatches",
    copy: "Track. Call. Pay. All on your wrist.",
  },
  {
    handle: "accessories",
    title: "Accessories",
    copy: "Power, protect, connect.",
  },
];

export function PromoCards({
  handles,
  images,
}: {
  handles: Set<string>;
  images: Record<string, string | undefined>;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-4 md:grid-cols-3">
        {PROMOS.map((promo) => {
          const exists = handles.has(promo.handle);
          const image = images[promo.handle];
          const content = (
            <>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold tracking-tight">{promo.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{promo.copy}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {exists ? "Shop now" : "Coming soon"}
                  {exists && <ArrowRight className="h-3.5 w-3.5" />}
                </span>
              </div>
              {image && (
                <img
                  src={image}
                  alt=""
                  loading="lazy"
                  width={160}
                  height={160}
                  className="h-28 w-28 shrink-0 object-contain"
                />
              )}
            </>
          );

          return exists ? (
            <Link
              key={promo.handle}
              to="/collections/$handle"
              params={{ handle: promo.handle }}
              className="flex items-center justify-between gap-4 rounded-xl bg-promo p-6 transition-shadow hover:shadow-card-hover"
            >
              {content}
            </Link>
          ) : (
            <div
              key={promo.handle}
              className="flex items-center justify-between gap-4 rounded-xl bg-promo p-6"
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const SERVICES = [
  { icon: Grid2x2, title: "Compare phones", detail: "Compare specs side by side", cta: "Compare" },
  { icon: Cable, title: "Trade-in", detail: "Get credit for your old phone", cta: "Check value" },
  { icon: ShieldCheck, title: "Student discount", detail: "Up to 10% off with verification", cta: "Verify now" },
  { icon: Truck, title: "Business solutions", detail: "Devices for your team", cta: "Learn more" },
];

export function ServicesStrip() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((service) => (
          <div
            key={service.title}
            className="flex min-w-0 items-start gap-3 rounded-lg border bg-card p-4 shadow-card"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface text-primary">
              <service.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{service.title}</p>
              <p className="text-xs text-muted-foreground">{service.detail}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                {service.cta} <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
