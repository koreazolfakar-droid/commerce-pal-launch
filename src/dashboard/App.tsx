import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import { Toaster, toast } from "sonner";
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, Boxes, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, CircleHelp, Clock3, Cloud, Command, Download, ExternalLink, Eye, FileText, Filter, FolderOpen, Gauge, Image as ImageIcon, Inbox, Layers3, LayoutDashboard, LifeBuoy, ListFilter, Loader2, LockKeyhole, LogOut, Mail, Megaphone, Menu, MenuSquare, MessageSquare, MoreHorizontal, Package, PanelLeftClose, PanelLeftOpen, PanelsTopLeft, Pencil, Plus, RefreshCw, Search, SearchCheck, Send, Settings2, ShoppingBag, SlidersHorizontal, Sparkles, Star, Tags, TicketPercent, Trash2, TrendingUp, UploadCloud, UserCog, Users, X, Zap
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { customers, navSections, orders, pageMeta, products, revenueData, topBrands, type Order, type Product } from "@/dashboard/mock/data";
import { LanguageContext, useLanguage } from "@/dashboard/i18n";
import { validateProductDraft } from "@/dashboard/lib/validation";
import {
  PRODUCT_IMAGE_RESOLUTIONS,
  getProductImageResolution,
  setProductImageResolution,
  type ProductImageResolution,
} from "@/dashboard/lib/imageProcessing";
import {
  deleteDashboardProductImage,
  getDashboardProduct,
  getDashboardRole,
  listDashboardBrands,
  listDashboardCategories,
  listDashboardCollections,
  listDashboardProductImages,
  listDashboardProducts,
  reorderDashboardProductImages,
  replaceDashboardProductImage,
  saveDashboardProduct,
  setDashboardPrimaryProductImage,
  signInDashboard,
  signOutDashboard,
  uploadDashboardProductImage,
  type DashboardProduct,
  type DashboardProductImage,
} from "@/dashboard/data/catalog";
import HomepageBuilderPage from "@/dashboard/pages/HomepageBuilder";
import CategoriesPage from "@/dashboard/pages/CategoriesPage";
import BrandsPage from "@/dashboard/pages/BrandsPage";
import InventoryManagerPage from "@/dashboard/pages/InventoryManagerPage";
import DashboardHomePage from "@/dashboard/pages/DashboardHomePage";
import OrdersPageLive from "@/dashboard/pages/OrdersPage";
import OrderDetailPageLive from "@/dashboard/pages/OrderDetailPage";
import CustomersPageLive from "@/dashboard/pages/CustomersPage";
import CustomerDetailPageLive from "@/dashboard/pages/CustomerDetailPage";
import CollectionsPageLive from "@/dashboard/pages/CollectionsPage";
import CollectionDetailPageLive from "@/dashboard/pages/CollectionDetailPage";
import HeroBannersPageLive from "@/dashboard/pages/HeroBannersPage";

const iconMap: Record<string, typeof LayoutDashboard> = { LayoutDashboard, ShoppingBag, Package, Layers3, Tags, Boxes, Users, PanelsTopLeft, Image: ImageIcon, Badge: Star, Menu, BadgePercent: TicketPercent, Megaphone, TicketPercent, SearchCheck, ChartNoAxesCombined: BarChart3, Mail, Star, FolderOpen, UserCog, ScrollText: FileText, Settings2 };

const money = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
const compactMoney = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className={`flex items-center gap-3 ${compact ? "justify-center" : ""}`}>
    <div className="relative grid size-10 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#5c6bff] via-[#4c48d8] to-[#8c52d9] shadow-[0_10px_24px_rgba(86,77,223,.35)]">
      <div className="absolute h-[22px] w-[30px] -rotate-[28deg] rounded-[50%] border-[3px] border-white/90" />
      <div className="absolute h-2.5 w-2.5 translate-x-2 -translate-y-2 rounded-full bg-[#56b7ff]" />
    </div>
    {!compact && <div className="min-w-0"><div className="text-[15px] font-bold tracking-[-.03em] text-white">Space Call</div><div className="mt-0.5 whitespace-nowrap text-[9px] font-medium uppercase tracking-[.18em] text-slate-400">Tech for a better tomorrow</div></div>}
  </div>;
}

function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = { Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-100", Processing: "bg-blue-50 text-blue-700 ring-blue-100", Shipped: "bg-violet-50 text-violet-700 ring-violet-100", Cancelled: "bg-rose-50 text-rose-700 ring-rose-100", Pending: "bg-amber-50 text-amber-700 ring-amber-100", Active: "bg-emerald-50 text-emerald-700 ring-emerald-100", Draft: "bg-amber-50 text-amber-700 ring-amber-100", VIP: "bg-violet-50 text-violet-700 ring-violet-100", New: "bg-sky-50 text-sky-700 ring-sky-100", Paid: "bg-emerald-50 text-emerald-700 ring-emerald-100", Refunded: "bg-rose-50 text-rose-700 ring-rose-100" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${tones[status] ?? "bg-slate-50 text-slate-600 ring-slate-100"}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>;
}

