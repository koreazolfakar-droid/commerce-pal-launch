import {
  createElement,
  lazy,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from "react";

export type DashboardPageMeta = {
  eyebrow: string;
  title: string;
  description: string;
};

export type DashboardNavigationItem = {
  label: string;
  href: string;
  icon: string;
};

export type DashboardNavigationSection = {
  label: string;
  items: DashboardNavigationItem[];
};

type LazyPage = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Each route render adapter supplies a different page prop shape.
  Component: LazyExoticComponent<ComponentType<any>>;
  preload: () => Promise<unknown>;
};

type RouteMatch = {
  params: Record<string, string>;
};

type DashboardRouteDefinition = {
  id: string;
  path?: string;
  aliases?: string[];
  match?: (path: string) => RouteMatch | null;
  page: LazyPage;
  render?: (page: LazyPage["Component"], match: RouteMatch, path: string) => ReactNode;
  meta?: DashboardPageMeta;
  navigation?: {
    section: string;
    label: string;
    icon: string;
    order: number;
  };
};

const SECTION_ORDER = [
  "Overview",
  "Catalog",
  "Sales",
  "Stock & purchasing",
  "Store content",
  "Marketing",
  "Management",
  "System",
] as const;

const DASHBOARD_ROUTE_CHUNK_RELOAD_KEY = "space-call:dashboard-route-chunk-reload";

function isRouteChunkLoadError(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  return /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|loading chunk|error loading dynamically imported module/i.test(
    message,
  );
}

async function recoverRouteChunk(error: unknown): Promise<never> {
  if (typeof window === "undefined" || !isRouteChunkLoadError(error)) {
    throw error;
  }

  let alreadyReloaded = false;
  try {
    alreadyReloaded = window.sessionStorage.getItem(DASHBOARD_ROUTE_CHUNK_RELOAD_KEY) === "1";
  } catch {
    throw error;
  }

  if (alreadyReloaded) throw error;

  try {
    window.sessionStorage.setItem(DASHBOARD_ROUTE_CHUNK_RELOAD_KEY, "1");
  } catch {
    throw error;
  }

  window.location.reload();
  return await new Promise<never>(() => undefined);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Props are supplied by the matching route adapter.
function lazyPage<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>): LazyPage {
  let request: Promise<{ default: T }> | null = null;

  const load = async () => {
    request ??= loader();
    try {
      const module = await request;
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.removeItem(DASHBOARD_ROUTE_CHUNK_RELOAD_KEY);
        } catch {
          // Session storage is optional after a successful chunk load.
        }
      }
      return module;
    } catch (error) {
      request = null;
      throw error;
    }
  };

  const Component = lazy(async () => {
    try {
      return await load();
    } catch (error) {
      return recoverRouteChunk(error);
    }
  });

  return {
    Component,
    preload: async () => {
      try {
        await load();
      } catch {
        // Preloading must never navigate or reload the dashboard. Rendering the
        // route retries the import and performs guarded stale-chunk recovery.
      }
    },
  };
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function exact(path: string) {
  return (candidate: string): RouteMatch | null => (candidate === path ? { params: {} } : null);
}

function pattern(regex: RegExp, names: string[]) {
  return (candidate: string): RouteMatch | null => {
    const result = candidate.match(regex);
    if (!result) return null;
    const params: Record<string, string> = {};
    names.forEach((name, index) => {
      params[name] = safeDecode(result[index + 1] ?? "");
    });
    return { params };
  };
}

export function normalizeDashboardPath(pathname: string) {
  const withoutQuery = pathname.split("?")[0]?.split("#")[0] || "/dashboard";
  if (withoutQuery === "/dashboard/") return "/dashboard";
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : withoutQuery;
}

