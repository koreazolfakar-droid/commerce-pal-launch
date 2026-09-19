export type Status = "Delivered" | "Processing" | "Shipped" | "Cancelled" | "Pending";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  compareAt?: number;
  stock: number;
  status: "Active" | "Draft" | "Archived";
  sku: string;
  image: string;
  sold: number;
  description: string;
};

export type Order = {
  id: string;
  customer: string;
  initials: string;
  items: string;
  total: number;
  status: Status;
  date: string;
  payment: "Paid" | "Pending" | "Refunded";
  address: string;
};

export const products: Product[] = [
  { id: "prd-001", name: "iPhone 15 Pro", brand: "Apple", category: "Smartphones", price: 1199, compareAt: 1299, stock: 42, status: "Active", sku: "APL-IP15P-256", image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=160&q=80", sold: 328, description: "Titanium design, A17 Pro chip, and a pro camera system." },
  { id: "prd-002", name: "Galaxy S24 Ultra", brand: "Samsung", category: "Smartphones", price: 899, compareAt: 999, stock: 26, status: "Active", sku: "SMS-S24U-256", image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=160&q=80", sold: 274, description: "Galaxy AI, a 200MP camera, and an immersive display." },
  { id: "prd-003", name: "AirPods Pro (2nd Gen)", brand: "Apple", category: "Headphones", price: 249, stock: 18, status: "Active", sku: "APL-APP2-USB", image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=160&q=80", sold: 261, description: "Active noise cancellation with adaptive transparency." },
  { id: "prd-004", name: "Apple Watch Series 10", brand: "Apple", category: "Smartwatches", price: 399, stock: 14, status: "Active", sku: "APL-AW10-46", image: "https://images.unsplash.com/photo-1551816230-ef5deaed4a26?auto=format&fit=crop&w=160&q=80", sold: 198, description: "Thinner design with advanced health and fitness insights." },
  { id: "prd-005", name: "Anker 65W Charger", brand: "Anker", category: "Chargers", price: 45, stock: 7, status: "Active", sku: "ANK-65W-GAN", image: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=160&q=80", sold: 187, description: "Compact GaN charger with three high-speed ports." },
  { id: "prd-006", name: "Xiaomi 14T", brand: "Xiaomi", category: "Smartphones", price: 699, stock: 31, status: "Active", sku: "XMI-14T-512", image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=160&q=80", sold: 154, description: "Leica imaging and flagship performance for everyday creators." },
  { id: "prd-007", name: "Galaxy Buds3 Pro", brand: "Samsung", category: "Headphones", price: 229, stock: 3, status: "Draft", sku: "SMS-BUDS3-P", image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=160&q=80", sold: 142, description: "Studio-quality sound in a compact wireless design." },
  { id: "prd-008", name: "Spigen iPhone Case", brand: "Spigen", category: "Accessories", price: 29, stock: 54, status: "Active", sku: "SPG-IP15-CLR", image: "https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=160&q=80", sold: 122, description: "Slim protective case with MagSafe compatibility." },
];

export const orders: Order[] = [
  { id: "SC7842", customer: "Alex Johnson", initials: "AJ", items: "iPhone 15 Pro (256GB)", total: 1199, status: "Delivered", date: "Jan 31, 2026", payment: "Paid", address: "42 Market Street, Austin, TX" },
  { id: "SC7841", customer: "Sara Khan", initials: "SK", items: "Samsung Galaxy S24", total: 899, status: "Processing", date: "Jan 31, 2026", payment: "Paid", address: "18 Palm Avenue, Dubai, UAE" },
  { id: "SC7840", customer: "Mike Chen", initials: "MC", items: "AirPods Pro (2nd Gen)", total: 249, status: "Shipped", date: "Jan 30, 2026", payment: "Paid", address: "90 Mission Street, San Francisco, CA" },
  { id: "SC7839", customer: "Emma Wilson", initials: "EW", items: "Apple Watch Series 10", total: 399, status: "Delivered", date: "Jan 30, 2026", payment: "Paid", address: "7 Kings Road, London, UK" },
  { id: "SC7838", customer: "Daniel Kim", initials: "DK", items: "Xiaomi 14T", total: 699, status: "Processing", date: "Jan 29, 2026", payment: "Paid", address: "12 Yeongdong-daero, Seoul, KR" },
  { id: "SC7837", customer: "Olivia Brown", initials: "OB", items: "Anker 65W Charger", total: 45, status: "Delivered", date: "Jan 29, 2026", payment: "Paid", address: "11 Orchard Street, Boston, MA" },
  { id: "SC7836", customer: "Noah Davis", initials: "ND", items: "Galaxy Buds3 Pro", total: 229, status: "Shipped", date: "Jan 28, 2026", payment: "Paid", address: "5 Queen Street, Toronto, CA" },
  { id: "SC7835", customer: "Mia Garcia", initials: "MG", items: "Spigen iPhone Case", total: 29, status: "Delivered", date: "Jan 28, 2026", payment: "Paid", address: "230 Sunset Blvd, Miami, FL" },
  { id: "SC7834", customer: "Liam Taylor", initials: "LT", items: "iPhone 15 Pro + Case", total: 1228, status: "Pending", date: "Jan 27, 2026", payment: "Pending", address: "14 King Street, Sydney, AU" },
];

export const customers = [
  { name: "Alex Johnson", email: "alex.johnson@email.com", phone: "+1 512 555 0142", orders: 12, spent: 4820, lastOrder: "Jan 31, 2026", status: "VIP", initials: "AJ" },
  { name: "Sara Khan", email: "sara.khan@email.com", phone: "+971 50 555 0189", orders: 8, spent: 2910, lastOrder: "Jan 31, 2026", status: "Active", initials: "SK" },
  { name: "Mike Chen", email: "mike.chen@email.com", phone: "+1 415 555 0128", orders: 6, spent: 1640, lastOrder: "Jan 30, 2026", status: "Active", initials: "MC" },
  { name: "Emma Wilson", email: "emma.wilson@email.com", phone: "+44 20 5555 0194", orders: 18, spent: 6250, lastOrder: "Jan 30, 2026", status: "VIP", initials: "EW" },
  { name: "Daniel Kim", email: "daniel.kim@email.com", phone: "+82 2 555 0134", orders: 3, spent: 899, lastOrder: "Jan 29, 2026", status: "New", initials: "DK" },
];

export const revenueData = [
  { name: "Jan 1", revenue: 4200, orders: 42 }, { name: "Jan 3", revenue: 8200, orders: 58 }, { name: "Jan 5", revenue: 6100, orders: 50 }, { name: "Jan 7", revenue: 13600, orders: 82 }, { name: "Jan 9", revenue: 10400, orders: 74 }, { name: "Jan 11", revenue: 15200, orders: 94 }, { name: "Jan 13", revenue: 12500, orders: 88 }, { name: "Jan 15", revenue: 16400, orders: 105 }, { name: "Jan 17", revenue: 21200, orders: 124 }, { name: "Jan 19", revenue: 28430, orders: 146 }, { name: "Jan 21", revenue: 27600, orders: 138 }, { name: "Jan 23", revenue: 16400, orders: 99 }, { name: "Jan 25", revenue: 19200, orders: 114 }, { name: "Jan 27", revenue: 30100, orders: 168 }, { name: "Jan 29", revenue: 24800, orders: 152 }, { name: "Jan 31", revenue: 32800, orders: 182 },
];

export const topBrands = [
  { name: "Apple", value: 32.4, color: "#111827" }, { name: "Samsung", value: 24.1, color: "#4b71c5" }, { name: "Xiaomi", value: 12.6, color: "#f59e0b" }, { name: "Anker", value: 8.9, color: "#e56b48" }, { name: "Spigen", value: 6.8, color: "#5a55d6" },
];

export const navSections = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" }] },
  { label: "Commerce", items: [{ label: "Orders", href: "/dashboard/orders", icon: "ShoppingBag", badge: "24" }, { label: "Products", href: "/dashboard/products", icon: "Package" }, { label: "Collections", href: "/dashboard/collections", icon: "Layers3" }, { label: "Categories", href: "/dashboard/categories", icon: "Tags" }, { label: "Inventory", href: "/dashboard/inventory", icon: "Boxes" }, { label: "Purchase Orders", href: "/dashboard/purchase-orders", icon: "ClipboardList" }, { label: "Receiving", href: "/dashboard/receiving", icon: "ClipboardList" }, { label: "Customers", href: "/dashboard/customers", icon: "Users" }] },
  { label: "Store content", items: [{ label: "Homepage", href: "/dashboard/homepage", icon: "PanelsTopLeft" }, { label: "Hero banners", href: "/dashboard/homepage/hero", icon: "Image" }, { label: "Brands", href: "/dashboard/brands", icon: "Badge" }, { label: "Navigation", href: "/dashboard/navigation", icon: "Menu" }, { label: "Promotions", href: "/dashboard/promotions", icon: "BadgePercent" }] },
  { label: "Marketing", items: [{ label: "Campaigns", href: "/dashboard/marketing", icon: "Megaphone" }, { label: "Coupons", href: "/dashboard/coupons", icon: "TicketPercent" }, { label: "SEO", href: "/dashboard/seo", icon: "SearchCheck" }] },
  { label: "Management", items: [{ label: "Analytics", href: "/dashboard/analytics", icon: "ChartNoAxesCombined" }, { label: "Messages", href: "/dashboard/messages", icon: "Mail", badge: "3" }, { label: "Reviews", href: "/dashboard/reviews", icon: "Star" }, { label: "Media library", href: "/dashboard/media", icon: "FolderOpen" }] },
  { label: "System", items: [{ label: "Users", href: "/dashboard/users", icon: "UserCog" }, { label: "Activity logs", href: "/dashboard/activity", icon: "ScrollText" }, { label: "Security", href: "/dashboard/security", icon: "LockKeyhole" }, { label: "Settings", href: "/dashboard/settings", icon: "Settings2" }] },
];

export const pageMeta: Record<string, { eyebrow: string; title: string; description: string }> = {
  "/dashboard/orders": { eyebrow: "Commerce / Orders", title: "Orders", description: "Track, filter, and manage every customer order." },
  "/dashboard/products": { eyebrow: "Commerce / Catalog", title: "Products", description: "Keep your product catalog clean, current, and ready to sell." },
  "/dashboard/customers": { eyebrow: "Commerce / Relationships", title: "Customers", description: "Understand your customer base and build stronger relationships." },
  "/dashboard/inventory": { eyebrow: "Commerce / Operations", title: "Inventory", description: "Stay ahead of stock levels across products and variants." },
  "/dashboard/purchase-orders": { eyebrow: "Commerce / Procurement", title: "Purchase Orders", description: "Create, submit and track supplier purchase orders before receiving." },
  "/dashboard/receiving": { eyebrow: "Commerce / Operations", title: "Receiving", description: "Receive issued purchase orders, review invoices and approve stock intake." },
  "/dashboard/collections": { eyebrow: "Commerce / Catalog", title: "Collections", description: "Curate product groups for your storefront experience." },
  "/dashboard/categories": { eyebrow: "Commerce / Catalog", title: "Categories", description: "Organize your catalog with a clear browsing structure." },
  "/dashboard/brands": { eyebrow: "Store content", title: "Brands", description: "Manage the brands that make Space Call distinctive." },
  "/dashboard/homepage": { eyebrow: "Store content / CMS", title: "Homepage manager", description: "Shape the storefront with flexible, mock content controls." },
  "/dashboard/homepage/hero": { eyebrow: "Store content / CMS", title: "Hero banners", description: "Plan the first impression with campaign-ready hero content." },
  "/dashboard/navigation": { eyebrow: "Store content / CMS", title: "Navigation", description: "Design desktop, mobile, and footer menus in one place." },
  "/dashboard/promotions": { eyebrow: "Store content / Marketing", title: "Promotions", description: "Plan offers and promotional moments for your customers." },
  "/dashboard/analytics": { eyebrow: "Management / Insights", title: "Analytics", description: "Explore a clear view of store performance and trends." },
  "/dashboard/messages": { eyebrow: "Management / Inbox", title: "Messages", description: "Keep customer conversations and internal requests moving." },
  "/dashboard/media": { eyebrow: "Management / Assets", title: "Media library", description: "Browse the visual assets that power your store." },
  "/dashboard/seo": { eyebrow: "Marketing / Discoverability", title: "SEO", description: "Prepare search and social metadata before integration." },
  "/dashboard/users": { eyebrow: "System / Access", title: "Users", description: "Manage admin team members and access roles." },
  "/dashboard/activity": { eyebrow: "System / Audit", title: "Activity logs", description: "Review the latest changes across the admin workspace." },
  "/dashboard/security": { eyebrow: "System / Security", title: "Security Center", description: "Review MFA, session controls, bot protection and security activity." },
  "/dashboard/settings": { eyebrow: "System / Workspace", title: "Settings", description: "Configure the mock store workspace and future integrations." },
};
