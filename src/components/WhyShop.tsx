import { BadgeCheck, CreditCard, Headset, RotateCcw, Truck, Wrench } from "lucide-react";

const REASONS = [
  {
    icon: BadgeCheck,
    title: "100% authentic",
    detail: "Every device is genuine and covered by its official warranty.",
  },
  {
    icon: Truck,
    title: "Fast delivery",
    detail: "Orders are packed and dispatched the same working day.",
  },
  {
    icon: CreditCard,
    title: "Secure payment",
    detail: "Checkout is handled by Shopify's encrypted payment gateway.",
  },
  {
    icon: RotateCcw,
    title: "Easy returns",
    detail: "Changed your mind? Return it within the return window.",
  },
  {
    icon: Wrench,
    title: "Expert setup help",
    detail: "We help you transfer data and set up your new device.",
  },
  {
    icon: Headset,
    title: "Real support",
    detail: "Talk to people who actually know the products.",
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
