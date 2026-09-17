import {
  BarChart3,
  Boxes,
  FolderKanban,
  Image,
  LayoutDashboard,
  LayoutPanelTop,
  Mail,
  Megaphone,
  Menu,
  Package,
  SearchCheck,
  Settings,
  ShoppingBag,
  Tags,
  UsersRound,
} from "lucide-react";

export const DASHBOARD_OPERATIONS_NAVIGATION = [
  {
    to: "/dashboard",
    en: "Overview",
    ar: "لوحة التحكم",
    icon: LayoutDashboard,
    badge: undefined,
  },
  {
    to: "/dashboard/orders",
    en: "Orders",
    ar: "الطلبات",
    icon: ShoppingBag,
    badge: "orders",
  },
  {
    to: "/dashboard/customers",
    en: "Customers",
    ar: "العملاء",
    icon: UsersRound,
    badge: undefined,
  },
] as const;

export const DASHBOARD_CATALOG_NAVIGATION = [
  {
    to: "/dashboard/products",
    en: "Products",
    ar: "المنتجات",
    icon: Package,
    badge: "products",
  },
  {
    to: "/dashboard/inventory",
    en: "Inventory",
    ar: "المخزون",
    icon: Boxes,
    badge: "inventory",
  },
  {
    to: "/dashboard/categories",
    en: "Categories",
    ar: "التصنيفات",
    icon: Tags,
    badge: undefined,
  },
  {
    to: "/dashboard/brands",
    en: "Brands",
    ar: "البراندات",
    icon: Tags,
    badge: undefined,
  },
  {
    to: "/dashboard/collections",
    en: "Collections",
    ar: "المجموعات",
    icon: FolderKanban,
    badge: undefined,
  },
] as const;

export const DASHBOARD_STOREFRONT_NAVIGATION = [
  {
    to: "/dashboard/hero",
    en: "Hero & Banners",
    ar: "الهيرو والبنرات",
    icon: Image,
    badge: undefined,
  },
  {
    to: "/dashboard/sections",
    en: "Homepage Sections",
    ar: "أقسام الصفحة",
    icon: LayoutPanelTop,
    badge: undefined,
  },
  {
    to: "/dashboard/navigation",
    en: "Menus & Icons",
    ar: "القوائم والأيقونات",
    icon: Menu,
    badge: undefined,
  },
  {
    to: "/dashboard/seo",
    en: "SEO",
    ar: "SEO",
    icon: SearchCheck,
    badge: undefined,
  },
] as const;

export const DASHBOARD_GROWTH_NAVIGATION = [
  {
    to: "/dashboard/analytics",
    en: "Analytics",
    ar: "التحليلات",
    icon: BarChart3,
    badge: undefined,
  },
  {
    to: "/dashboard/marketing",
    en: "Marketing",
    ar: "التسويق",
    icon: Megaphone,
    badge: undefined,
  },
  {
    to: "/dashboard/messages",
    en: "Messages",
    ar: "الرسائل",
    icon: Mail,
    badge: undefined,
  },
] as const;

export const DASHBOARD_SYSTEM_NAVIGATION = [
  {
    to: "/dashboard/settings",
    en: "Settings",
    ar: "الإعدادات",
    icon: Settings,
    badge: undefined,
  },
] as const;

export const DASHBOARD_NAV_GROUPS = [
  {
    id: "operations",
    en: "Operations",
    ar: "العمليات",
    items: DASHBOARD_OPERATIONS_NAVIGATION,
  },
  {
    id: "catalog",
    en: "Catalog",
    ar: "الكتالوج",
    items: DASHBOARD_CATALOG_NAVIGATION,
  },
  {
    id: "storefront",
    en: "Storefront",
    ar: "واجهة المتجر",
    items: DASHBOARD_STOREFRONT_NAVIGATION,
  },
  {
    id: "growth",
    en: "Growth",
    ar: "النمو والتسويق",
    items: DASHBOARD_GROWTH_NAVIGATION,
  },
  {
    id: "system",
    en: "System",
    ar: "النظام",
    items: DASHBOARD_SYSTEM_NAVIGATION,
  },
] as const;

// Backwards-compatible exports used by existing dashboard components.
export const DASHBOARD_NAVIGATION = [
  ...DASHBOARD_OPERATIONS_NAVIGATION,
  ...DASHBOARD_CATALOG_NAVIGATION,
  ...DASHBOARD_GROWTH_NAVIGATION,
  ...DASHBOARD_SYSTEM_NAVIGATION,
] as const;

export const DASHBOARD_CONTENT_NAVIGATION = [...DASHBOARD_STOREFRONT_NAVIGATION] as const;

export const DASHBOARD_SEARCH_TARGETS = [
  ...DASHBOARD_OPERATIONS_NAVIGATION,
  ...DASHBOARD_CATALOG_NAVIGATION,
  ...DASHBOARD_STOREFRONT_NAVIGATION,
  ...DASHBOARD_GROWTH_NAVIGATION,
  ...DASHBOARD_SYSTEM_NAVIGATION,
] as const;
