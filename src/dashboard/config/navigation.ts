export const navSections = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" }],
  },
  {
    label: "Commerce",
    items: [
      { label: "Orders", href: "/dashboard/orders", icon: "ShoppingBag" },
      { label: "Sales", href: "/dashboard/sales", icon: "ChartNoAxesCombined" },
      { label: "Products", href: "/dashboard/products", icon: "Package" },
      { label: "Collections", href: "/dashboard/collections", icon: "Layers3" },
      { label: "Categories", href: "/dashboard/categories", icon: "Tags" },
      { label: "Inventory", href: "/dashboard/inventory", icon: "Boxes" },
      {
        label: "Procurement",
        href: "/dashboard/procurement",
        icon: "ChartNoAxesCombined",
      },
      {
        label: "Purchase Orders",
        href: "/dashboard/purchase-orders",
        icon: "ClipboardList",
      },
      {
        label: "Receiving",
        href: "/dashboard/receiving",
        icon: "ClipboardList",
      },
      { label: "Suppliers", href: "/dashboard/suppliers", icon: "UserCog" },
      { label: "Customers", href: "/dashboard/customers", icon: "Users" },
    ],
  },
  {
    label: "Store content",
    items: [
      { label: "Homepage", href: "/dashboard/homepage", icon: "PanelsTopLeft" },
      {
        label: "Hero banners",
        href: "/dashboard/homepage/hero",
        icon: "Image",
      },
      { label: "Brands", href: "/dashboard/brands", icon: "Badge" },
      { label: "Navigation", href: "/dashboard/navigation", icon: "Menu" },
      {
        label: "Promotions",
        href: "/dashboard/promotions",
        icon: "BadgePercent",
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Campaigns", href: "/dashboard/marketing", icon: "Megaphone" },
      { label: "Coupons", href: "/dashboard/coupons", icon: "TicketPercent" },
      { label: "SEO", href: "/dashboard/seo", icon: "SearchCheck" },
    ],
  },
  {
    label: "Management",
    items: [
      {
        label: "Analytics",
        href: "/dashboard/analytics",
        icon: "ChartNoAxesCombined",
      },
      { label: "Messages", href: "/dashboard/messages", icon: "Mail" },
      { label: "Reviews", href: "/dashboard/reviews", icon: "Star" },
      { label: "Media library", href: "/dashboard/media", icon: "FolderOpen" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Users", href: "/dashboard/users", icon: "UserCog" },
      {
        label: "Activity logs",
        href: "/dashboard/activity",
        icon: "ScrollText",
      },
      { label: "Security", href: "/dashboard/security", icon: "LockKeyhole" },
      { label: "Settings", href: "/dashboard/settings", icon: "Settings2" },
    ],
  },
];

export const pageMeta: Record<string, { eyebrow: string; title: string; description: string }> = {
  "/dashboard/orders": {
    eyebrow: "Commerce / Orders",
    title: "Orders",
    description: "Track, filter, and manage every customer order.",
  },
  "/dashboard/sales": {
    eyebrow: "Commerce / Sales",
    title: "Sales",
    description: "Review completed order snapshots recorded when orders reach DONE.",
  },
  "/dashboard/products": {
    eyebrow: "Commerce / Catalog",
    title: "Products",
    description: "Keep your product catalog clean, current, and ready to sell.",
  },
  "/dashboard/customers": {
    eyebrow: "Commerce / Relationships",
    title: "Customers",
    description: "Understand your customer base and build stronger relationships.",
  },
  "/dashboard/inventory": {
    eyebrow: "Commerce / Operations",
    title: "Inventory",
    description: "Stay ahead of stock levels across products and variants.",
  },
  "/dashboard/procurement": {
    eyebrow: "Commerce / Procurement",
    title: "Procurement Analytics",
    description: "Track purchasing spend, supplier performance and reorder needs.",
  },
  "/dashboard/suppliers": {
    eyebrow: "Commerce / Procurement",
    title: "Suppliers & Locations",
    description: "Manage supplier contacts and purchasing destinations.",
  },
  "/dashboard/purchase-orders": {
    eyebrow: "Commerce / Procurement",
    title: "Purchase Orders",
    description: "Create, submit and track supplier purchase orders before receiving.",
  },
  "/dashboard/receiving": {
    eyebrow: "Commerce / Operations",
    title: "Receiving",
    description: "Receive issued purchase orders, review invoices and approve stock intake.",
  },
  "/dashboard/collections": {
    eyebrow: "Commerce / Catalog",
    title: "Collections",
    description: "Curate product groups for your storefront experience.",
  },
  "/dashboard/categories": {
    eyebrow: "Commerce / Catalog",
    title: "Categories",
    description: "Organize your catalog with a clear browsing structure.",
  },
  "/dashboard/brands": {
    eyebrow: "Store content",
    title: "Brands",
    description: "Manage the brands that make Space Call distinctive.",
  },
  "/dashboard/homepage": {
    eyebrow: "Store content / CMS",
    title: "Homepage manager",
    description: "Shape the storefront with saved content controls.",
  },
  "/dashboard/homepage/hero": {
    eyebrow: "Store content / CMS",
    title: "Hero banners",
    description: "Plan the first impression with campaign-ready hero content.",
  },
  "/dashboard/navigation": {
    eyebrow: "Store content / CMS",
    title: "Navigation",
    description: "Design desktop, mobile, and footer menus in one place.",
  },
  "/dashboard/promotions": {
    eyebrow: "Store content / Marketing",
    title: "Promotions",
    description: "Plan offers and promotional moments for your customers.",
  },
  "/dashboard/analytics": {
    eyebrow: "Management / Insights",
    title: "Analytics",
    description: "Explore a clear view of store performance and trends.",
  },
  "/dashboard/messages": {
    eyebrow: "Management / Inbox",
    title: "Messages",
    description: "Keep customer conversations and internal requests moving.",
  },
  "/dashboard/media": {
    eyebrow: "Management / Assets",
    title: "Media library",
    description: "Browse the visual assets that power your store.",
  },
  "/dashboard/seo": {
    eyebrow: "Marketing / Discoverability",
    title: "SEO",
    description: "Prepare search and social metadata before integration.",
  },
  "/dashboard/users": {
    eyebrow: "System / Access",
    title: "Users",
    description: "Manage admin team members and access roles.",
  },
  "/dashboard/activity": {
    eyebrow: "System / Audit",
    title: "Activity logs",
    description: "Review the latest changes across the admin workspace.",
  },
  "/dashboard/security": {
    eyebrow: "System / Security",
    title: "Security Center",
    description: "Review MFA, session controls, bot protection and security activity.",
  },
  "/dashboard/settings": {
    eyebrow: "System / Workspace",
    title: "Settings",
    description: "Configure the store workspace and integrations.",
  },
};