function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: { collapsed: boolean; setCollapsed: (v: boolean) => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const { t } = useLanguage();
  const [location, navigate] = useLocation();
  const isActive = (href: string) => location === href || (href !== "/dashboard" && location.startsWith(href));
  return <>
    {mobileOpen && <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#101b32] text-white shadow-2xl transition-all duration-200 lg:translate-x-0 ${collapsed ? "lg:w-[82px]" : ""} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className={`flex h-[92px] items-center border-b border-white/[.07] px-5 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}><Logo compact={collapsed} /></div>
      <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-none">
        {navSections.map((section) => <div key={section.label} className="mb-6">
          {!collapsed && <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">{t(section.label)}</div>}
          <div className="space-y-1">{section.items.map((item) => { const Icon = iconMap[item.icon] ?? LayoutDashboard; const active = isActive(item.href); return <button key={item.href} title={collapsed ? t(item.label) : undefined} onClick={() => { navigate(item.href); setMobileOpen(false); }} className={`group flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-[13px] font-medium transition ${collapsed ? "lg:justify-center" : ""} ${active ? "bg-[#5361ef] text-white shadow-[0_7px_20px_rgba(83,97,239,.32)]" : "text-slate-400 hover:bg-white/[.07] hover:text-white"}`}><Icon className={`size-[17px] shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-200"}`} strokeWidth={1.8} />{!collapsed && <><span className="min-w-0 flex-1 truncate">{t(item.label)}</span>{item.badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-white/15 text-white" : "bg-white/[.08] text-slate-300"}`}>{item.badge}</span>}</>}</button>; })}</div>
        </div>)}
      </div>
      <div className="border-t border-white/[.07] p-4">
        {!collapsed && <div className="mb-3 rounded-2xl border border-white/[.08] bg-white/[.05] p-3"><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-300"><Sparkles className="size-3.5 text-[#8c8aff]" /> {t("Standalone workspace")}</div><p className="mb-3 text-[11px] leading-4 text-slate-500">{t("Supabase catalog connected.")}</p><button onClick={() => toast.info("Store preview link is available in the next integration phase.")} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#a8b2ff] hover:text-white">{t("View store")} <ExternalLink className="size-3" /></button></div>}
        <button onClick={() => setCollapsed(!collapsed)} className={`hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] text-slate-500 hover:bg-white/[.06] hover:text-white lg:flex ${collapsed ? "justify-center" : ""}`} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /><span>{t("Collapse sidebar")}</span></>}</button>
      </div>
    </aside>
  </>;
}

function Header({ onMenu, onSearch }: { onMenu: () => void; onSearch: (value: string) => void }) {
  const { lang, setLang, t } = useLanguage();
  const [query, setQuery] = useState(""); const [open, setOpen] = useState(false); const [profileOpen, setProfileOpen] = useState(false); const [, navigate] = useLocation();
  const [headerProducts, setHeaderProducts] = useState<DashboardProduct[]>([]);
  useEffect(() => { const listener = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); document.getElementById("global-search")?.focus(); } }; window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener); }, []);
  useEffect(() => { let cancelled = false; listDashboardProducts().then((rows) => { if (!cancelled) setHeaderProducts(rows); }).catch(() => undefined); return () => { cancelled = true; }; }, []);
  const results: DashboardProduct[] = query ? headerProducts.filter(p => `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [];
  return <header className="sticky top-0 z-30 flex h-[78px] items-center justify-between border-b border-slate-200/80 bg-[#f7f9fc]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
    <div className="flex min-w-0 flex-1 items-center gap-3"><button onClick={onMenu} className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden"><Menu className="size-5" /></button><div className="relative hidden max-w-[480px] flex-1 sm:block"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input id="global-search" value={query} onChange={e => { setQuery(e.target.value); setOpen(true); onSearch(e.target.value); }} onFocus={() => setOpen(true)} placeholder={t("Search orders, products, customers...")} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-14 text-[13px] text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#6872ee] focus:ring-4 focus:ring-[#6872ee]/10" /><div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400"><Command className="size-3" />K</div>{open && query && <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">{results.length ? results.map((item) => <button key={item.id} onClick={() => { setOpen(false); navigate(`/dashboard/products/${item.id}`); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"><div className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><Package className="size-4" /></div><div className="min-w-0"><div className="truncate text-[12px] font-semibold text-slate-800">{item.name}</div><div className="text-[11px] text-slate-400">{`${item.brand || "No brand"} · ${item.category || "Uncategorized"}`}</div></div></button>) : <div className="px-3 py-4 text-center text-xs text-slate-400">No matching Supabase products</div>}</div>}</div></div>
    <div className="flex shrink-0 items-center gap-2 sm:gap-4"><button onClick={() => toast.info("You are all caught up.")} className="relative grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-white hover:text-slate-800"><Bell className="size-[18px]" /><span className="absolute right-2.5 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-[#f7f9fc]" /></button><div className="hidden h-8 w-px bg-slate-200 sm:block" /><button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:text-indigo-600" title={lang === "en" ? "العربية" : "English"}>{lang === "en" ? "AR" : "EN"}</button><button onClick={() => setProfileOpen(!profileOpen)} className="relative flex items-center gap-2.5 rounded-xl p-1.5 pr-2 hover:bg-white"><div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#f0c5a9] to-[#925f53] text-[11px] font-bold text-white ring-2 ring-white">SC</div><div className="hidden text-left sm:block"><div className="text-[12px] font-bold text-slate-800">Space Call Staff</div><div className="text-[10px] font-medium text-slate-400">{t("Store Manager")}</div></div><ChevronDown className="hidden size-4 text-slate-400 sm:block" />{profileOpen && <div className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-xl"><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"><Users className="size-3.5" /> Profile</button><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"><Settings2 className="size-3.5" /> Preferences</button><button onClick={async () => { await signOutDashboard().catch(() => undefined); navigate("/login"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"><LogOut className="size-3.5" /> Sign out</button></div>}</button></div>
  </header>;
}

function PageHeader({ meta, action }: { meta: { eyebrow: string; title: string; description: string }; action?: React.ReactNode }) { return <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]"><span className="size-1.5 rounded-full bg-[#6a70e7]" />{meta.eyebrow}</div><h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">{meta.title}</h1><p className="mt-1.5 text-sm text-slate-500">{meta.description}</p></div>{action}</div>; }

function StatCard({ icon: Icon, label, value, change, positive = true, accent }: { icon: typeof BarChart3; label: string; value: string; change: string; positive?: boolean; accent: string }) { return <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(33,47,82,.08)]"><div className="flex items-start justify-between"><div className={`grid size-11 place-items-center rounded-[14px] ${accent}`}><Icon className="size-[21px]" strokeWidth={1.8} /></div><button onClick={() => toast.info(`${label} trend detail is available in Analytics.`)} className="grid size-7 place-items-center rounded-lg text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-slate-50 hover:text-slate-500"><MoreHorizontal className="size-4" /></button></div><div className="mt-5 text-[12px] font-medium text-slate-500">{label}</div><div className="mt-1 flex items-end justify-between gap-2"><div className="text-[25px] font-bold tracking-[-.04em] text-[#14203a]">{value}</div><div className={`mb-1 flex items-center gap-1 text-[11px] font-bold ${positive ? "text-emerald-600" : "text-rose-600"}`}>{positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{change}</div></div><div className="mt-1 text-[10px] text-slate-400">vs last month</div></div>; }

function ChartCard({ type, range, setRange }: { type: "revenue" | "orders"; range: string; setRange: (v: string) => void }) { return <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-5 flex items-start justify-between"><div><div className="text-[13px] font-bold text-[#14203a]">{type === "revenue" ? "Revenue overview" : "Orders trend"}</div><div className="mt-2 flex items-center gap-3"><span className="text-[22px] font-bold tracking-[-.04em] text-[#14203a]">{type === "revenue" ? "$124,892" : "1,842"}</span><span className="flex items-center gap-0.5 text-[11px] font-bold text-emerald-600"><ArrowUpRight className="size-3.5" />{type === "revenue" ? "12.5%" : "8.3%"}</span></div></div><select value={range} onChange={e => setRange(e.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 outline-none focus:border-indigo-400"><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Yearly</option></select></div><div className="h-[210px] w-full"><ResponsiveContainer width="100%" height="100%"><>{type === "revenue" ? <AreaChart data={revenueData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6371f1" stopOpacity={.28} /><stop offset="100%" stopColor="#6371f1" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0f6" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a1a8b8" }} axisLine={false} tickLine={false} interval={2} /><YAxis tick={{ fontSize: 10, fill: "#a1a8b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8eaf2", fontSize: 12, boxShadow: "0 10px 30px rgba(22,31,55,.1)" }} formatter={(v) => [money(Number(v)), "Revenue"]} /><Area type="monotone" dataKey="revenue" stroke="#5968ea" strokeWidth={3} fill="url(#revenueFill)" activeDot={{ r: 5, fill: "#5968ea", stroke: "#fff", strokeWidth: 3 }} /></AreaChart> : <BarChart data={revenueData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f6" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a1a8b8" }} axisLine={false} tickLine={false} interval={2} /><YAxis tick={{ fontSize: 10, fill: "#a1a8b8" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f6f7fb" }} contentStyle={{ borderRadius: 12, border: "1px solid #e8eaf2", fontSize: 12 }} formatter={(v) => [v, "Orders"]} /><Bar dataKey="orders" fill="#7580e9" radius={[4, 4, 0, 0]} barSize={10} /></BarChart>}</></ResponsiveContainer></div></div>; }

function RecentOrders() { const [, navigate] = useLocation(); return <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="text-[13px] font-bold text-[#14203a]">Recent orders</h3><p className="mt-0.5 text-[11px] text-slate-400">The latest customer activity from your store</p></div><button onClick={() => navigate("/dashboard/orders")} className="flex items-center gap-1 text-[11px] font-bold text-[#5968ea] hover:text-[#3e4bc3]">View all <ArrowRight className="size-3.5" /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[710px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-[.12em] text-slate-400"><th className="px-5 py-3 font-semibold">Order</th><th className="px-3 py-3 font-semibold">Customer</th><th className="px-3 py-3 font-semibold">Items</th><th className="px-3 py-3 font-semibold">Total</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Date</th></tr></thead><tbody>{orders.slice(0, 6).map(order => <tr onClick={() => navigate(`/dashboard/orders/${order.id}`)} key={order.id} className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-[#fafbff]"><td className="px-5 py-3.5 text-[12px] font-bold text-[#5a64dc]">#{order.id}</td><td className="px-3 py-3.5"><div className="flex items-center gap-2.5"><div className="grid size-7 place-items-center rounded-full bg-[#eef0ff] text-[9px] font-bold text-[#5a64dc]">{order.initials}</div><span className="text-[12px] font-semibold text-slate-700">{order.customer}</span></div></td><td className="max-w-[180px] truncate px-3 py-3.5 text-[12px] text-slate-500">{order.items}</td><td className="px-3 py-3.5 text-[12px] font-bold text-slate-700">{compactMoney(order.total)}</td><td className="px-3 py-3.5"><StatusBadge status={order.status} /></td><td className="px-5 py-3.5 text-[11px] text-slate-400">{order.date}</td></tr>)}</tbody></table></div></div>; }

function SmallPanel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="text-[13px] font-bold text-[#14203a]">{title}</h3>{subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}</div>{action}</div>{children}</div>; }

function HomePage() { const [range, setRange] = useState("Daily"); const [range2, setRange2] = useState("Daily"); const [, navigate] = useLocation(); return <div><div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]"><span className="size-1.5 rounded-full bg-[#6a70e7]" />Thursday, January 31, 2026</div><h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Dashboard</h1><p className="mt-1.5 text-sm text-slate-500">Welcome back, Alex. Here&apos;s what&apos;s happening with your store today.</p></div><div className="flex items-center gap-2"><button onClick={() => toast.info("Date range picker is using the mock January 2026 dataset.")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-semibold text-slate-600 shadow-sm"><CalendarDays className="size-4 text-slate-400" /> Jan 1 – Jan 31, 2026 <ChevronDown className="size-3.5 text-slate-400" /></button><button onClick={() => toast.success("Mock report prepared for download.")} className="flex h-10 items-center gap-2 rounded-xl bg-[#14203a] px-3.5 text-[11px] font-bold text-white shadow-[0_7px_16px_rgba(20,32,58,.18)] hover:bg-[#202f50]"><Download className="size-4" /> <span className="hidden sm:inline">Export report</span></button></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={BarChart3} label="Total sales" value="$124,892" change="12.5%" accent="bg-[#eef0ff] text-[#5b68e9]" /><StatCard icon={ShoppingBag} label="Orders" value="1,842" change="8.3%" accent="bg-[#eaf7ff] text-[#278bc9]" /><StatCard icon={Users} label="Customers" value="1,206" change="14.2%" accent="bg-[#f0edff] text-[#7f62dc]" /><StatCard icon={Package} label="Products" value="356" change="4.1%" accent="bg-[#edf9f3] text-[#32a474]" /></div><div className="mt-4 grid gap-4 xl:grid-cols-2"><ChartCard type="revenue" range={range} setRange={setRange} /><ChartCard type="orders" range={range2} setRange={setRange2} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={Gauge} label="Conversion rate" value="3.8%" change="0.6%" accent="bg-[#fff4e8] text-[#e99030]" /><StatCard icon={FileText} label="Average order value" value="$67.82" change="5.4%" accent="bg-[#edf0ff] text-[#5b68e9]" /><StatCard icon={Users} label="Returning customers" value="28.6%" change="3.2%" accent="bg-[#f2ecff] text-[#9a5dde]" /><StatCard icon={Activity} label="Low stock alerts" value="18" change="12.5%" positive={false} accent="bg-[#fff0f1] text-[#e35d6a]" /></div><div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]"><RecentOrders /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1"><SmallPanel title="Top selling products" subtitle="This month" action={<button onClick={() => navigate("/dashboard/products")} className="text-[11px] font-bold text-[#5968ea]">View all →</button>}><div className="divide-y divide-slate-100 px-5">{products.slice(0, 5).map((product, i) => <div key={product.id} className="flex items-center gap-3 py-3"><span className="w-4 text-center text-[11px] font-bold text-slate-400">{i + 1}</span><img src={product.image} alt="" className="size-9 rounded-lg bg-slate-100 object-cover" /><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-bold text-slate-700">{product.name}</div><div className="mt-0.5 text-[10px] text-slate-400">{product.sold} sold</div></div><span className="text-[12px] font-bold text-slate-700">{money(product.price)}</span></div>)}</div></SmallPanel><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2"><SmallPanel title="Top brands"><div className="space-y-3 px-5 py-4">{topBrands.map(brand => <div key={brand.name} className="flex items-center gap-2.5"><span className="size-2 rounded-full" style={{ backgroundColor: brand.color }} /><span className="flex-1 text-[11px] font-semibold text-slate-600">{brand.name}</span><div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${brand.value * 2.2}%`, backgroundColor: brand.color }} /></div><span className="w-9 text-right text-[10px] font-bold text-slate-500">{brand.value}%</span></div>)}</div></SmallPanel><SmallPanel title="Inventory status"><div className="space-y-3 px-5 py-4">{[["In stock", "284", "79.8%", "#16a477"], ["Low stock", "18", "5.1%", "#e9a72b"], ["Out of stock", "12", "3.4%", "#e55362"], ["On order", "42", "11.8%", "#3c6bde"]].map(([label, count, percent, color]) => <div key={label} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: color }} /><span className="flex-1 text-[11px] font-semibold text-slate-600">{label}</span><span className="text-[11px] font-bold text-slate-700">{count}</span><span className="w-10 text-right text-[10px] text-slate-400">{percent}</span></div>)}</div></SmallPanel></div></div></div></div>; }