const homePage = lazyPage(() => import("@/dashboard/pages/DashboardHomePage"));
const ordersPage = lazyPage(() => import("@/dashboard/pages/OrdersPage"));
const orderDetailPage = lazyPage(() => import("@/dashboard/pages/OrderDetailPage"));
const salesPage = lazyPage(() => import("@/dashboard/pages/SalesPage"));
const productsPage = lazyPage(() => import("@/dashboard/pages/ProductsPage"));
const productFormPage = lazyPage(() => import("@/dashboard/pages/ProductFormPage"));
const collectionsPage = lazyPage(() => import("@/dashboard/pages/CollectionsPage"));
const collectionDetailPage = lazyPage(() => import("@/dashboard/pages/CollectionDetailPage"));
const categoriesPage = lazyPage(() => import("@/dashboard/pages/CategoriesPage"));
const inventoryPage = lazyPage(() => import("@/dashboard/pages/InventoryManagerPage"));
const procurementPage = lazyPage(() => import("@/dashboard/pages/ProcurementAnalyticsPage"));
const purchaseOrdersPage = lazyPage(() => import("@/dashboard/pages/PurchaseOrdersPage"));
const purchaseOrderCreatePage = lazyPage(() => import("@/dashboard/pages/PurchaseOrderCreatePage"));
const purchaseOrderDetailPage = lazyPage(() => import("@/dashboard/pages/PurchaseOrderDetailPage"));
const purchaseOrderEditPage = lazyPage(() => import("@/dashboard/pages/PurchaseOrderEditPage"));
const receivingPage = lazyPage(() => import("@/dashboard/pages/ReceivingPage"));
const receivingDetailPage = lazyPage(() => import("@/dashboard/pages/ReceivingDetailPage"));
const suppliersPage = lazyPage(() => import("@/dashboard/pages/SuppliersPage"));
const customersPage = lazyPage(() => import("@/dashboard/pages/CustomersPage"));
const customerDetailPage = lazyPage(() => import("@/dashboard/pages/CustomerDetailPage"));
const homepagePage = lazyPage(() => import("@/dashboard/pages/HomepageBuilder"));
const heroBannersPage = lazyPage(() => import("@/dashboard/pages/HeroBannersPage"));
const brandsPage = lazyPage(() => import("@/dashboard/pages/BrandsPage"));
const navigationPage = lazyPage(() => import("@/dashboard/pages/NavigationPage"));
const seoPage = lazyPage(() => import("@/dashboard/pages/SeoPage"));
const mediaPage = lazyPage(() => import("@/dashboard/pages/MediaLibraryPage"));
const securityPage = lazyPage(() => import("@/dashboard/pages/SecurityPage"));
const settingsPage = lazyPage(() => import("@/dashboard/pages/SettingsPage"));
const workspacePage = lazyPage(() => import("@/dashboard/pages/WorkspacePage"));
const loginPage = lazyPage(() => import("@/dashboard/pages/LoginPage"));

function staticRoute(
  definition: Omit<DashboardRouteDefinition, "match"> & { path: string },
): DashboardRouteDefinition {
  return {
    ...definition,
    match: exact(definition.path),
  };
}

