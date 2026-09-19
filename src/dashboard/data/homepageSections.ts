export type SectionType =
  | "hero"
  | "text"
  | "image-text"
  | "banner"
  | "product-carousel"
  | "featured-products"
  | "collection"
  | "collection-grid"
  | "brands"
  | "categories"
  | "promo"
  | "trust"
  | "announcement"
  | "faq"
  | "newsletter"
  | "video"
  | "countdown"
  | "custom";

export type SectionStatus = "draft" | "published";
export type DisplayMode = "desktop" | "tablet" | "mobile";

export type HomepageSection = {
  id: string;
  type: SectionType;
  name: string;
  title: string;
  subtitle: string;
  description: string;
  eyebrow: string;
  buttonText: string;
  buttonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  status: SectionStatus;
  enabled: boolean;
  showOnStorefront: boolean;
  showOnDesktop: boolean;
  showOnTablet: boolean;
  showOnMobile: boolean;
  order: number;
  background: string;
  textColor: string;
  alignment: "left" | "center" | "right";
  spacing: "compact" | "comfortable" | "spacious";
  sectionId: string;
  startDate: string;
  endDate: string;
  settings: Record<string, unknown>;
};

export const sectionTypeLabels: Record<SectionType, string> = {
  hero: "Hero",
  text: "Text Section",
  "image-text": "Image + Text",
  banner: "Banner",
  "product-carousel": "Product Carousel",
  "featured-products": "Featured Products",
  collection: "Collection",
  "collection-grid": "Collection Grid",
  brands: "Brands",
  categories: "Categories",
  promo: "Promo Section",
  trust: "Trust / Benefits",
  announcement: "Announcement",
  faq: "FAQ",
  newsletter: "Newsletter",
  video: "Video",
  countdown: "Countdown",
  custom: "Custom Content",
};

export const sectionTypeDescriptions: Record<SectionType, string> = {
  hero: "High-impact first impression with a campaign CTA.",
  text: "Flexible text and rich content block.",
  "image-text": "Balanced visual story with text and media.",
  banner: "Wide storefront banner with overlay.",
  "product-carousel": "Scrollable products sourced from catalog rules.",
  "featured-products": "Curated products for a featured rail.",
  collection: "Products from one selected collection.",
  "collection-grid": "Collection cards in a responsive grid.",
  brands: "Brand logos or cards with ordering.",
  categories: "Category cards with icon or image.",
  promo: "Promotional campaign block with CTA.",
  trust: "Benefits and reassurance items.",
  announcement: "Compact announcement bar.",
  faq: "Expandable customer questions.",
  newsletter: "Email capture section placeholder.",
  video: "Video campaign section without raw code.",
  countdown: "Time-bound campaign countdown.",
  custom: "Safe custom content built from fields.",
};

const base = (type: SectionType, id: string, order: number): HomepageSection => ({
  id,
  type,
  name: sectionTypeLabels[type],
  title: sectionTypeLabels[type],
  subtitle: "",
  description: "",
  eyebrow: "",
  buttonText: "",
  buttonLink: "",
  secondaryButtonText: "",
  secondaryButtonLink: "",
  status: "draft",
  enabled: true,
  showOnStorefront: true,
  showOnDesktop: true,
  showOnTablet: true,
  showOnMobile: true,
  order,
  background: "surface",
  textColor: "dark",
  alignment: "left",
  spacing: "comfortable",
  sectionId: id,
  startDate: "",
  endDate: "",
  settings: {},
});

export const createSection = (type: SectionType, order: number): HomepageSection => {
  return base(type, `${type}-${crypto.randomUUID()}`, order);
};

export function isSectionWithinSchedule(section: HomepageSection, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return (
    (!section.startDate || day >= section.startDate) && (!section.endDate || day <= section.endDate)
  );
}
