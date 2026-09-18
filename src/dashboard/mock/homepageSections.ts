export type SectionType =
  | "hero" | "text" | "image-text" | "banner" | "product-carousel" | "featured-products"
  | "collection" | "collection-grid" | "brands" | "categories" | "promo" | "trust"
  | "announcement" | "faq" | "newsletter" | "video" | "countdown" | "custom";

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
  hero: "Hero", text: "Text Section", "image-text": "Image + Text", banner: "Banner",
  "product-carousel": "Product Carousel", "featured-products": "Featured Products", collection: "Collection",
  "collection-grid": "Collection Grid", brands: "Brands", categories: "Categories", promo: "Promo Section",
  trust: "Trust / Benefits", announcement: "Announcement", faq: "FAQ", newsletter: "Newsletter",
  video: "Video", countdown: "Countdown", custom: "Custom Content",
};

export const sectionTypeDescriptions: Record<SectionType, string> = {
  hero: "High-impact first impression with a campaign CTA.", text: "Flexible text and rich content block.", "image-text": "Balanced visual story with text and media.", banner: "Wide storefront banner with overlay.",
  "product-carousel": "Scrollable products sourced from catalog rules.", "featured-products": "Curated products for a featured rail.", collection: "Products from one selected collection.", "collection-grid": "Collection cards in a responsive grid.", brands: "Brand logos or cards with ordering.", categories: "Category cards with icon or image.", promo: "Promotional campaign block with CTA.", trust: "Benefits and reassurance items.", announcement: "Compact announcement bar.", faq: "Expandable customer questions.", newsletter: "Email capture section placeholder.", video: "Video campaign section without raw code.", countdown: "Time-bound campaign countdown.", custom: "Safe custom content built from fields.",
};

const base = (type: SectionType, id: string, order: number): HomepageSection => ({
  id, type, name: sectionTypeLabels[type], title: sectionTypeLabels[type], subtitle: "", description: "", eyebrow: "",
  buttonText: "", buttonLink: "", secondaryButtonText: "", secondaryButtonLink: "", status: "draft", enabled: true,
  showOnStorefront: true, showOnDesktop: true, showOnTablet: true, showOnMobile: true, order, background: "surface",
  textColor: "dark", alignment: "left", spacing: "comfortable", sectionId: id, startDate: "", endDate: "", settings: {},
});

export const createSection = (type: SectionType, order: number): HomepageSection => {
  const item = base(type, `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`, order);
  const presets: Partial<Record<SectionType, Partial<HomepageSection>>> = {
    hero: { name: "Homepage Hero", title: "Premium tech, thoughtfully chosen", subtitle: "Space Call / New season", description: "Discover the devices that make every day feel more connected.", buttonText: "Shop new arrivals", buttonLink: "/collections/new-arrivals", alignment: "left", background: "navy", settings: { media: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80", mobileMedia: "", overlay: 42 } },
    text: { name: "Text Promotion", title: "Upgrade your everyday", subtitle: "Latest smartphones and accessories", description: "Discover premium technology from the world's leading brands.", buttonText: "Shop now", buttonLink: "/collections/smartphones", alignment: "center" },
    "image-text": { name: "iPhone Story", title: "Meet the new iPhone", description: "Powerful performance, premium design, and a camera made for your everyday.", buttonText: "Explore iPhone", buttonLink: "/collections/iphone", settings: { media: "https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=900&q=80", mobileMedia: "", imagePosition: "right" } },
    brands: { name: "Shop by Brand", title: "Brands you can trust", subtitle: "Curated partners, authentic products", settings: { brands: ["Apple", "Samsung", "Xiaomi", "Anker", "Spigen"], layout: "grid", logoSize: "medium" } },
    categories: { name: "Shop by Category", title: "Find your next favorite", settings: { categories: ["Smartphones", "Headphones", "Smartwatches", "Chargers"], columns: 4, mobileScroll: true } },
    "featured-products": { name: "Best Sellers", title: "Best sellers", subtitle: "The products customers keep coming back for", settings: { source: "collection", sourceValue: "Best Sellers", count: 5 } },
    collection: { name: "iPhone Collection", title: "Explore iPhone", settings: { collection: "iPhone", count: 8, layout: "carousel" } },
    promo: { name: "Summer Sale", title: "Summer essentials", subtitle: "Up to 25% off", buttonText: "Shop the offer", buttonLink: "/collections/sale", background: "purple", textColor: "light", settings: { media: "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?auto=format&fit=crop&w=1200&q=80", mobileMedia: "", overlay: 48 } },
    trust: { name: "Trust Benefits", title: "Better shopping, built in", settings: { items: [{ icon: "Zap", title: "Fast delivery", description: "Reliable shipping, tracked every step." }, { icon: "ShieldCheck", title: "Original products", description: "Authentic devices from trusted brands." }, { icon: "CreditCard", title: "Secure payment", description: "Safe checkout for every order." }, { icon: "BadgeCheck", title: "Warranty", description: "Support that stays with your purchase." }] } },
    faq: { name: "Frequently Asked Questions", title: "Questions, answered", settings: { items: [{ question: "Do you offer international delivery?", answer: "Yes, delivery options are shown at checkout." }, { question: "Are products covered by warranty?", answer: "Eligible products include a manufacturer warranty." }] } },
    newsletter: { name: "Newsletter", title: "Stay in the loop", subtitle: "New devices, smart offers, and useful guides.", buttonText: "Subscribe", buttonLink: "#newsletter", alignment: "center" },
  };
  return { ...item, ...presets[type] };
};

export function isSectionWithinSchedule(section: HomepageSection, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return (!section.startDate || day >= section.startDate) && (!section.endDate || day <= section.endDate);
}

export const initialHomepageSections: HomepageSection[] = [
  createSection("hero", 1), createSection("categories", 2), createSection("text", 3), createSection("brands", 4), createSection("collection", 5), createSection("promo", 6), createSection("trust", 7), createSection("faq", 8), createSection("newsletter", 9),
];