const routes: DashboardRouteDefinition[] = [
  staticRoute({
    id: "home",
    path: "/dashboard",
    page: homePage,
    meta: {
      eyebrow: "Overview",
      title: "Dashboard",
      description: "A live overview of store performance and operations.",
    },
    navigation: {
      section: "Overview",
      label: "Dashboard",
      icon: "LayoutDashboard",
      order: 0,
    },
  }),
  staticRoute({
    id: "analytics",
    path: "/dashboard/analytics",
    page: homePage,
    render: (Page) => createElement(Page, { analyticsView: true }),
    meta: {
      eyebrow: "Management / Insights",
      title: "Analytics",
      description: "Explore a clear view of store performance and trends.",
    },
    navigation: {
      section: "Overview",
      label: "Analytics",
      icon: "ChartNoAxesCombined",
      order: 1,
    },
  }),
  staticRoute({
    id: "orders",
    path: "/dashboard/orders",
    page: ordersPage,
    meta: {
      eyebrow: "Commerce / Orders",
      title: "Orders",
      description: "Track, filter, and manage every customer order.",
    },
    navigation: {
      section: "Sales",
      label: "Orders",
      icon: "ShoppingBag",
      order: 0,
    },
  }),
  staticRoute({
    id: "sales",
    path: "/dashboard/sales",
    page: salesPage,
    meta: {
      eyebrow: "Commerce / Sales",
      title: "Sales",
      description: "Review completed order snapshots recorded when orders reach DONE.",
    },
    navigation: {
      section: "Sales",
      label: "Sales",
      icon: "ChartNoAxesCombined",
      order: 1,
    },
  }),
  {
    id: "order-detail",
    page: orderDetailPage,
    match: pattern(/^\/dashboard\/orders\/([^/]+)$/, ["id"]),
    render: (Page, match) => createElement(Page, { id: match.params.id }),
  },
  staticRoute({
    id: "products-new",
    path: "/dashboard/products/new",
    page: productFormPage,
  }),
  staticRoute({
    id: "products",
    path: "/dashboard/products",
    page: productsPage,
    meta: {
      eyebrow: "Commerce / Catalog",
      title: "Products",
      description: "Keep your product catalog clean, current, and ready to sell.",
    },
    navigation: {
      section: "Catalog",
      label: "Products",
      icon: "Package",
      order: 2,
    },
  }),
  {
    id: "product-detail",
    page: productFormPage,
    match: pattern(/^\/dashboard\/products\/([^/]+)$/, ["id"]),
    render: (Page, match) => createElement(Page, { id: match.params.id }),
  },
  staticRoute({
    id: "collections",
    path: "/dashboard/collections",
    page: collectionsPage,
    meta: {
      eyebrow: "Commerce / Catalog",
      title: "Collections",
      description: "Curate product groups for your storefront experience.",
    },
    navigation: {
      section: "Catalog",
      label: "Collections",
      icon: "Layers3",
      order: 3,
    },
  }),
  {
    id: "collection-detail",
    page: collectionDetailPage,
    match: pattern(/^\/dashboard\/collections\/([^/]+)$/, ["id"]),
    render: (Page, match) => createElement(Page, { id: match.params.id }),
  },
  staticRoute({
    id: "categories",
    path: "/dashboard/categories",
    page: categoriesPage,
    meta: {
      eyebrow: "Commerce / Catalog",
      title: "Categories",
      description: "Organize your catalog with a clear browsing structure.",
    },
    navigation: {
      section: "Catalog",
      label: "Categories",
      icon: "Tags",
      order: 4,
    },
  }),
  staticRoute({
    id: "inventory",
    path: "/dashboard/inventory",
    page: inventoryPage,
    meta: {
      eyebrow: "Commerce / Operations",
      title: "Inventory",
      description: "Stay ahead of stock levels across products and variants.",
    },
    navigation: {
      section: "Stock & purchasing",
      label: "Inventory",
      icon: "Boxes",
      order: 5,
    },
  }),
  staticRoute({
    id: "procurement",
    path: "/dashboard/procurement",
    page: procurementPage,
    meta: {
      eyebrow: "Commerce / Procurement",
      title: "Procurement Analytics",
      description: "Track purchasing spend, supplier performance and reorder needs.",
    },
    navigation: {
      section: "Stock & purchasing",
      label: "Procurement",
      icon: "ChartNoAxesCombined",
      order: 6,
    },
  }),
  staticRoute({
    id: "purchase-orders-new",
    path: "/dashboard/purchase-orders/new",
    page: purchaseOrderCreatePage,
  }),
  {
    id: "purchase-order-edit",
    page: purchaseOrderEditPage,
    match: pattern(/^\/dashboard\/purchase-orders\/([^/]+)\/edit$/, ["id"]),
    render: (Page, match) => createElement(Page, { id: match.params.id }),
  },
  staticRoute({
    id: "purchase-orders",
    path: "/dashboard/purchase-orders",
    page: purchaseOrdersPage,
    meta: {
      eyebrow: "Commerce / Procurement",
      title: "Purchase Orders",
      description: "Create, submit and track supplier purchase orders before receiving.",
    },
    navigation: {
      section: "Stock & purchasing",
      label: "Purchase Orders",
      icon: "ClipboardList",
      order: 7,
    },
  }),
  {
    id: "purchase-order-detail",
    page: purchaseOrderDetailPage,
    match: pattern(/^\/dashboard\/purchase-orders\/([^/]+)$/, ["id"]),
    render: (Page, match) => createElement(Page, { id: match.params.id }),
  },
  staticRoute({
    id: "receiving",
    path: "/dashboard/receiving",
    page: receivingPage,
    meta: {
      eyebrow: "Commerce / Operations",
      title: "Receiving",
      description: "Receive issued purchase orders, review invoices and approve stock intake.",
    },
    navigation: {
      section: "Stock & purchasing",
      label: "Receiving",
      icon: "ClipboardList",
      order: 8,
    },
  }),
  {
    id: "receiving-po-detail",
    page: receivingPage,
    match: pattern(/^\/dashboard\/receiving\/([^/]+)$/, ["purchaseOrderId"]),
    render: (Page, match) => createElement(Page, { purchaseOrderId: match.params.purchaseOrderId }),
  },
  {
    id: "receiving-detail",
    page: receivingDetailPage,
    match: pattern(/^\/dashboard\/receivings\/([^/]+)$/, ["id"]),
    render: (Page, match) => createElement(Page, { id: match.params.id }),
  },
  staticRoute({
    id: "suppliers",
    path: "/dashboard/suppliers",
    page: suppliersPage,
    meta: {
      eyebrow: "Commerce / Procurement",
      title: "Suppliers & Locations",
      description: "Manage supplier contacts and purchasing destinations.",
    },
    navigation: {
      section: "Stock & purchasing",
      label: "Suppliers",
      icon: "UserCog",
      order: 9,
    },
  }),
  staticRoute({
    id: "customers",
    path: "/dashboard/customers",
    page: customersPage,
    meta: {
      eyebrow: "Commerce / Relationships",
      title: "Customers",
      description: "Understand your customer base and build stronger relationships.",
    },
    navigation: {
      section: "Sales",
      label: "Customers",
      icon: "Users",
      order: 10,
    },
  }),
  {
    id: "customer-detail",
    page: customerDetailPage,
    match: pattern(/^\/dashboard\/customers\/([^/]+)$/, ["id"]),
    render: (Page, match) => createElement(Page, { id: match.params.id }),
  },
  staticRoute({
    id: "homepage",
    path: "/dashboard/homepage",
    aliases: ["/dashboard/homepage/sections"],
    page: homepagePage,
    meta: {
      eyebrow: "Store content / CMS",
      title: "Homepage manager",
      description: "Shape the storefront with saved content controls.",
    },
    navigation: {
      section: "Store content",
      label: "Homepage",
      icon: "PanelsTopLeft",
      order: 0,
    },
  }),
  staticRoute({
    id: "hero-banners",
    path: "/dashboard/homepage/hero",
    page: heroBannersPage,
    meta: {
      eyebrow: "Store content / CMS",
      title: "Hero banners",
      description: "Plan the first impression with campaign-ready hero content.",
    },
    navigation: {
      section: "Store content",
      label: "Hero banners",
      icon: "Image",
      order: 1,
    },
  }),
  staticRoute({
    id: "brands",
    path: "/dashboard/brands",
    page: brandsPage,
    meta: {
      eyebrow: "Store content",
      title: "Brands",
      description: "Manage the brands that make Space Call distinctive.",
    },
    navigation: {
      section: "Catalog",
      label: "Brands",
      icon: "Badge",
      order: 2,
    },
  }),
  staticRoute({
    id: "navigation",
    path: "/dashboard/navigation",
    page: navigationPage,
    meta: {
      eyebrow: "Store content / CMS",
      title: "Navigation",
      description: "Design desktop, mobile, and footer menus in one place.",
    },
    navigation: {
      section: "Store content",
      label: "Navigation",
      icon: "Menu",
      order: 3,
    },
  }),
  staticRoute({
    id: "promotions",
    path: "/dashboard/promotions",
    page: workspacePage,
    meta: {
      eyebrow: "Store content / Marketing",
      title: "Promotions",
      description: "Plan offers and promotional moments for your customers.",
    },
    navigation: {
      section: "Marketing",
      label: "Promotions",
      icon: "BadgePercent",
      order: 4,
    },
    render: (Page, _match, path) => createElement(Page, { path, key: path }),
  }),
  staticRoute({
    id: "marketing",
    path: "/dashboard/marketing",
    page: workspacePage,
    meta: {
      eyebrow: "Marketing / Campaigns",
      title: "Campaigns",
      description: "Manage campaign workspace integrations as they become operational.",
    },
    navigation: {
      section: "Marketing",
      label: "Campaigns",
      icon: "Megaphone",
      order: 0,
    },
    render: (Page, _match, path) => createElement(Page, { path, key: path }),
  }),
  staticRoute({
    id: "coupons",
    path: "/dashboard/coupons",
    page: workspacePage,
    meta: {
      eyebrow: "Marketing / Offers",
      title: "Coupons",
      description: "Manage coupon workspace integrations as they become operational.",
    },
    navigation: {
      section: "Marketing",
      label: "Coupons",
      icon: "TicketPercent",
      order: 1,
    },
    render: (Page, _match, path) => createElement(Page, { path, key: path }),
  }),
  staticRoute({
    id: "seo",
    path: "/dashboard/seo",
    page: seoPage,
    meta: {
      eyebrow: "Marketing / Discoverability",
      title: "SEO",
      description: "Prepare search and social metadata before integration.",
    },
    navigation: {
      section: "Marketing",
      label: "SEO",
      icon: "SearchCheck",
      order: 2,
    },
  }),
  staticRoute({
    id: "messages",
    path: "/dashboard/messages",
    page: workspacePage,
    meta: {
      eyebrow: "Management / Inbox",
      title: "Messages",
      description: "Keep customer conversations and internal requests moving.",
    },
    navigation: {
      section: "Management",
      label: "Messages",
      icon: "Mail",
      order: 1,
    },
    render: (Page, _match, path) => createElement(Page, { path, key: path }),
  }),
  staticRoute({
    id: "reviews",
    path: "/dashboard/reviews",
    page: workspacePage,
    meta: {
      eyebrow: "Management / Reviews",
      title: "Reviews",
      description: "Review management will appear here when its live integration is connected.",
    },
    navigation: {
      section: "Management",
      label: "Reviews",
      icon: "Star",
      order: 2,
    },
    render: (Page, _match, path) => createElement(Page, { path, key: path }),
  }),
  staticRoute({
    id: "media",
    path: "/dashboard/media",
    page: mediaPage,
    meta: {
      eyebrow: "Management / Assets",
      title: "Media library",
      description: "Browse the visual assets that power your store.",
    },
    navigation: {
      section: "Management",
      label: "Media library",
      icon: "FolderOpen",
      order: 3,
    },
  }),
  staticRoute({
    id: "users",
    path: "/dashboard/users",
    page: workspacePage,
    meta: {
      eyebrow: "System / Access",
      title: "Users",
      description: "Manage admin team members and access roles.",
    },
    navigation: {
      section: "System",
      label: "Users",
      icon: "UserCog",
      order: 0,
    },
    render: (Page, _match, path) => createElement(Page, { path, key: path }),
  }),
  staticRoute({
    id: "activity",
    path: "/dashboard/activity",
    page: workspacePage,
    meta: {
      eyebrow: "System / Audit",
      title: "Activity logs",
      description: "Review the latest changes across the admin workspace.",
    },
    navigation: {
      section: "System",
      label: "Activity logs",
      icon: "ScrollText",
      order: 1,
    },
    render: (Page, _match, path) => createElement(Page, { path, key: path }),
  }),
  staticRoute({
    id: "security",
    path: "/dashboard/security",
    page: securityPage,
    meta: {
      eyebrow: "System / Security",
      title: "Security Center",
      description: "Review MFA, session controls, bot protection and security activity.",
    },
    navigation: {
      section: "System",
      label: "Security",
      icon: "LockKeyhole",
      order: 2,
    },
  }),
  staticRoute({
    id: "settings",
    path: "/dashboard/settings",
    page: settingsPage,
    meta: {
      eyebrow: "System / Workspace",
      title: "Settings",
      description: "Configure the store workspace and integrations.",
    },
    navigation: {
      section: "System",
      label: "Settings",
      icon: "Settings2",
      order: 3,
    },
  }),
];

