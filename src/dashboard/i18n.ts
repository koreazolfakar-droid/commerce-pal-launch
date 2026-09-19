import { createContext, useContext } from "react";

export type Language = "en" | "ar";

export const translations: Record<Language, Record<string, string>> = {
  en: {
    Overview: "Overview", Commerce: "Commerce", "Store content": "Store content", Marketing: "Marketing", Management: "Management", System: "System",
    Dashboard: "Dashboard", Orders: "Orders", Products: "Products", Collections: "Collections", Categories: "Categories", Inventory: "Inventory", Customers: "Customers", Homepage: "Homepage", "Hero banners": "Hero banners", Brands: "Brands", Navigation: "Navigation", Promotions: "Promotions", Campaigns: "Campaigns", Coupons: "Coupons", SEO: "SEO", Analytics: "Analytics", Messages: "Messages", Reviews: "Reviews", "Media library": "Media library", Users: "Users", "Activity logs": "Activity logs", Settings: "Settings",
    "Search products...": "Search products...", "Store Manager": "Store Manager", "Export report": "Export report", "View all": "View all", "Collapse sidebar": "Collapse sidebar", "Live workspace": "Live workspace", "Supabase data connected.": "Supabase data connected.", "Notifications are not connected yet.": "Notifications are not connected yet.", "View store": "View store", "English": "English", "العربية": "Arabic",
  },
  ar: {
    Overview: "نظرة عامة", Commerce: "التجارة", "Store content": "محتوى المتجر", Marketing: "التسويق", Management: "الإدارة", System: "النظام",
    Dashboard: "لوحة التحكم", Orders: "الطلبات", Products: "المنتجات", Collections: "المجموعات", Categories: "التصنيفات", Inventory: "المخزون", Customers: "العملاء", Homepage: "الصفحة الرئيسية", "Hero banners": "البنرات الرئيسية", Brands: "العلامات التجارية", Navigation: "التنقل", Promotions: "العروض", Campaigns: "الحملات", Coupons: "القسائم", SEO: "تحسين الظهور", Analytics: "التحليلات", Messages: "الرسائل", Reviews: "المراجعات", "Media library": "مكتبة الوسائط", Users: "المستخدمون", "Activity logs": "سجل النشاط", Settings: "الإعدادات",
    "Search products...": "ابحث في المنتجات...", "Store Manager": "مدير المتجر", "Export report": "تصدير التقرير", "View all": "عرض الكل", "Collapse sidebar": "طي الشريط الجانبي", "Live workspace": "مساحة مباشرة", "Supabase data connected.": "بيانات Supabase متصلة.", "Notifications are not connected yet.": "الإشعارات غير مربوطة بعد.", "View store": "عرض المتجر", "English": "الإنجليزية", "العربية": "العربية",
  },
};

export const LanguageContext = createContext<{ lang: Language; setLang: (lang: Language) => void; t: (key: string) => string }>({ lang: "en", setLang: () => undefined, t: (key) => key });
export const useLanguage = () => useContext(LanguageContext);
