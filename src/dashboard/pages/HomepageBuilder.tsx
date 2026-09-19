import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BadgeCheck, Check, ChevronDown, CreditCard, Copy, GripVertical, Image as ImageIcon, Layers3, Loader2, Monitor, MoreHorizontal, Pencil, Plus, Save, Smartphone, Tablet, Trash2, UploadCloud, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { products, topBrands } from "@/dashboard/mock/data";
import { createSection, isSectionWithinSchedule, sectionTypeDescriptions, sectionTypeLabels, type DisplayMode, type HomepageSection, type SectionType } from "@/dashboard/mock/homepageSections";
import { deleteDashboardHomepageSection, loadDashboardHomepageWorkspace, saveDashboardHomepageSections } from "@/dashboard/data/homepage";

type MediaPickerProps = { value: string; onChange: (value: string) => void; label?: string };

function MediaPicker({ value, onChange, label = "Media" }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const media = ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80", "https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=500&q=80", "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?auto=format&fit=crop&w=500&q=80"];
  return <div><div className="mb-1.5 text-[11px] font-bold text-slate-600">{label}</div><div className="flex gap-3"><div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{value ? <img src={value} alt="Selected media" className="h-full w-full object-cover" /> : <ImageIcon className="size-5 text-slate-300" />}</div><div className="flex flex-col gap-2"><button onClick={() => setOpen(true)} className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-600"><ImageIcon className="size-3.5" /> Select from library</button><button onClick={() => toast.info("Homepage media upload will use the shared CMS media library in the next media step.")} className="flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-2.5 text-[10px] font-bold text-slate-500"><UploadCloud className="size-3.5" /> Upload new</button>{value && <button onClick={() => onChange("")} className="text-left text-[10px] font-semibold text-rose-500">Remove image</button>}</div></div>{open && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4" onClick={() => setOpen(false)}><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}><div className="mb-4 flex items-center justify-between"><div><div className="text-sm font-bold text-[#14203a]">Media library</div><div className="mt-1 text-[11px] text-slate-400">Shared picker for every homepage section</div></div><button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"><X className="size-4" /></button></div><div className="grid grid-cols-3 gap-3">{media.map(src => <button key={src} onClick={() => { onChange(src); setOpen(false); }} className="group aspect-square overflow-hidden rounded-xl border-2 border-transparent hover:border-indigo-500"><img src={src} alt="Library asset" className="h-full w-full object-cover transition group-hover:scale-105" /></button>)}</div></div></div>}</div>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) { return <button onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#5968ea]" : "bg-slate-200"}`}><span className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} /></button>; }
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10" /></label>; }
function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span><textarea value={value} onChange={e => onChange(e.target.value)} rows={4} className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[12px] outline-none focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10" /></label>; }
function RichTextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (before: string, after = before) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || "your text";
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + before.length, start + before.length + selected.length); });
  };
  return <div><span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span><div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-[#6974eb] focus-within:ring-4 focus-within:ring-[#6974eb]/10"><div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50 p-2"><button type="button" onClick={() => wrap("**")} className="rounded-md px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white">B</button><button type="button" onClick={() => wrap("_")} className="rounded-md px-2 py-1 text-[10px] italic text-slate-600 hover:bg-white">I</button><button type="button" onClick={() => wrap("## ", "")} className="rounded-md px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white">H2</button><button type="button" onClick={() => wrap("- ", "")} className="rounded-md px-2 py-1 text-[10px] text-slate-600 hover:bg-white">List</button><button type="button" onClick={() => wrap("[", "](https://)")} className="rounded-md px-2 py-1 text-[10px] text-slate-600 hover:bg-white">Link</button><span className="ml-auto px-2 py-1 text-[9px] text-slate-400">Safe rich text markers only</span></div><textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} rows={6} className="w-full resize-none border-0 p-3 text-[12px] outline-none" /></div></div>;
}

function SectionCard({ section, selected, onSelect, onToggle, onDuplicate, onDelete, onMove }: { section: HomepageSection; selected: boolean; onSelect: () => void; onToggle: () => void; onDuplicate: () => void; onDelete: () => void; onMove: (direction: "up" | "down") => void }) { return <div draggable onDragStart={e => e.dataTransfer.setData("section-id", section.id)} onDragOver={e => e.preventDefault()} onDrop={e => { const source = e.dataTransfer.getData("section-id"); window.dispatchEvent(new CustomEvent("homepage-reorder", { detail: { source, target: section.id } })); }} className={`group rounded-2xl border bg-white p-3 shadow-[0_8px_24px_rgba(33,47,82,.04)] transition ${selected ? "border-[#6874f5] ring-4 ring-[#6874f5]/10" : "border-slate-200/80 hover:border-slate-300"} ${!section.enabled ? "opacity-60" : ""}`}><div className="flex items-start gap-3"><div className="mt-1 cursor-grab text-slate-300"><GripVertical className="size-4" /></div><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Layers3 className="size-4" /></div><button onClick={onSelect} className="min-w-0 flex-1 text-left"><div className="truncate text-[12px] font-bold text-slate-700">{section.name}</div><div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400"><span>{sectionTypeLabels[section.type]}</span><span>·</span><span>#{section.order}</span>{section.status === "published" && <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-600">Published</span>}</div></button><div className="flex shrink-0 items-center gap-1"><button title="Move up" onClick={() => onMove("up")} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"><ArrowUp className="size-3.5" /></button><button title="Move down" onClick={() => onMove("down")} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"><ArrowDown className="size-3.5" /></button><button title="Duplicate" onClick={onDuplicate} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"><Copy className="size-3.5" /></button><button title="Delete" onClick={onDelete} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="size-3.5" /></button></div></div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-[10px] font-semibold text-slate-400">{section.enabled ? "Visible in preview" : "Hidden from preview"}</span><Toggle checked={section.enabled} onChange={onToggle} /></div></div>; }

function TrustItems({ section, update }: { section: HomepageSection; update: (patch: Partial<HomepageSection>) => void }) { const items = (section.settings.items as { icon: string; title: string; description: string }[]) ?? []; const setItems = (next: typeof items) => update({ settings: { ...section.settings, items: next } }); return <div className="space-y-3">{items.map((item, index) => <div key={`${item.title}-${index}`} className="rounded-xl border border-slate-200 p-3"><div className="grid gap-2 sm:grid-cols-[100px_1fr_1fr_32px]"><input value={item.icon} onChange={e => setItems(items.map((x, i) => i === index ? { ...x, icon: e.target.value } : x))} className="h-9 rounded-lg border border-slate-200 px-2 text-[11px]" placeholder="Icon" /><input value={item.title} onChange={e => setItems(items.map((x, i) => i === index ? { ...x, title: e.target.value } : x))} className="h-9 rounded-lg border border-slate-200 px-2 text-[11px]" placeholder="Title" /><input value={item.description} onChange={e => setItems(items.map((x, i) => i === index ? { ...x, description: e.target.value } : x))} className="h-9 rounded-lg border border-slate-200 px-2 text-[11px]" placeholder="Description" /><button onClick={() => setItems(items.filter((_, i) => i !== index))} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><X className="size-3.5" /></button></div></div>)}<button onClick={() => setItems([...items, { icon: "Zap", title: "New benefit", description: "Describe this customer benefit." }])} className="flex items-center gap-1 text-[11px] font-bold text-[#5968ea]"><Plus className="size-3.5" /> Add item</button></div>; }
function FaqItems({ section, update }: { section: HomepageSection; update: (patch: Partial<HomepageSection>) => void }) { const items = (section.settings.items as { question: string; answer: string }[]) ?? []; const setItems = (next: typeof items) => update({ settings: { ...section.settings, items: next } }); return <div className="space-y-3">{items.map((item, index) => <div key={`${item.question}-${index}`} className="rounded-xl border border-slate-200 p-3"><div className="flex gap-2"><div className="flex-1 space-y-2"><input value={item.question} onChange={e => setItems(items.map((x, i) => i === index ? { ...x, question: e.target.value } : x))} className="h-9 w-full rounded-lg border border-slate-200 px-2 text-[11px]" placeholder="Question" /><textarea value={item.answer} onChange={e => setItems(items.map((x, i) => i === index ? { ...x, answer: e.target.value } : x))} rows={2} className="w-full rounded-lg border border-slate-200 p-2 text-[11px]" placeholder="Answer" /></div><button onClick={() => setItems(items.filter((_, i) => i !== index))} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><X className="size-3.5" /></button></div></div>)}<button onClick={() => setItems([...items, { question: "New question", answer: "Add a helpful answer." }])} className="flex items-center gap-1 text-[11px] font-bold text-[#5968ea]"><Plus className="size-3.5" /> Add FAQ</button></div>; }

function Editor({ section, update }: { section: HomepageSection; update: (patch: Partial<HomepageSection>) => void }) { const set = (key: keyof HomepageSection, value: unknown) => update({ [key]: value }); const settings = section.settings; const setSetting = (key: string, value: unknown) => update({ settings: { ...settings, [key]: value } }); return <div className="space-y-4"><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 flex items-center justify-between"><div><div className="text-[13px] font-bold text-[#14203a]">Section settings</div><div className="mt-1 text-[11px] text-slate-400">Common fields shared by every section type.</div></div><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600">{sectionTypeLabels[section.type]}</span></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Internal name" value={section.name} onChange={v => set("name", v)} /><Field label="Section ID" value={section.sectionId} onChange={v => set("sectionId", v)} /><Field label="Display order" value={String(section.order)} onChange={v => set("order", Number(v) || 1)} /><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Status</span><select value={section.status} onChange={e => set("status", e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none"><option value="draft">Draft</option><option value="published">Published</option></select></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Background style</span><select value={section.background} onChange={e => set("background", e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none"><option value="surface">White surface</option><option value="mist">Soft gray</option><option value="navy">Dark navy</option><option value="purple">Purple campaign</option></select></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Text alignment</span><select value={section.alignment} onChange={e => set("alignment", e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{[["showOnStorefront", "Show on storefront"], ["showOnDesktop", "Show on desktop"], ["showOnTablet", "Show on tablet"], ["showOnMobile", "Show on mobile"]].map(([key, label]) => <div key={key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"><span className="text-[11px] font-semibold text-slate-600">{label}</span><Toggle checked={Boolean(section[key as keyof HomepageSection])} onChange={v => set(key as keyof HomepageSection, v)} /></div>)}</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Start date (optional)" value={section.startDate} onChange={v => set("startDate", v)} placeholder="2026-11-27" /><Field label="End date (optional)" value={section.endDate} onChange={v => set("endDate", v)} placeholder="2026-12-01" /></div></div><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 text-[13px] font-bold text-[#14203a]">Content and CTAs</div><div className="space-y-4"><Field label="Small label / eyebrow" value={section.eyebrow} onChange={v => set("eyebrow", v)} /><Field label="Title" value={section.title} onChange={v => set("title", v)} /><Field label="Subtitle" value={section.subtitle} onChange={v => set("subtitle", v)} /><RichTextField label="Description / rich text" value={section.description} onChange={v => set("description", v)} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Button text" value={section.buttonText} onChange={v => set("buttonText", v)} /><Field label="Button link" value={section.buttonLink} onChange={v => set("buttonLink", v)} /><Field label="Secondary button" value={section.secondaryButtonText} onChange={v => set("secondaryButtonText", v)} /><Field label="Secondary link" value={section.secondaryButtonLink} onChange={v => set("secondaryButtonLink", v)} /></div></div></div>{["hero", "text", "image-text", "banner", "promo", "custom"].includes(section.type) && <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 text-[13px] font-bold text-[#14203a]">Media</div><div className="grid gap-4 sm:grid-cols-2"><MediaPicker label="Desktop image" value={String(settings.media ?? "")} onChange={v => setSetting("media", v)} /><MediaPicker label="Mobile image (optional)" value={String(settings.mobileMedia ?? "")} onChange={v => setSetting("mobileMedia", v)} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Overlay opacity" value={String(settings.overlay ?? 0)} onChange={v => setSetting("overlay", Number(v) || 0)} /><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Image position</span><select value={String(settings.imagePosition ?? "right")} onChange={e => setSetting("imagePosition", e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"><option>left</option><option>right</option></select></label></div></div>}{["product-carousel", "featured-products"].includes(section.type) && <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 text-[13px] font-bold text-[#14203a]">Product source</div><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Products source</span><select value={String(settings.source ?? "collection")} onChange={e => setSetting("source", e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"><option value="manual">Manual products</option><option value="collection">Collection</option><option value="brand">Brand</option><option value="category">Category</option></select></label><Field label="Source" value={String(settings.sourceValue ?? "Best Sellers")} onChange={v => setSetting("sourceValue", v)} placeholder="e.g. Apple or Best Sellers" /><Field label="Number of products" value={String(settings.count ?? 5)} onChange={v => setSetting("count", Number(v) || 1)} /><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Display layout</span><select value={String(settings.layout ?? "carousel")} onChange={e => setSetting("layout", e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"><option value="carousel">Horizontal carousel</option><option value="grid">Product grid</option></select></label></div></div>}{["collection", "collection-grid"].includes(section.type) && <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 text-[13px] font-bold text-[#14203a]">Collection source</div><div className="grid gap-4 sm:grid-cols-3"><Field label="Collection" value={String(settings.collection ?? "iPhone")} onChange={v => setSetting("collection", v)} /><Field label="Number of products" value={String(settings.count ?? 8)} onChange={v => setSetting("count", Number(v) || 1)} /><Field label="Layout" value={String(settings.layout ?? "carousel")} onChange={v => setSetting("layout", v)} /></div></div>}{section.type === "brands" && <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 text-[13px] font-bold text-[#14203a]">Brands selection</div><div className="grid gap-2 sm:grid-cols-2">{["Apple", "Samsung", "Xiaomi", "Anker", "Spigen", "Nothing"].map(brand => { const selected = ((settings.brands as string[]) ?? []).includes(brand); return <label key={brand} className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-[11px] font-semibold text-slate-600"><input type="checkbox" checked={selected} onChange={() => setSetting("brands", selected ? ((settings.brands as string[]) ?? []).filter(x => x !== brand) : [...((settings.brands as string[]) ?? []), brand])} />{brand}</label>; })}</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Layout" value={String(settings.layout ?? "grid")} onChange={v => setSetting("layout", v)} /><Field label="Logo size" value={String(settings.logoSize ?? "medium")} onChange={v => setSetting("logoSize", v)} /></div></div>}{section.type === "categories" && <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 text-[13px] font-bold text-[#14203a]">Categories selection</div><Field label="Categories (comma separated)" value={((settings.categories as string[]) ?? []).join(", ")} onChange={v => setSetting("categories", v.split(",").map(x => x.trim()).filter(Boolean))} /><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Grid columns" value={String(settings.columns ?? 4)} onChange={v => setSetting("columns", Number(v) || 2)} /><div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3"><span className="text-[11px] font-semibold text-slate-600">Horizontal scroll on mobile</span><Toggle checked={Boolean(settings.mobileScroll)} onChange={v => setSetting("mobileScroll", v)} /></div></div></div>}{section.type === "trust" && <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 text-[13px] font-bold text-[#14203a]">Benefits</div><TrustItems section={section} update={update} /></div>}{section.type === "announcement" && <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 text-[13px] font-bold text-[#14203a]">Announcement settings</div><div className="grid gap-4 sm:grid-cols-2"><Field label="Icon name" value={String(settings.icon ?? "Zap")} onChange={v => setSetting("icon", v)} /><Field label="Link" value={String(settings.link ?? "#") } onChange={v => setSetting("link", v)} /><Field label="Background" value={String(settings.background ?? "navy")} onChange={v => setSetting("background", v)} /><Field label="Text color" value={String(settings.textColor ?? "light")} onChange={v => setSetting("textColor", v)} /></div></div>}{section.type === "countdown" && <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 text-[13px] font-bold text-[#14203a]">Countdown settings</div><div className="grid gap-4 sm:grid-cols-2"><Field label="Target date and time" value={String(settings.targetDate ?? "2026-12-01T00:00")} onChange={v => setSetting("targetDate", v)} /><Field label="Timezone label" value={String(settings.timezone ?? "Local time")} onChange={v => setSetting("timezone", v)} /></div></div>}{section.type === "video" && <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 text-[13px] font-bold text-[#14203a]">Video settings</div><Field label="Safe video URL" value={String(settings.videoUrl ?? "")} onChange={v => setSetting("videoUrl", v)} placeholder="https://video.example.com/..." /></div>}{section.type === "faq" && <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]"><div className="mb-4 text-[13px] font-bold text-[#14203a]">FAQ items</div><FaqItems section={section} update={update} /></div>}</div>; }

function HomepageSectionRenderer({ section, mode }: { section: HomepageSection; mode: DisplayMode }) { const settings = section.settings; const isDark = section.background === "navy" || section.background === "purple"; const align = section.alignment === "center" ? "text-center items-center" : section.alignment === "right" ? "text-right items-end" : "text-left items-start"; const productsToShow = products.slice(0, Number(settings.count ?? 5)); const media = String(settings.media ?? ""); if (section.type === "announcement") return <div className="bg-[#14203a] px-4 py-2 text-center text-[11px] font-semibold text-white">{section.title} <span className="ml-2 text-indigo-200">{section.buttonText}</span></div>; return <div className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 ${section.background === "mist" ? "bg-[#f4f6fb]" : section.background === "navy" ? "bg-[#14203a]" : section.background === "purple" ? "bg-gradient-to-br from-[#4a3ba6] to-[#8b54cf]" : "bg-white border border-slate-200"} ${isDark ? "text-white" : "text-[#14203a]"}`} style={{ minHeight: section.type === "hero" || section.type === "promo" ? 210 : undefined }}><div className={`relative z-10 flex max-w-2xl flex-col ${align} ${section.spacing === "spacious" ? "gap-4 py-8" : section.spacing === "compact" ? "gap-1" : "gap-2"} ${section.type === "image-text" && String(settings.imagePosition ?? "right") === "right" ? "sm:mr-[42%]" : ""}`}>{section.eyebrow && <div className={`text-[10px] font-bold uppercase tracking-[.18em] ${isDark ? "text-indigo-200" : "text-indigo-600"}`}>{section.eyebrow}</div>}<h3 className="text-[22px] font-bold tracking-[-.04em]">{section.title}</h3>{section.subtitle && <div className={`text-[12px] font-semibold ${isDark ? "text-indigo-100" : "text-slate-500"}`}>{section.subtitle}</div>}<p className={`max-w-xl text-[12px] leading-5 ${isDark ? "text-indigo-100/80" : "text-slate-500"}`}>{section.description}</p><div className="mt-2 flex flex-wrap gap-2"><button className={`rounded-lg px-3 py-2 text-[10px] font-bold ${isDark ? "bg-white text-[#25315c]" : "bg-[#5968ea] text-white"}`}>{section.buttonText || "Explore section"}</button>{section.secondaryButtonText && <button className={`rounded-lg border px-3 py-2 text-[10px] font-bold ${isDark ? "border-white/30 text-white" : "border-slate-200 text-slate-600"}`}>{section.secondaryButtonText}</button>}</div></div>{media && ["hero", "promo", "banner", "image-text"].includes(section.type) && <img src={media} alt="Section media" className={`absolute inset-y-0 h-full w-[42%] object-cover ${section.type === "image-text" && String(settings.imagePosition ?? "right") === "left" ? "left-0" : "right-0"}`} style={{ opacity: .84 }} />}{section.type === "brands" && <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">{((settings.brands as string[]) ?? []).map(brand => <div key={brand} className="rounded-xl border border-slate-200 bg-white/80 p-3 text-center text-[11px] font-bold text-slate-600">{brand}</div>)}</div>}{["product-carousel", "featured-products", "collection", "collection-grid"].includes(section.type) && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{productsToShow.map(product => <div key={product.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white"><img src={product.image} alt="" className="h-20 w-full object-cover" /><div className="p-2"><div className="truncate text-[10px] font-bold text-slate-700">{product.name}</div><div className="mt-1 text-[10px] text-slate-500">${product.price}</div></div></div>)}</div>}{section.type === "categories" && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{((settings.categories as string[]) ?? []).map(category => <div key={category} className="rounded-xl bg-[#eef0ff] p-4 text-[11px] font-bold text-indigo-700">{category}</div>)}</div>}{section.type === "trust" && <div className="mt-5 grid gap-3 sm:grid-cols-4">{((settings.items as { icon: string; title: string; description: string }[]) ?? []).map(item => <div key={item.title} className="rounded-xl border border-slate-200 bg-white/80 p-3"><div className="mb-2 grid size-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><BadgeCheck className="size-4" /></div><div className="text-[11px] font-bold text-slate-700">{item.title}</div><div className="mt-1 text-[10px] leading-4 text-slate-400">{item.description}</div></div>)}</div>}{section.type === "faq" && <div className="mt-5 space-y-2">{((settings.items as { question: string; answer: string }[]) ?? []).map(item => <div key={item.question} className="rounded-xl border border-slate-200 bg-white/70 p-3"><div className="text-[11px] font-bold text-slate-700">{item.question}</div><div className="mt-1 text-[10px] text-slate-500">{item.answer}</div></div>)}</div>}<div className="absolute right-3 top-3 rounded-full bg-black/5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider opacity-70">{mode}</div></div>; }

const CORE_HOMEPAGE_SECTION_KEYS = new Set(["hero", "brands", "featured_products", "trust"]);

function createHomepageUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function createHomepageSectionKey(type: SectionType, suffix = Date.now()) {
  const base = type.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "section";
  return `${base}_${suffix}`.slice(0, 80);
}

export default function HomepageBuilderPage() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [persistedIds, setPersistedIds] = useState<Set<string>>(new Set());
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<DisplayMode>("desktop");
  const [showAdd, setShowAdd] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selected = sections.find((section) => section.id === selectedId) ?? sections[0];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    loadDashboardHomepageWorkspace()
      .then(({ sections: liveSections, role }) => {
        if (cancelled) return;
        setSections(liveSections);
        setPersistedIds(new Set(liveSections.map((section) => section.id)));
        setSelectedId(liveSections[0]?.id ?? "");
        setCanDelete(role === "admin");
        setDirty(false);
      })
      .catch((cause) => {
        if (!cancelled) {
          toast.error(cause instanceof Error ? cause.message : "Unable to load homepage sections.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ source: string; target: string }>).detail;
      setSections((current) => {
        const from = current.findIndex((item) => item.id === detail.source);
        const to = current.findIndex((item) => item.id === detail.target);
        if (from < 0 || to < 0 || from === to) return current;
        const next = [...current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setDirty(true);
        return next.map((item, index) => ({ ...item, order: index + 1 }));
      });
    };

    window.addEventListener("homepage-reorder", handler);
    return () => window.removeEventListener("homepage-reorder", handler);
  }, []);

  const updateSelected = (patch: Partial<HomepageSection>) => {
    if (!selected) return;
    setDirty(true);
    setSections((current) =>
      current.map((section) => (section.id === selected.id ? { ...section, ...patch } : section)),
    );
  };

  const move = (id: string, direction: "up" | "down") => {
    setSections((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      setDirty(true);
      return next.map((item, position) => ({ ...item, order: position + 1 }));
    });
  };

  const addSection = (type: SectionType) => {
    const base = createSection(type, sections.length + 1);
    const item: HomepageSection = {
      ...base,
      id: createHomepageUuid(),
      sectionId: createHomepageSectionKey(type),
      status: "draft",
    };
    setSections((current) => [...current, item]);
    setSelectedId(item.id);
    setShowAdd(false);
    setDirty(true);
    toast.success(`${sectionTypeLabels[type]} added as a CMS draft.`);
  };

  const duplicate = (section: HomepageSection) => {
    const copy: HomepageSection = {
      ...section,
      id: createHomepageUuid(),
      name: `${section.name} copy`,
      sectionId: createHomepageSectionKey(
        section.sectionId.slice(0, 48).replace(/[^a-z0-9]+/gi, "_").toLowerCase() || section.type,
      ),
      order: sections.length + 1,
      status: "draft",
      settings: { ...section.settings },
    };
    setSections((current) => [...current, copy]);
    setSelectedId(copy.id);
    setDirty(true);
    toast.success("Section duplicated as a CMS draft.");
  };

  const removeFromState = (id: string) => {
    const next = sections
      .filter((item) => item.id !== id)
      .map((item, index) => ({ ...item, order: index + 1 }));
    setSections(next);
    setSelectedId(next[0]?.id ?? "");
    setDirty(true);
  };

  const deleteSection = async (id: string) => {
    if (sections.length <= 1) {
      toast.error("Keep at least one homepage section.");
      return;
    }

    const section = sections.find((item) => item.id === id);
    if (!section) return;

    if (CORE_HOMEPAGE_SECTION_KEYS.has(section.sectionId)) {
      toast.info("Core storefront sections cannot be deleted. Hide or set them to Draft instead.");
      return;
    }

    if (!persistedIds.has(id)) {
      removeFromState(id);
      toast.success("Unsaved section removed.");
      return;
    }

    if (!canDelete) {
      toast.error("Only dashboard admins can permanently delete published CMS sections.");
      return;
    }

    try {
      await deleteDashboardHomepageSection(id);
      setPersistedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      removeFromState(id);
      toast.success("Homepage section deleted from Supabase.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Deleting homepage section failed.");
    }
  };

  const persist = async (nextSections: HomepageSection[], message: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await saveDashboardHomepageSections(nextSections);
      setSections(saved);
      setPersistedIds(new Set(saved.map((section) => section.id)));
      setSelectedId((current) =>
        saved.some((section) => section.id === current) ? current : (saved[0]?.id ?? ""),
      );
      setDirty(false);
      toast.success(message);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Saving homepage sections failed.");
    } finally {
      setSaving(false);
    }
  };

  const saveChanges = () => persist(sections, "Homepage changes saved to Supabase.");

  const publishAll = async () => {
    const next = sections.map((section) => ({ ...section, status: "published" as const }));
    setSections(next);
    setDirty(true);
    await persist(next, "Homepage sections published to the live CMS.");
  };

  const visibleSections = useMemo(
    () =>
      sections.filter(
        (section) =>
          section.enabled &&
          section.showOnStorefront &&
          ((mode === "desktop" && section.showOnDesktop) ||
            (mode === "tablet" && section.showOnTablet) ||
            (mode === "mobile" && section.showOnMobile)) &&
          isSectionWithinSchedule(section),
      ),
    [sections, mode],
  );

  if (loading) {
    return (
      <div className="grid min-h-[460px] place-items-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-[#5968ea]" />
          <div className="mt-3 text-[11px] font-semibold text-slate-400">
            Loading live homepage sections…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            Store content / Live CMS
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
            Homepage section builder
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Manage homepage order, visibility and section content from the Supabase CMS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-2 text-[10px] font-bold ${
              dirty ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {dirty ? "Unsaved changes" : "Synced to Supabase"}
          </span>
          <button
            onClick={() => void saveChanges()}
            disabled={!dirty || saving}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </button>
          <button
            onClick={() => void publishAll()}
            disabled={!sections.length || saving}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Publish all
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-700"
          >
            <Plus className="size-4" /> Add section
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe2ff] bg-[#f5f6ff] px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#5962b8]">
          <Check className="size-4" />
          Save writes to cms_sections. Published and visible sections are served through public-cms.
        </div>
        <button
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#14203a] px-3 py-2 text-[10px] font-bold text-white"
        >
          <Monitor className="size-3.5" /> Draft preview
        </button>
      </div>

      {!sections.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="text-sm font-bold text-slate-600">No homepage CMS sections found.</div>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"
          >
            <Plus className="size-4" /> Add first section
          </button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                selected={selected?.id === section.id}
                onSelect={() => setSelectedId(section.id)}
                onToggle={() => {
                  setDirty(true);
                  setSections((current) =>
                    current.map((item) =>
                      item.id === section.id ? { ...item, enabled: !item.enabled } : item,
                    ),
                  );
                }}
                onDuplicate={() => duplicate(section)}
                onDelete={() => void deleteSection(section.id)}
                onMove={(direction) => move(section.id, direction)}
              />
            ))}
          </div>
          <div>
            {selected ? (
              <Editor section={selected} update={updateSelected} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">
                Select a section to edit it.
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/40 p-4 sm:p-8"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="mx-auto max-w-4xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="text-xl font-bold tracking-[-.04em] text-[#14203a]">
                  Add homepage section
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  New sections start as Draft and are saved to Supabase only after Save changes.
                </div>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="grid size-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-50"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(sectionTypeLabels) as SectionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => addSection(type)}
                  className="group rounded-2xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/30"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Layers3 className="size-4" />
                    </div>
                    <Plus className="size-4 text-slate-300 group-hover:text-indigo-500" />
                  </div>
                  <div className="text-[12px] font-bold text-slate-700">{sectionTypeLabels[type]}</div>
                  <div className="mt-1 text-[10px] leading-4 text-slate-400">
                    {sectionTypeDescriptions[type]}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {previewOpen && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/50 p-3 sm:p-8"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="mx-auto min-h-full max-w-6xl rounded-3xl bg-[#f7f9fc] p-4 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-[#14203a]">Draft Preview</div>
                <div className="text-[11px] text-slate-400">
                  Preview reflects the current unsaved editor state and device visibility rules.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                  {[
                    ["desktop", Monitor],
                    ["tablet", Tablet],
                    ["mobile", Smartphone],
                  ].map(([value, Icon]) => (
                    <button
                      key={String(value)}
                      onClick={() => setMode(value as DisplayMode)}
                      className={`grid size-8 place-items-center rounded-lg ${
                        mode === value ? "bg-indigo-50 text-indigo-600" : "text-slate-400"
                      }`}
                    >
                      <Icon className="size-4" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div
              className={`${
                mode === "mobile"
                  ? "mx-auto max-w-[390px]"
                  : mode === "tablet"
                    ? "mx-auto max-w-[760px]"
                    : ""
              } space-y-3`}
            >
              {visibleSections.map((section) => (
                <HomepageSectionRenderer key={section.id} section={section} mode={mode} />
              ))}
              {!visibleSections.length && (
                <div className="rounded-2xl bg-white p-16 text-center text-sm text-slate-400">
                  No visible sections for this mode.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
