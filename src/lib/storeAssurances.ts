import { BadgeCheck, RotateCcw, ShieldCheck, Truck, type LucideIcon } from "lucide-react";

export interface Assurance {
  icon: LucideIcon;
  title: string;
  detail: string;
}

/**
 * Store-level purchase assurances shown under the buy box.
 *
 * These are store policies, not product data — edit this single list to change
 * the strip everywhere. Keep the wording truthful for the real store: remove an
 * entry rather than promising something the store does not offer.
 */
export const PURCHASE_ASSURANCES: Assurance[] = [
  {
    icon: BadgeCheck,
    title: "Authentic products",
    detail: "Sourced from official channels",
  },
  {
    icon: Truck,
    title: "Fast delivery",
    detail: "Shipping calculated at checkout",
  },
  {
    icon: RotateCcw,
    title: "Easy returns",
    detail: "Per our published returns policy",
  },
  {
    icon: ShieldCheck,
    title: "Secure payment",
    detail: "Protected checkout by Space Call",
  },
];
