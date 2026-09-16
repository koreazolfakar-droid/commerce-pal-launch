import {
  BarChart3,
  Boxes,
  FolderKanban,
  Image,
  LayoutDashboard,
  Mail,
  Megaphone,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  UsersRound,
} from "lucide-react";

export const DASHBOARD_NAVIGATION = [
  { to: "/dashboard", en: "Dashboard", ar: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/dashboard/orders", en: "Orders", ar: "الطلبات", icon: ShoppingBag, badge: "orders" },
  { to: "/dashboard/products", en: "Products", ar: "المنتجات", icon: Package },
  { to: "/dashboard/customers", en: "Customers", ar: "العملاء", icon: UsersRound },
  { to: "/dashboard/analytics", en: "Analytics", ar: "التحليلات", icon: BarChart3 },
  { to: "/dashboard/inventory", en: "Inventory", ar: "المخزون", icon: Boxes },
  { to: "/dashboard/brands", en: "Brands", ar: "البراندات", icon: Tags },
  { to: "/dashboard/marketing", en: "Marketing", ar: "التسويق", icon: Megaphone },
  { to: "/dashboard/messages", en: "Messages", ar: "الرسائل", icon: Mail, badge: "messages" },
  { to: "/dashboard/settings", en: "Settings", ar: "الإعدادات", icon: Settings },
] as const;

export const DASHBOARD_CONTENT_NAVIGATION = [
  { to: "/dashboard/collections", en: "Collections", ar: "المجموعات", icon: FolderKanban },
  { to: "/dashboard/categories", en: "Categories", ar: "التصنيفات", icon: Tags },
  { to: "/dashboard/hero", en: "Hero & Banners", ar: "الهيرو والبنرات", icon: Image },
  { to: "/dashboard/navigation", en: "Menus & Icons", ar: "القوائم والأيقونات", icon: Menu },
] as const;

export const DASHBOARD_SEARCH_TARGETS = [
  ...DASHBOARD_NAVIGATION,
  ...DASHBOARD_CONTENT_NAVIGATION,
  { to: "/dashboard/seo", en: "SEO", ar: "SEO", icon: BarChart3 },
] as const;