function TableToolbar({ value, setValue, placeholder = "Search...", onFilter }: { value: string; setValue: (v: string) => void; placeholder?: string; onFilter?: () => void }) { return <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-[340px]"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-slate-200 bg-[#fbfcfe] pl-9 pr-3 text-[12px] outline-none placeholder:text-slate-400 focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10" /></div><div className="flex items-center gap-2"><button onClick={onFilter} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"><SlidersHorizontal className="size-3.5" /> Filters</button><button onClick={() => toast.info("Column visibility controls are ready for the integration phase.")} className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 sm:flex"><ListFilter className="size-3.5" /> Columns</button></div></div>; }

function OrdersPage() { const [search, setSearch] = useState(""); const [status, setStatus] = useState("All status"); const [page, setPage] = useState(1); const filtered = orders.filter(o => (`${o.id} ${o.customer} ${o.items}`).toLowerCase().includes(search.toLowerCase()) && (status === "All status" || o.status === status)); const visible = filtered.slice((page - 1) * 6, page * 6); return <div><PageHeader meta={pageMeta["/dashboard/orders"]} action={<button onClick={() => toast.success("New order flow is ready for mock testing.")} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)]"><Plus className="size-4" /> Create order</button>} /><div className="mb-4 grid gap-3 sm:grid-cols-4"><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-[11px] text-slate-400">All orders</div><div className="mt-1 text-xl font-bold text-[#14203a]">1,842</div></div><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-[11px] text-slate-400">Processing</div><div className="mt-1 text-xl font-bold text-blue-600">86</div></div><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-[11px] text-slate-400">Shipped</div><div className="mt-1 text-xl font-bold text-violet-600">124</div></div><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-[11px] text-slate-400">Delivered</div><div className="mt-1 text-xl font-bold text-emerald-600">1,604</div></div></div><div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]"><TableToolbar value={search} setValue={v => { setSearch(v); setPage(1); }} placeholder="Search by order, customer, or product" onFilter={() => toast.info("Use the status selector to filter this mock table.")} /><div className="flex items-center gap-2 px-4 pb-3"><Filter className="size-3.5 text-slate-400" /><select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 outline-none"><option>All status</option>{["Delivered", "Processing", "Shipped", "Cancelled", "Pending"].map(s => <option key={s}>{s}</option>)}</select><span className="text-[11px] text-slate-400">{filtered.length} results</span></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-[#fafbfe]"><tr className="border-y border-slate-100 text-[10px] uppercase tracking-[.12em] text-slate-400"><th className="px-5 py-3 font-semibold">Order ID</th><th className="px-3 py-3 font-semibold">Customer</th><th className="px-3 py-3 font-semibold">Items</th><th className="px-3 py-3 font-semibold">Total</th><th className="px-3 py-3 font-semibold">Payment</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Date</th></tr></thead><tbody>{visible.map(o => <tr key={o.id} onClick={() => { window.history.pushState({}, "", `/dashboard/orders/${o.id}`); window.dispatchEvent(new PopStateEvent("popstate")); }} className="cursor-pointer border-b border-slate-50 hover:bg-[#fafbff]"><td className="px-5 py-4 text-[12px] font-bold text-[#5968ea]">#{o.id}</td><td className="px-3 py-4"><div className="flex items-center gap-2"><div className="grid size-7 place-items-center rounded-full bg-indigo-50 text-[9px] font-bold text-indigo-600">{o.initials}</div><span className="text-[12px] font-semibold text-slate-700">{o.customer}</span></div></td><td className="max-w-[190px] truncate px-3 py-4 text-[12px] text-slate-500">{o.items}</td><td className="px-3 py-4 text-[12px] font-bold text-slate-700">{compactMoney(o.total)}</td><td className="px-3 py-4 text-[11px] text-slate-500">{o.payment}</td><td className="px-3 py-4"><StatusBadge status={o.status} /></td><td className="px-5 py-4 text-[11px] text-slate-400">{o.date}</td></tr>)}{!visible.length && <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-400">No orders match your search.</td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><span className="text-[11px] text-slate-400">Showing {filtered.length ? (page - 1) * 6 + 1 : 0}–{Math.min(page * 6, filtered.length)} of {filtered.length}</span><div className="flex gap-1"><button disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"><ChevronLeft className="size-4" /></button><button disabled={page * 6 >= filtered.length} onClick={() => setPage(page + 1)} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"><ChevronRight className="size-4" /></button></div></div></div></div>; }

function OrderDetail({ id }: { id: string }) { const order = orders.find(o => o.id === id) ?? orders[0]; const [, navigate] = useLocation(); return <div><button onClick={() => navigate("/dashboard/orders")} className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500 hover:text-[#5968ea]"><ArrowLeft className="size-4" /> Back to orders</button><PageHeader meta={{ eyebrow: `Order / #${order.id}`, title: `Order #${order.id}`, description: `Placed on ${order.date} by ${order.customer}.` }} action={<div className="flex gap-2"><button onClick={() => toast.info("Order edit is available with mock state.")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-bold text-slate-600"><Pencil className="size-3.5" /> Edit order</button><button onClick={() => toast.success("Mock fulfillment action recorded.")} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-3.5 text-[11px] font-bold text-white"><Send className="size-3.5" /> Fulfill order</button></div>} /><div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]"><div className="space-y-4"><SmallPanel title="Order items" subtitle="3 products"><div className="divide-y divide-slate-100 px-5">{[{ product: products[0], qty: 1 }, { product: products[4], qty: 1 }].map(({ product, qty }) => <div key={product.id} className="flex items-center gap-3 py-4"><img src={product.image} className="size-14 rounded-xl bg-slate-100 object-cover" alt="" /><div className="min-w-0 flex-1"><div className="text-[12px] font-bold text-slate-700">{product.name}</div><div className="mt-1 text-[11px] text-slate-400">{product.sku} · Qty {qty}</div></div><div className="text-[12px] font-bold text-slate-700">{compactMoney(product.price * qty)}</div></div>)}</div><div className="space-y-2 border-t border-slate-100 px-5 py-4 text-[12px]"><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{compactMoney(order.total - 24)}</span></div><div className="flex justify-between text-slate-500"><span>Shipping</span><span>$24.00</span></div><div className="flex justify-between border-t border-slate-100 pt-3 text-[14px] font-bold text-[#14203a]"><span>Total</span><span>{compactMoney(order.total)}</span></div></div></SmallPanel><SmallPanel title="Order timeline"><div className="space-y-5 px-5 py-5">{[["Order placed", "Jan 31, 2026 · 10:42 AM", "#5968ea"], ["Payment confirmed", "Jan 31, 2026 · 10:43 AM", "#19a875"], ["Processing started", "Jan 31, 2026 · 11:05 AM", "#3d8ed1"], ["Shipment pending", "Expected Feb 1, 2026", "#b0b8c8"]].map(([title, date, color], index) => <div key={title} className="relative flex gap-3"><div className="relative z-10 grid size-7 place-items-center rounded-full" style={{ backgroundColor: `${color}18`, color }}><span className="size-2 rounded-full bg-current" /></div>{index < 3 && <div className="absolute left-[13px] top-7 h-6 w-px bg-slate-200" />}<div><div className="text-[12px] font-bold text-slate-700">{title}</div><div className="mt-0.5 text-[11px] text-slate-400">{date}</div></div></div>)}</div></SmallPanel></div><div className="space-y-4"><SmallPanel title="Customer" action={<button onClick={() => navigate("/dashboard/customers")} className="text-[11px] font-bold text-[#5968ea]">View profile</button>}><div className="flex items-center gap-3 px-5 py-4"><div className="grid size-11 place-items-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">{order.initials}</div><div><div className="text-[13px] font-bold text-slate-700">{order.customer}</div><div className="mt-0.5 text-[11px] text-slate-400">customer@spacecall.demo</div></div></div></SmallPanel><SmallPanel title="Shipping address"><div className="flex items-start gap-3 px-5 py-4 text-[12px] text-slate-500"><div className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"><ExternalLink className="size-4" /></div><span className="leading-5">{order.address}</span></div></SmallPanel><SmallPanel title="Payment & fulfillment"><div className="space-y-4 px-5 py-4"><div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">Payment status</span><StatusBadge status={order.payment} /></div><div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">Fulfillment status</span><StatusBadge status={order.status} /></div></div></SmallPanel></div></div></div>; }

function ProductsPage() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const [catalog, setCatalog] = useState<DashboardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listDashboardProducts()
      .then((rows) => {
        if (!cancelled) {
          setCatalog(rows);
          setError("");
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load products.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const needle = search.trim().toLowerCase();
  const filtered = catalog.filter((product) =>
    `${product.name} ${product.brand} ${product.sku} ${product.handle}`
      .toLowerCase()
      .includes(needle),
  );
  const activeCount = catalog.filter((product) => product.status === "Active").length;
  const draftCount = catalog.filter((product) => product.status === "Draft").length;

  return (
    <div>
      <PageHeader
        meta={{
          eyebrow: "Commerce / Catalog",
          title: "Products",
          description: "Products are loaded directly from the Space Call Supabase catalog.",
        }}
        action={
          <button
            onClick={() => navigate("/dashboard/products/new")}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)]"
          >
            <Plus className="size-4" /> Add product
          </button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] text-slate-400">Total products</div>
          <div className="mt-1 text-xl font-bold text-[#14203a]">{catalog.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] text-slate-400">Active</div>
          <div className="mt-1 text-xl font-bold text-emerald-600">{activeCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] text-slate-400">Drafts</div>
          <div className="mt-1 text-xl font-bold text-amber-600">{draftCount}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <TableToolbar
          value={search}
          setValue={setSearch}
          placeholder="Search by product, brand, SKU, or handle"
        />
        {loading ? (
          <div className="grid min-h-56 place-items-center">
            <Loader2 className="size-5 animate-spin text-[#5968ea]" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm font-semibold text-rose-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#fafbfe]">
                <tr className="border-y border-slate-100 text-[10px] uppercase tracking-[.12em] text-slate-400">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 font-semibold">SKU</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Price</th>
                  <th className="px-3 py-3 font-semibold">Stock</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => navigate(`/dashboard/products/${product.id}`)}
                    className="cursor-pointer border-b border-slate-50 hover:bg-[#fafbff]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="size-full object-contain"
                            />
                          ) : (
                            <Package className="size-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-[12px] font-bold text-slate-700">{product.name}</div>
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            {product.brand || "No brand"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 font-mono text-[11px] text-slate-500">
                      {product.sku || "—"}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-slate-500">
                      {product.category || "—"}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] font-bold text-slate-700">
                      {compactMoney(product.price)}
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`text-[12px] font-bold ${
                          product.stock < 10 ? "text-rose-600" : "text-slate-700"
                        }`}
                      >
                        {product.stock}
                        {product.stock < 10 && (
                          <span className="ml-1 text-[10px] font-medium">low</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/dashboard/products/${product.id}`);
                        }}
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                        aria-label={`Edit ${product.name}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="p-8 text-center text-sm text-slate-400">No products match this search.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductForm({ id }: { id?: string }) {
  const [, navigate] = useLocation();
  const [existing, setExisting] = useState<DashboardProduct | null>(null);
  const [brands, setBrands] = useState<Awaited<ReturnType<typeof listDashboardBrands>>>([]);
  const [categories, setCategories] = useState<
    Awaited<ReturnType<typeof listDashboardCategories>>
  >([]);
  const [collections, setCollections] = useState<
    Awaited<ReturnType<typeof listDashboardCollections>>
  >([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    brandId: "",
    categoryId: "",
    status: "Draft" as "Active" | "Draft" | "Archived",
    collectionId: "",
    price: "",
    compareAt: "",
    sku: "",
    barcode: "",
    stock: "0",
    imageUrl: "",
    seoTitle: "",
    seoDescription: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      id ? getDashboardProduct(id) : Promise.resolve(null),
      listDashboardBrands(),
      listDashboardCategories(),
      listDashboardCollections(),
    ])
      .then(([product, brandRows, categoryRows, collectionRows]) => {
        if (cancelled) return;
        setExisting(product);
        setBrands(brandRows);
        setCategories(categoryRows);
        setCollections(collectionRows);
        if (product) {
          setForm({
            title: product.name,
            description: product.description,
            brandId: product.brandId ?? "",
            categoryId: product.categoryId ?? "",
            status: product.status,
            collectionId: "",
            price: String(product.price),
            compareAt: product.compareAt == null ? "" : String(product.compareAt),
            sku: product.sku,
            barcode: product.barcode,
            stock: String(product.stock),
            imageUrl: product.image,
            seoTitle: product.seoTitle,
            seoDescription: product.seoDescription,
          });
        }
      })
      .catch((cause) => {
        toast.error(cause instanceof Error ? cause.message : "Unable to load product.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const input = (
    label: string,
    key: keyof typeof form,
    type = "text",
    disabled = false,
  ) => (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span>
      <input
        value={form[key]}
        onChange={(event) => update(key, event.target.value)}
        type={type}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </label>
  );

  const variantLocked = Boolean(existing && existing.variantCount > 1);

  const handleSave = async () => {
    const result = validateProductDraft({
      title: form.title,
      price: form.price,
      sku: form.sku,
      stock: form.stock,
    });
    if (!result.valid) {
      toast.error(Object.values(result.errors)[0]);
      return;
    }
    setSaving(true);
    try {
      const savedProduct = await saveDashboardProduct({
        id,
        title: form.title,
        description: form.description,
        brandId: form.brandId || null,
        categoryId: form.categoryId || null,
        status: form.status,
        price: Number(form.price) || 0,
        compareAt: form.compareAt.trim() ? Number(form.compareAt) : null,
        sku: form.sku,
        barcode: form.barcode,
        stock: Number(form.stock) || 0,
        imageUrl: form.imageUrl,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        collectionId: form.collectionId || null,
      });
      setSaved(true);
      toast.success(
        savedProduct.variantManagedSeparately
          ? "Product saved. Existing multi-variant pricing and stock were preserved."
          : "Product saved to Supabase.",
      );
      if (!id) navigate(`/dashboard/products/${savedProduct.id}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Product save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[360px] place-items-center">
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/dashboard/products")}
        className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-slate-500 hover:text-[#5968ea]"
      >
        <ArrowLeft className="size-4" /> Back to products
      </button>
      <PageHeader
        meta={{
          eyebrow: id ? "Catalog / Edit product" : "Catalog / New product",
          title: id ? "Edit product" : "Add a product",
          description: "This record is saved directly to the Space Call Supabase catalog.",
        }}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/dashboard/products")}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Save product
            </button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <SmallPanel title="Product information" subtitle="Live catalog fields">
            <div className="space-y-4 px-5 py-5">
              {input("Title", "title")}
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-700 outline-none focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Brand</span>
                  <select
                    value={form.brandId}
                    onChange={(event) => update("brandId", event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:border-[#6974eb]"
                  >
                    <option value="">No brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}{brand.active ? "" : " (Hidden)"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                    Category
                  </span>
                  <select
                    value={form.categoryId}
                    onChange={(event) => update("categoryId", event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:border-[#6974eb]"
                  >
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}{category.active ? "" : " (Hidden)"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                    Add to collection
                  </span>
                  <select
                    value={form.collectionId}
                    onChange={(event) => update("collectionId", event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:border-[#6974eb]"
                  >
                    <option value="">No collection change</option>
                    {collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.title}{collection.active ? "" : " (Hidden)"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      update("status", event.target.value as "Active" | "Draft" | "Archived")
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none"
                  >
                    <option>Active</option>
                    <option>Draft</option>
                    <option>Archived</option>
                  </select>
                </label>
              </div>
            </div>
          </SmallPanel>

          <SmallPanel title="Pricing & inventory">
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              {input("Price", "price", "number", variantLocked)}
              {input("Compare-at price", "compareAt", "number", variantLocked)}
              {input("SKU", "sku", "text", variantLocked)}
              {input("Barcode", "barcode", "text", variantLocked)}
              {input("Stock", "stock", "number", variantLocked)}
            </div>
            {variantLocked && (
              <div className="mx-5 mb-5 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
                This product has {existing?.variantCount} real variants. Product-level details can be
                edited here, while variant pricing, SKU and stock are preserved until the variant
                editor is connected.
              </div>
            )}
          </SmallPanel>

          <SmallPanel title="Variants" subtitle="Real Supabase variant records">
            <div className="px-5 py-5 text-[11px] leading-5 text-slate-500">
              {existing?.variantCount
                ? `${existing.variantCount} variant${existing.variantCount === 1 ? "" : "s"} currently stored for this product.`
                : "A single variant will be created from the pricing and inventory fields when this product is saved."}
            </div>
          </SmallPanel>
        </div>

        <div className="space-y-4">
          <SmallPanel title="Media" subtitle="Use an existing public product image URL">
            <div className="space-y-4 p-5">
              {form.imageUrl ? (
                <div className="grid aspect-[1.5] place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-[#fafbfe]">
                  <img
                    src={form.imageUrl}
                    alt={form.title || "Product"}
                    className="h-full w-full object-contain p-4"
                  />
                </div>
              ) : (
                <div className="grid aspect-[1.5] place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-[#fafbfe] text-slate-400">
                  <ImageIcon className="size-7" />
                </div>
              )}
              {input("Image URL", "imageUrl")}
            </div>
          </SmallPanel>

          <SmallPanel title="Search preview">
            <div className="space-y-4 px-5 py-4">
              {input("SEO title", "seoTitle")}
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                  SEO description
                </span>
                <textarea
                  value={form.seoDescription}
                  onChange={(event) => update("seoDescription", event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-[#6974eb]"
                />
              </label>
            </div>
          </SmallPanel>

          {saved && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-[11px] font-semibold text-emerald-700">
              Saved to the Space Call Supabase catalog.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomersPage() { const [search, setSearch] = useState(""); const filtered = customers.filter(c => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())); return <div><PageHeader meta={pageMeta["/dashboard/customers"]} action={<button onClick={() => toast.success("Customer creation form is ready for mock testing.")} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"><Plus className="size-4" /> Add customer</button>} /><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[11px] text-slate-400">Total customers</div><div className="mt-2 text-2xl font-bold text-[#14203a]">1,206</div><div className="mt-1 text-[10px] font-semibold text-emerald-600">↑ 14.2% vs last month</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[11px] text-slate-400">VIP customers</div><div className="mt-2 text-2xl font-bold text-[#14203a]">184</div><div className="mt-1 text-[10px] font-semibold text-emerald-600">↑ 8.7% vs last month</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[11px] text-slate-400">Avg. lifetime value</div><div className="mt-2 text-2xl font-bold text-[#14203a]">$284.16</div><div className="mt-1 text-[10px] font-semibold text-emerald-600">↑ 5.1% vs last month</div></div></div><div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]"><TableToolbar value={search} setValue={setSearch} placeholder="Search customers" /><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#fafbfe]"><tr className="border-y border-slate-100 text-[10px] uppercase tracking-[.12em] text-slate-400"><th className="px-5 py-3 font-semibold">Customer</th><th className="px-3 py-3 font-semibold">Phone</th><th className="px-3 py-3 font-semibold">Orders</th><th className="px-3 py-3 font-semibold">Total spent</th><th className="px-3 py-3 font-semibold">Last order</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead><tbody>{filtered.map(c => <tr key={c.email} className="border-b border-slate-50 hover:bg-[#fafbff]"><td className="px-5 py-4"><div className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600">{c.initials}</div><div><div className="text-[12px] font-bold text-slate-700">{c.name}</div><div className="text-[10px] text-slate-400">{c.email}</div></div></div></td><td className="px-3 py-4 text-[11px] text-slate-500">{c.phone}</td><td className="px-3 py-4 text-[12px] font-bold text-slate-700">{c.orders}</td><td className="px-3 py-4 text-[12px] font-bold text-slate-700">{money(c.spent)}</td><td className="px-3 py-4 text-[11px] text-slate-400">{c.lastOrder}</td><td className="px-5 py-4"><StatusBadge status={c.status} /></td></tr>)}</tbody></table></div></div></div>; }

function InventoryPage() { const rows = products.map(p => ({ ...p, reserved: Math.max(1, Math.floor(p.stock * .18)), available: Math.max(0, p.stock - Math.max(1, Math.floor(p.stock * .18))) })); return <div><PageHeader meta={pageMeta["/dashboard/inventory"]} action={<button onClick={() => toast.success("Inventory sync simulation completed.")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600"><RefreshCw className="size-3.5" /> Sync mock inventory</button>} /><div className="mb-4 grid gap-3 sm:grid-cols-4"><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-[11px] text-slate-400">Units in stock</div><div className="mt-1 text-xl font-bold text-[#14203a]">284</div></div><div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4"><div className="text-[11px] text-amber-700/70">Low stock</div><div className="mt-1 text-xl font-bold text-amber-700">18</div></div><div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4"><div className="text-[11px] text-rose-700/70">Out of stock</div><div className="mt-1 text-xl font-bold text-rose-700">12</div></div><div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><div className="text-[11px] text-blue-700/70">On order</div><div className="mt-1 text-xl font-bold text-blue-700">42</div></div></div><div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-4"><div className="text-[13px] font-bold text-[#14203a]">Inventory levels</div><button onClick={() => toast.info("Inventory filters are in mock mode.")} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600"><Filter className="size-3.5" /> Filter</button></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#fafbfe]"><tr className="border-y border-slate-100 text-[10px] uppercase tracking-[.12em] text-slate-400"><th className="px-5 py-3 font-semibold">Product</th><th className="px-3 py-3 font-semibold">Variant</th><th className="px-3 py-3 font-semibold">SKU</th><th className="px-3 py-3 font-semibold">Stock</th><th className="px-3 py-3 font-semibold">Reserved</th><th className="px-3 py-3 font-semibold">Available</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead><tbody>{rows.map(p => <tr key={p.id} className="border-b border-slate-50 hover:bg-[#fafbff]"><td className="px-5 py-3.5 text-[12px] font-bold text-slate-700">{p.name}</td><td className="px-3 py-3.5 text-[11px] text-slate-500">Standard</td><td className="px-3 py-3.5 font-mono text-[10px] text-slate-500">{p.sku}</td><td className="px-3 py-3.5 text-[12px] font-bold text-slate-700">{p.stock}</td><td className="px-3 py-3.5 text-[12px] text-slate-500">{p.reserved}</td><td className="px-3 py-3.5 text-[12px] font-bold text-slate-700">{p.available}</td><td className="px-5 py-3.5"><StatusBadge status={p.stock < 10 ? "Pending" : "Active"} /></td></tr>)}</tbody></table></div></div></div>; }

function SettingsPage() { const [tab, setTab] = useState("General"); const tabs = ["General", "Store identity", "Contact", "Social media", "WhatsApp", "SEO", "Localization", "Appearance", "Integrations", "Security"]; return <div><PageHeader meta={pageMeta["/dashboard/settings"]} action={<button onClick={() => toast.success("Settings saved to the local mock workspace.")} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"><Check className="size-4" /> Save changes</button>} /><div className="grid gap-4 xl:grid-cols-[220px_1fr]"><div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="space-y-1">{tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold transition ${tab === t ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}>{t}</button>)}</div></div><div className="space-y-4"><SmallPanel title={tab} subtitle={tab === "Integrations" ? "Visual placeholders only. Nothing is connected." : "Manage your workspace preferences."}>{tab === "Integrations" ? <div className="space-y-3 px-5 py-5">{[["Shopify", "Not connected", "Storefront and admin APIs are intentionally disabled."], ["Supabase", "Not connected", "Database sync is intentionally disabled."], ["Space Call Store", "Integration pending", "Live store connection will be planned in a later phase."]].map(([name, status, desc]) => <div key={name} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500"><Cloud className="size-5" /></div><div className="flex-1"><div className="text-[12px] font-bold text-slate-700">{name}</div><div className="mt-1 text-[11px] text-slate-400">{desc}</div></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">{status}</span><button onClick={() => toast.info(`${name} is intentionally unavailable in standalone phase.`)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-500">Details</button></div>)}</div> : <div className="grid gap-4 px-5 py-5 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Store name</span><input defaultValue="Space Call" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Store email</span><input defaultValue="hello@spacecall.demo" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400" /></label><label className="block sm:col-span-2"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Workspace note</span><textarea defaultValue="Standalone dashboard using mock/demo data only." rows={4} className="w-full rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-indigo-400" /></label></div>}</SmallPanel><div className="rounded-2xl border border-[#dfe2ff] bg-[#f5f6ff] p-4 text-[11px] leading-5 text-[#5962b8]"><div className="flex items-center gap-2 font-bold"><LockKeyhole className="size-4" /> Integration guardrail</div><p className="mt-1">This workspace is intentionally isolated. Shopify, Supabase, production APIs, storage, and live authentication are not connected.</p></div></div></div></div>; }

function GenericPage({ path }: { path: string }) { const meta = pageMeta[path] ?? { eyebrow: "Workspace", title: "Coming soon", description: "This workspace module is staged for the next iteration." }; const [enabled, setEnabled] = useState(true); return <div><PageHeader meta={meta} action={<button onClick={() => toast.success("Mock changes saved.")} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"><Check className="size-4" /> Save changes</button>} /><div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]"><SmallPanel title="Workspace overview" subtitle="A practical starting point for the next management workflow"><div className="space-y-4 px-5 py-5"><div className="rounded-2xl bg-gradient-to-br from-[#17223f] to-[#3446a5] p-6 text-white"><div className="mb-8 flex items-center justify-between"><div className="grid size-10 place-items-center rounded-xl bg-white/10"><Sparkles className="size-5 text-[#bfc5ff]" /></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-[#d5d9ff]">Mock module</span></div><div className="text-[22px] font-bold tracking-[-.04em]">{meta.title}</div><p className="mt-2 max-w-md text-[12px] leading-5 text-indigo-100/75">This screen is connected to the standalone navigation and ready for real data contracts in a future phase.</p></div><div className="grid gap-3 sm:grid-cols-3">{[["Records", "128"], ["Published", "96"], ["Needs review", "12"]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 p-4"><div className="text-[10px] text-slate-400">{label}</div><div className="mt-1 text-xl font-bold text-[#14203a]">{value}</div></div>)}</div></div></SmallPanel><SmallPanel title="Module settings"><div className="space-y-4 px-5 py-5"><div className="flex items-center justify-between rounded-xl border border-slate-200 p-4"><div><div className="text-[12px] font-bold text-slate-700">Enable module</div><div className="mt-1 text-[11px] text-slate-400">Show this module in the admin workspace.</div></div><button onClick={() => setEnabled(!enabled)} className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-[#5968ea]" : "bg-slate-200"}`}><span className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${enabled ? "left-6" : "left-1"}`} /></button></div><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Internal note</span><textarea rows={4} defaultValue={`Mock configuration for ${meta.title}.`} className="w-full rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-indigo-400" /></label><button onClick={() => toast.info("Preview refreshed from mock state.")} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600"><Eye className="size-3.5" /> Preview module</button></div></SmallPanel></div></div>; }

function LoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      toast.error("Enter your Supabase dashboard email and password.");
      return;
    }
    setLoading(true);
    try {
      await signInDashboard(email, password);
      navigate("/dashboard");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#101b32] p-5">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 size-[420px] rounded-full bg-[#5968ea]/20 blur-[90px]" />
        <div className="absolute -bottom-32 -right-20 size-[460px] rounded-full bg-[#8d57d7]/20 blur-[100px]" />
      </div>
      <div className="relative w-full max-w-[400px] rounded-[28px] border border-white/10 bg-white/[.07] p-7 shadow-2xl backdrop-blur-xl sm:p-9">
        <Logo />
        <div className="mt-10">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#aeb5ff]">
            Admin workspace
          </div>
          <h1 className="text-[28px] font-bold tracking-[-.05em] text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in with an authorized Space Call Supabase account.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold text-slate-300">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[.07] px-3 text-[12px] text-white outline-none placeholder:text-slate-500 focus:border-[#7b86ff]"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold text-slate-300">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
              }}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[.07] px-3 text-[12px] text-white outline-none focus:border-[#7b86ff]"
            />
          </label>
          <button
            onClick={() => void submit()}
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6874f5] text-[12px] font-bold text-white shadow-[0_10px_24px_rgba(104,116,245,.28)] hover:bg-[#7a84ff] disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in to dashboard"}
          </button>
        </div>
        <div className="mt-7 flex items-center justify-center gap-2 text-[10px] text-slate-500">
          <LockKeyhole className="size-3" /> Supabase Auth + staff role required
        </div>
      </div>
    </div>
  );
}

function DashboardGate() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;
    getDashboardRole()
      .then((role) => {
        if (cancelled) return;
        if (role) setState("ready");
        else {
          setState("denied");
          navigate("/login");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState("denied");
          navigate("/login");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (state !== "ready") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f9fc]">
        {state === "loading" ? <Loader2 className="size-6 animate-spin text-[#5968ea]" /> : null}
      </div>
    );
  }
  return <DashboardLayout />;
}

function DashboardLayout() { const [location] = useLocation(); const [collapsed, setCollapsed] = useState(() => localStorage.getItem("spacecall-sidebar") === "collapsed"); const [mobileOpen, setMobileOpen] = useState(false); const [, setSearch] = useState(""); useEffect(() => { localStorage.setItem("spacecall-sidebar", collapsed ? "collapsed" : "expanded"); }, [collapsed]); const route = location.replace(/\/$/, "") || "/dashboard"; const productDetail = route.match(/^\/dashboard\/products\/([^/]+)$/); const orderDetail = route.match(/^\/dashboard\/orders\/([^/]+)$/); const customerDetail = route.match(/^\/dashboard\/customers\/([^/]+)$/); const collectionDetail = route.match(/^\/dashboard\/collections\/([^/]+)$/); let content: React.ReactNode; if (route === "/dashboard" || route === "/dashboard/") content = <DashboardHomePage />; else if (route === "/dashboard/orders") content = <OrdersPageLive />; else if (orderDetail) content = <OrderDetailPageLive id={orderDetail[1]} />; else if (route === "/dashboard/collections") content = <CollectionsPageLive />; else if (collectionDetail) content = <CollectionDetailPageLive id={collectionDetail[1]} />; else if (route === "/dashboard/products") content = <ProductsPage />; else if (route === "/dashboard/products/new") content = <ProductForm />; else if (productDetail) content = <ProductForm id={productDetail[1]} />; else if (route === "/dashboard/customers") content = <CustomersPageLive />; else if (customerDetail) content = <CustomerDetailPageLive id={customerDetail[1]} />; else if (route === "/dashboard/inventory") content = <InventoryManagerPage />; else if (route === "/dashboard/categories") content = <CategoriesPage />; else if (route === "/dashboard/brands") content = <BrandsPage />; else if (route === "/dashboard/settings") content = <SettingsPage />; else if (route === "/dashboard/homepage/hero") content = <HeroBannersPageLive />; else if (route === "/dashboard/homepage" || route === "/dashboard/homepage/sections") content = <HomepageBuilderPage />; else content = <GenericPage path={route} />; return <div className="min-h-screen bg-[#f7f9fc]"><Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /><div className={`min-h-screen transition-[padding] duration-200 ${collapsed ? "lg:pl-[82px]" : "lg:pl-[260px]"}`}><Header onMenu={() => setMobileOpen(true)} onSearch={setSearch} /><main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-9">{content}</main></div></div>; }

export default function App() {
  const [lang, setLang] = useState<"en" | "ar">(() => (localStorage.getItem("spacecall-language") as "en" | "ar") || "en");
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; localStorage.setItem("spacecall-language", lang); }, [lang]);
  const t = (key: string) => { const dictionary = lang === "ar" ? { "Overview": "نظرة عامة", "Commerce": "التجارة", "Store content": "محتوى المتجر", "Marketing": "التسويق", "Management": "الإدارة", "System": "النظام", "Dashboard": "لوحة التحكم", "Orders": "الطلبات", "Products": "المنتجات", "Collections": "المجموعات", "Categories": "التصنيفات", "Inventory": "المخزون", "Customers": "العملاء", "Homepage": "الصفحة الرئيسية", "Hero banners": "البنرات الرئيسية", "Brands": "العلامات التجارية", "Navigation": "التنقل", "Promotions": "العروض", "Campaigns": "الحملات", "Coupons": "القسائم", "SEO": "تحسين الظهور", "Analytics": "التحليلات", "Messages": "الرسائل", "Reviews": "المراجعات", "Media library": "مكتبة الوسائط", "Users": "المستخدمون", "Activity logs": "سجل النشاط", "Settings": "الإعدادات", "Search orders, products, customers...": "ابحث في الطلبات والمنتجات والعملاء...", "Store Manager": "مدير المتجر", "Export report": "تصدير التقرير", "Standalone workspace": "مساحة مستقلة", "View store": "عرض المتجر", "Collapse sidebar": "طي الشريط الجانبي" } : {}; return dictionary[key as keyof typeof dictionary] || key; };
  return <LanguageContext.Provider value={{ lang, setLang, t }}><><Switch><Route path="/login" component={LoginPage} /><Route component={DashboardGate} /></Switch><Toaster position="bottom-right" richColors /></></LanguageContext.Provider>; }
