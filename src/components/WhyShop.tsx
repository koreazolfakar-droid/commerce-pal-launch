import { Boxes, CreditCard, PackageCheck, SearchCheck, SlidersHorizontal, Tags } from "lucide-react";

const REASONS = [
  {
    icon: Boxes,
    title: "Live catalogue",
    detail: "Products and availability are synchronized with Shopify.",
  },
  {
    icon: SlidersHorizontal,
    title: "Clear options",
    detail: "Choose from the variants currently available for each product.",
  },
  {
    icon: CreditCard,
    title: "Secure payment",
    detail: "Checkout is completed securely through Shopify.",
  },
  {
    icon: Tags,
    title: "Accurate pricing",
    detail: "Prices and genuine markdowns come directly from the store catalogue.",
  },
  {
    icon: SearchCheck,
    title: "Focused discovery",
    detail: "Search, category and brand pages keep products correctly grouped.",
  },
  {
    icon: PackageCheck,
    title: "Order clarity",
    detail: "Review products, options and totals before completing payment.",
  },
] as const;

export function WhyShop() {
  return (
    <section className="px-4 sm:px-0" aria-labelledby="why-shop">
      <h2 id="why-shop" className="text-lg font-semibold tracking-tight sm:text-xl">
        Why shop with Space Cell
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REASONS.map((reason) => (
          <div
            key={reason.title}
            className="flex min-w-0 items-start gap-3 rounded-2xl border bg-card p-4 shadow-card"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
              <reason.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{reason.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {reason.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