function routeMatches(definition: DashboardRouteDefinition, path: string) {
  if (definition.path === path) return { params: {} };
  if (definition.aliases?.includes(path)) return { params: {} };
  return definition.match?.(path) ?? null;
}

function findRoute(pathname: string) {
  const path = normalizeDashboardPath(pathname);
  for (const definition of routes) {
    const match = routeMatches(definition, path);
    if (match) return { definition, match, path };
  }
  return null;
}

export function resolveDashboardRoute(pathname: string): ReactNode {
  const resolved = findRoute(pathname);
  if (!resolved) {
    const path = normalizeDashboardPath(pathname);
    return createElement(workspacePage.Component, { path, key: path });
  }

  const { definition, match, path } = resolved;
  if (definition.render) {
    return definition.render(definition.page.Component, match, path);
  }
  return createElement(definition.page.Component);
}

export function preloadDashboardRoute(pathname: string) {
  const resolved = findRoute(pathname);
  return (resolved?.definition.page ?? workspacePage).preload();
}

export const dashboardNavigationSections: DashboardNavigationSection[] = SECTION_ORDER.map(
  (section) => ({
    label: section,
    items: routes
      .filter((route) => route.navigation?.section === section && route.path)
      .sort((a, b) => (a.navigation?.order ?? 0) - (b.navigation?.order ?? 0))
      .map((route) => ({
        label: route.navigation!.label,
        href: route.path!,
        icon: route.navigation!.icon,
      })),
  }),
).filter((section) => section.items.length > 0);

export const dashboardPageMeta: Record<string, DashboardPageMeta> = Object.fromEntries(
  routes.flatMap((route) => {
    if (!route.meta || !route.path) return [];
    return [
      [route.path, route.meta],
      ...(route.aliases ?? []).map((alias) => [alias, route.meta!] as const),
    ];
  }),
);

export const DashboardLoginPage = loginPage.Component;
export const preloadDashboardLogin = loginPage.preload;

export const dashboardRouteDefinitions = routes.map((route) => ({
  id: route.id,
  path: route.path ?? null,
  aliases: route.aliases ?? [],
  navigation: route.navigation ?? null,
  dynamic: Boolean(route.match && !route.path),
}));
