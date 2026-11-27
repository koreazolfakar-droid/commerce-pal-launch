import {
  ChevronRight,
  ExternalLink,
  Boxes,
  ClipboardList,
  FolderOpen,
  Image,
  Layers3,
  LayoutTemplate,
  ListTree,
  Package,
  PackageCheck,
  PackagePlus,
  SearchCheck,
  ShoppingBag,
  Tags,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { SITE_URL } from "@/lib/storeConfig";
import { Link } from "wouter";
import { useLanguage } from "@/dashboard/i18n";
import { readPreference, writePreference } from "@/dashboard/lib/preferenceStorage";

const sections = [
  {
    label: "Daily work",
    tools: [
      { label: "View orders", href: "/dashboard/orders", icon: ShoppingBag },
      { label: "Add New Product", href: "/dashboard/products/new", icon: PackagePlus },
      { label: "Receive stock", href: "/dashboard/receiving", icon: PackageCheck },
      { label: "Manage inventory", href: "/dashboard/inventory", icon: Boxes },
    ],
  },
  {
    label: "Stock & purchasing",
    tools: [
      { label: "New purchase order", href: "/dashboard/purchase-orders/new", icon: ClipboardList },
      { label: "Purchase Orders", href: "/dashboard/purchase-orders", icon: Layers3 },
      { label: "Receive stock", href: "/dashboard/receiving", icon: PackageCheck },
      { label: "Suppliers", href: "/dashboard/suppliers", icon: Truck },
      { label: "Manage inventory", href: "/dashboard/inventory", icon: Boxes },
    ],
  },
  {
    label: "Catalog",
    tools: [
      { label: "Add New Product", href: "/dashboard/products/new", icon: PackagePlus },
      { label: "Products", href: "/dashboard/products", icon: Package },
      { label: "Categories", href: "/dashboard/categories", icon: ListTree },
      { label: "Brands", href: "/dashboard/brands", icon: Tags },
      { label: "Collections", href: "/dashboard/collections", icon: Layers3 },
    ],
  },
  {
    label: "Store content",
    tools: [
      { label: "Edit homepage", href: "/dashboard/homepage", icon: LayoutTemplate },
      { label: "Hero banners", href: "/dashboard/homepage/hero", icon: Image },
      { label: "Media library", href: "/dashboard/media", icon: FolderOpen },
      { label: "Navigation", href: "/dashboard/navigation", icon: ListTree },
      { label: "SEO", href: "/dashboard/seo", icon: SearchCheck },
    ],
  },
];

const preference = "dashboard:work-tools";

export default function DashboardWorkTools() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(() => {
    const saved = readPreference(preference);
    return sections.find((section) => section.label === saved) ?? sections[0];
  });

  return (
    <div className="dashboard-operations">
      <header className="dashboard-store-masthead">
        <div className="dashboard-store-identity">
          <span lang="en" dir="ltr">
            Space Call
          </span>
          <span aria-hidden="true">/</span>
          <span>{t("Lebanon")}</span>
        </div>
        <h1>{t("Store operations")}</h1>
        <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
          {t("View storefront")} <ExternalLink size={15} aria-hidden="true" />
        </a>
      </header>
      <section aria-labelledby="dashboard-work-title" className="dashboard-work-tools">
        <div className="dashboard-work-heading">
          <h2 id="dashboard-work-title">{t("Work tools")}</h2>
          <div role="group" aria-label={t("Work area")} className="dashboard-work-switch">
            {sections.map((section) => (
              <button
                key={section.label}
                type="button"
                aria-pressed={section === selected}
                aria-controls="dashboard-work-links"
                onClick={() => {
                  setSelected(section);
                  writePreference(preference, section.label);
                }}
              >
                {t(section.label)}
              </button>
            ))}
          </div>
        </div>
        <nav
          id="dashboard-work-links"
          aria-label={t(selected.label)}
          className="dashboard-work-links"
        >
          {selected.tools.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href}>
              <span className="dashboard-work-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span>{t(label)}</span>
              <ChevronRight
                className="dashboard-work-arrow dashboard-directional"
                size={16}
                aria-hidden="true"
              />
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
