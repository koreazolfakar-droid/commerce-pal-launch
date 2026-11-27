import { confirmDashboardDiscard } from "@/dashboard/lib/unsavedChanges";
import { useLanguage } from "@/dashboard/i18n";
import { useDashboardUnsavedChanges } from "@/dashboard/hooks/useDashboardUnsavedChanges";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Check,
  ChevronDown,
  CreditCard,
  Copy,
  GripVertical,
  Layers3,
  Loader2,
  Monitor,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  listDashboardBrands,
  listDashboardProducts,
  type DashboardBrand,
  type DashboardProduct,
} from "@/dashboard/data/catalog";
import { loadHomepagePreviewProducts, type PreviewProduct } from "@/dashboard/data/homepagePreview";
import {
  createSection,
  isSectionWithinSchedule,
  sectionTypeDescriptions,
  sectionTypeLabels,
  type DisplayMode,
  type HomepageSection,
  type SectionType,
} from "@/dashboard/data/homepageSections";
import {
  deleteDashboardHomepageSection,
  loadDashboardHomepageWorkspace,
  saveDashboardHomepageSections,
} from "@/dashboard/data/homepage";
import { DashboardMediaPicker } from "@/dashboard/components/DashboardMediaPicker";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#5968ea]" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${checked ? "start-6" : "start-1"}`}
      />
    </button>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t } = useLanguage();
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{t(label)}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10"
      />
    </label>
  );
}
function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{t(label)}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[12px] outline-none focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10"
      />
    </label>
  );
}
function RichTextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (before: string, after = before) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || "your text";
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{t(label)}</span>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-[#6974eb] focus-within:ring-4 focus-within:ring-[#6974eb]/10">
        <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50 p-2">
          <button
            type="button"
            onClick={() => wrap("**")}
            className="rounded-md px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => wrap("_")}
            className="rounded-md px-2 py-1 text-[10px] italic text-slate-600 hover:bg-white"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => wrap("## ", "")}
            className="rounded-md px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => wrap("- ", "")}
            className="rounded-md px-2 py-1 text-[10px] text-slate-600 hover:bg-white"
          >
            {t("List")}
          </button>
          <button
            type="button"
            onClick={() => wrap("[", "](https://)")}
            className="rounded-md px-2 py-1 text-[10px] text-slate-600 hover:bg-white"
          >
            {t("Link")}
          </button>
          <span className="ml-auto px-2 py-1 text-[9px] text-slate-400">
            {t("Safe rich text markers only")}
          </span>
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className="w-full resize-none border-0 p-3 text-[12px] outline-none"
        />
      </div>
    </div>
  );
}

function SectionCard({
  section,
  selected,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete,
  onMove,
}: {
  section: HomepageSection;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const { t } = useLanguage();
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("section-id", section.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const source = e.dataTransfer.getData("section-id");
        window.dispatchEvent(
          new CustomEvent("homepage-reorder", {
            detail: { source, target: section.id },
          }),
        );
      }}
      className={`group rounded-2xl border bg-white p-3 shadow-[0_8px_24px_rgba(33,47,82,.04)] transition ${selected ? "border-[#6874f5] ring-4 ring-[#6874f5]/10" : "border-slate-200/80 hover:border-slate-300"} ${!section.enabled ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 cursor-grab text-slate-300">
          <GripVertical className="size-4" />
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Layers3 className="size-4" />
        </div>
        <button onClick={onSelect} className="min-w-0 flex-1 text-start">
          <div className="truncate text-[12px] font-bold text-slate-700">{section.name}</div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
            <span>{sectionTypeLabels[section.type]}</span>
            <span>·</span>
            <span>#{section.order}</span>
            {section.status === "published" && (
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-600">
                {t("Published")}
              </span>
            )}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            title={t("Move up")}
            onClick={() => onMove("up")}
            className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
          >
            <ArrowUp className="size-3.5" />
          </button>
          <button
            title={t("Move down")}
            onClick={() => onMove("down")}
            className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
          >
            <ArrowDown className="size-3.5" />
          </button>
          <button
            title={t("Duplicate")}
            onClick={onDuplicate}
            className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            title={t("Delete")}
            onClick={onDelete}
            className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[10px] font-semibold text-slate-400">
          {section.enabled ? t("Visible in preview") : t("Hidden from preview")}
        </span>
        <Toggle checked={section.enabled} onChange={onToggle} />
      </div>
    </div>
  );
}

function TrustItems({
  section,
  update,
}: {
  section: HomepageSection;
  update: (patch: Partial<HomepageSection>) => void;
}) {
  const { t } = useLanguage();
  const items =
    (section.settings.items as {
      icon: string;
      title: string;
      description: string;
    }[]) ?? [];
  const setItems = (next: typeof items) =>
    update({ settings: { ...section.settings, items: next } });
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="rounded-xl border border-slate-200 p-3">
          <div className="grid gap-2 sm:grid-cols-[100px_1fr_1fr_32px]">
            <input
              value={item.icon}
              onChange={(e) =>
                setItems(items.map((x, i) => (i === index ? { ...x, icon: e.target.value } : x)))
              }
              className="h-9 rounded-lg border border-slate-200 px-2 text-[11px]"
              placeholder={t("Icon")}
            />
            <input
              value={item.title}
              onChange={(e) =>
                setItems(items.map((x, i) => (i === index ? { ...x, title: e.target.value } : x)))
              }
              className="h-9 rounded-lg border border-slate-200 px-2 text-[11px]"
              placeholder={t("Title")}
            />
            <input
              value={item.description}
              onChange={(e) =>
                setItems(
                  items.map((x, i) => (i === index ? { ...x, description: e.target.value } : x)),
                )
              }
              className="h-9 rounded-lg border border-slate-200 px-2 text-[11px]"
              placeholder={t("Description")}
            />
            <button
              onClick={() => setItems(items.filter((_, i) => i !== index))}
              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() =>
          setItems([
            ...items,
            {
              icon: "Zap",
              title: "New benefit",
              description: "Describe this customer benefit.",
            },
          ])
        }
        className="flex items-center gap-1 text-[11px] font-bold text-[#5968ea]"
      >
        <Plus className="size-3.5" /> {t("Add item")}
      </button>
    </div>
  );
}
function FaqItems({
  section,
  update,
}: {
  section: HomepageSection;
  update: (patch: Partial<HomepageSection>) => void;
}) {
  const { t } = useLanguage();
  const items = (section.settings.items as { question: string; answer: string }[]) ?? [];
  const setItems = (next: typeof items) =>
    update({ settings: { ...section.settings, items: next } });
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${item.question}-${index}`} className="rounded-xl border border-slate-200 p-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <input
                value={item.question}
                onChange={(e) =>
                  setItems(
                    items.map((x, i) => (i === index ? { ...x, question: e.target.value } : x)),
                  )
                }
                className="h-9 w-full rounded-lg border border-slate-200 px-2 text-[11px]"
                placeholder={t("Question")}
              />
              <textarea
                value={item.answer}
                onChange={(e) =>
                  setItems(
                    items.map((x, i) => (i === index ? { ...x, answer: e.target.value } : x)),
                  )
                }
                rows={2}
                className="w-full rounded-lg border border-slate-200 p-2 text-[11px]"
                placeholder={t("Answer")}
              />
            </div>
            <button
              onClick={() => setItems(items.filter((_, i) => i !== index))}
              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() =>
          setItems([...items, { question: "New question", answer: "Add a helpful answer." }])
        }
        className="flex items-center gap-1 text-[11px] font-bold text-[#5968ea]"
      >
        <Plus className="size-3.5" /> {t("Add FAQ")}
      </button>
    </div>
  );
}

function ManualProductPicker({
  products,
  selectedIds,
  onChange,
}: {
  products: DashboardProduct[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const ids = [...new Set(selectedIds)].slice(0, 10);
  const byId = new Map(products.map((product) => [product.id, product]));
  const selectedProducts = ids
    .map((id) => byId.get(id))
    .filter((product): product is DashboardProduct => Boolean(product));
  const normalizedQuery = query.trim().toLowerCase();
  const available =
    ids.length >= 10
      ? []
      : products
          .filter((product) => product.status === "Active" && !ids.includes(product.id))
          .filter((product) => {
            if (!normalizedQuery) return true;
            return [product.name, product.brand, product.category, product.sku]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);
          })
          .slice(0, 8);

  const reorder = (from: number, to: number) => {
    if (from < 0 || to < 0 || from >= ids.length || to >= ids.length || from === to) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const move = (index: number, direction: -1 | 1) => {
    reorder(index, index + direction);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
        <div className="text-[11px] font-bold text-indigo-700">
          {t("Manual order · the first product here is the first product customers see.")}
        </div>
        <div className="mt-0.5 text-[10px] text-indigo-500">
          {t(
            "Drag to reorder on desktop, or use ↑ ↓ on mobile. You can add up to 10 active products.",
          )}
        </div>
      </div>

      {selectedProducts.length ? (
        <div className="space-y-2">
          {selectedProducts.map((product, index) => (
            <div
              key={product.id}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("manual-product-id", product.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = event.dataTransfer.getData("manual-product-id");
                reorder(ids.indexOf(sourceId), ids.indexOf(product.id));
              }}
              className="flex cursor-grab items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 active:cursor-grabbing"
            >
              <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500">
                {index + 1}
              </div>
              {product.image ? (
                <img
                  src={product.image}
                  alt=""
                  className="size-10 shrink-0 rounded-lg border border-slate-100 object-contain"
                />
              ) : (
                <div className="size-10 shrink-0 rounded-lg bg-slate-50" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-bold text-slate-700">{product.name}</div>
                <div className="truncate text-[9px] text-slate-400">
                  {[product.brand, product.category].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button
                type="button"
                title={t("Move up")}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-25"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                title={t("Move down")}
                disabled={index === selectedProducts.length - 1}
                onClick={() => move(index, 1)}
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-25"
              >
                <ArrowDown className="size-3.5" />
              </button>
              <button
                type="button"
                title={t("Remove")}
                onClick={() => onChange(ids.filter((id) => id !== product.id))}
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-[11px] text-slate-400">
          {t("No products selected yet. Search below and tap Add.")}
        </div>
      )}

      <div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("Search product name, brand, category or SKU…")}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10"
        />
        {ids.length >= 10 ? (
          <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-700">
            {t("Product limit reached. Remove one product before adding another.")}
          </div>
        ) : null}
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {available.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onChange([...ids, product.id]);
                setQuery("");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-start hover:bg-slate-50"
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt=""
                  className="size-9 shrink-0 rounded-lg border border-slate-100 object-contain"
                />
              ) : (
                <div className="size-9 shrink-0 rounded-lg bg-slate-50" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold text-slate-700">
                  {product.name}
                </div>
                <div className="truncate text-[9px] text-slate-400">
                  {[product.brand, product.category, product.sku].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[9px] font-bold text-indigo-600">
                {t("Add")}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Editor({
  section,
  update,
  brands,
  products,
  productsReady,
}: {
  brands: DashboardBrand[];
  products: DashboardProduct[];
  productsReady: boolean;
  section: HomepageSection;
  update: (patch: Partial<HomepageSection>) => void;
}) {
  const { t } = useLanguage();
  const set = (key: keyof HomepageSection, value: unknown) => update({ [key]: value });
  const settings = section.settings;
  const setSetting = (key: string, value: unknown) =>
    update({ settings: { ...settings, [key]: value } });
  const productSource = String(
    settings.source ?? (section.sectionId === "featured_products" ? "best_sellers" : "collection"),
  );
  const manualProductIds = Array.isArray(settings.manualProductIds)
    ? settings.manualProductIds.filter((id): id is string => typeof id === "string")
    : String(settings.sourceValue ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold text-[#14203a]">{t("Section settings")}</div>
            <div className="mt-1 text-[11px] text-slate-400">
              {t("Common fields shared by every section type.")}
            </div>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600">
            {sectionTypeLabels[section.type]}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Internal name")} value={section.name} onChange={(v) => set("name", v)} />
          {["hero", "categories", "brands", "featured_products", "trust"].includes(
            section.sectionId,
          ) ? (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                {t("Section ID")}
              </span>
              <input
                value={section.sectionId}
                readOnly
                className="h-10 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-500 outline-none"
              />
              <span className="mt-1 block text-[9px] text-slate-400">
                {t("Core storefront key — locked for safety.")}
              </span>
            </label>
          ) : (
            <Field
              label={t("Section ID")}
              value={section.sectionId}
              onChange={(v) => set("sectionId", v)}
            />
          )}
          <Field
            label={t("Display order")}
            value={String(section.order)}
            onChange={(v) => set("order", Number(v) || 1)}
          />
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{t("Status")}</span>
            <select
              value={section.status}
              onChange={(e) => set("status", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none"
            >
              <option value="draft">{t("Draft")}</option>
              <option value="published">{t("Published")}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
              {t("Background style")}
            </span>
            <select
              value={section.background}
              onChange={(e) => set("background", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none"
            >
              <option value="surface">{t("White surface")}</option>
              <option value="mist">{t("Soft gray")}</option>
              <option value="navy">{t("Dark navy")}</option>
              <option value="purple">{t("Purple campaign")}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
              {t("Text alignment")}
            </span>
            <select
              value={section.alignment}
              onChange={(e) => set("alignment", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none"
            >
              <option value="left">{t("Left")}</option>
              <option value="center">{t("Center")}</option>
              <option value="right">{t("Right")}</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            ["showOnStorefront", "Show on storefront"],
            ["showOnDesktop", "Show on desktop"],
            ["showOnTablet", "Show on tablet"],
            ["showOnMobile", "Show on mobile"],
          ].map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
            >
              <span className="text-[11px] font-semibold text-slate-600">{t(label)}</span>
              <Toggle
                checked={Boolean(section[key as keyof HomepageSection])}
                onChange={(v) => set(key as keyof HomepageSection, v)}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label={t("Start date (optional)")}
            value={section.startDate}
            onChange={(v) => set("startDate", v)}
            placeholder="2026-11-27"
          />
          <Field
            label={t("End date (optional)")}
            value={section.endDate}
            onChange={(v) => set("endDate", v)}
            placeholder="2026-12-01"
          />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
        <div className="mb-4 text-[13px] font-bold text-[#14203a]">{t("Content and CTAs")}</div>
        <div className="space-y-4">
          <Field
            label={t("Small label / eyebrow")}
            value={section.eyebrow}
            onChange={(v) => set("eyebrow", v)}
          />
          <Field label={t("Title")} value={section.title} onChange={(v) => set("title", v)} />
          <Field
            label={t("Subtitle")}
            value={section.subtitle}
            onChange={(v) => set("subtitle", v)}
          />
          <RichTextField
            label={t("Description / rich text")}
            value={section.description}
            onChange={(v) => set("description", v)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("Button text")}
              value={section.buttonText}
              onChange={(v) => set("buttonText", v)}
            />
            <Field
              label={t("Button link")}
              value={section.buttonLink}
              onChange={(v) => set("buttonLink", v)}
            />
            <Field
              label={t("Secondary button")}
              value={section.secondaryButtonText}
              onChange={(v) => set("secondaryButtonText", v)}
            />
            <Field
              label={t("Secondary link")}
              value={section.secondaryButtonLink}
              onChange={(v) => set("secondaryButtonLink", v)}
            />
          </div>
        </div>
      </div>
      {["hero", "text", "image-text", "banner", "promo", "custom"].includes(section.type) && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="mb-4 text-[13px] font-bold text-[#14203a]">{t("Media")}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DashboardMediaPicker
              label={t("Desktop image")}
              value={String(settings.media ?? "")}
              onChange={(v) => setSetting("media", v)}
            />
            <DashboardMediaPicker
              label={t("Mobile image (optional)")}
              value={String(settings.mobileMedia ?? "")}
              onChange={(v) => setSetting("mobileMedia", v)}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label={t("Overlay opacity")}
              value={String(settings.overlay ?? 0)}
              onChange={(v) => setSetting("overlay", Number(v) || 0)}
            />
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                {t("Image position")}
              </span>
              <select
                value={String(settings.imagePosition ?? "right")}
                onChange={(e) => setSetting("imagePosition", e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
              >
                <option value="left">{t("left")}</option>
                <option value="right">{t("right")}</option>
              </select>
            </label>
          </div>
        </div>
      )}
      {["product-carousel", "featured-products"].includes(section.type) && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="mb-1 text-[13px] font-bold text-[#14203a]">{t("Products and order")}</div>
          <div className="mb-4 text-[10px] text-slate-400">
            {t(
              "Choose an automatic source or take full manual control of exactly what appears first.",
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                {t("Products source")}
              </span>
              <select
                value={productSource}
                onChange={(e) => update({ settings: { ...settings, source: e.target.value } })}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
              >
                <option value="best_sellers">{t("Automatic · Best sellers")}</option>
                <option value="newest">{t("Automatic · Newest products")}</option>
                <option value="manual">{t("Manual · I choose and order products")}</option>
                <option value="collection">{t("Collection")}</option>
                <option value="brand">{t("Brand")}</option>
                <option value="category">{t("Category")}</option>
              </select>
            </label>

            {productSource === "best_sellers" || productSource === "newest" ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                <div className="text-[11px] font-bold text-emerald-700">{t("Automatic mode")}</div>
                <div className="mt-0.5 text-[10px] leading-4 text-emerald-600">
                  {productSource === "best_sellers"
                    ? t("Uses products marked Best Seller and keeps their storefront sort order.")
                    : t("Uses the newest active products automatically.")}
                </div>
              </div>
            ) : productSource !== "manual" ? (
              <Field
                label={t("Source")}
                value={String(settings.sourceValue ?? "")}
                onChange={(v) => setSetting("sourceValue", v)}
                placeholder={t("Collection, brand or category name / slug")}
              />
            ) : null}

            {productSource === "manual" ? (
              <div className="sm:col-span-2">
                {productsReady ? (
                  <ManualProductPicker
                    products={products}
                    selectedIds={manualProductIds}
                    onChange={(ids) =>
                      update({
                        settings: {
                          ...settings,
                          source: "manual",
                          manualProductIds: ids,
                          sourceValue: ids.join(","),
                          count: ids.length,
                        },
                      })
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-[11px] font-semibold text-slate-500">
                    <Loader2 className="size-4 animate-spin text-indigo-500" />
                    {t("Loading products only when you need manual ordering…")}
                  </div>
                )}
              </div>
            ) : null}

            {productSource !== "manual" ? (
              <Field
                label={t("Number of products")}
                value={String(settings.count ?? 5)}
                onChange={(v) => setSetting("count", Number(v) || 1)}
              />
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                {t("Display layout")}
              </span>
              <select
                value={String(settings.layout ?? "carousel")}
                onChange={(e) => setSetting("layout", e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px]"
              >
                <option value="carousel">{t("Horizontal carousel")}</option>
                <option value="grid">{t("Product grid")}</option>
              </select>
            </label>
          </div>
        </div>
      )}
      {["collection", "collection-grid"].includes(section.type) && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="mb-4 text-[13px] font-bold text-[#14203a]">{t("Collection source")}</div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label={t("Collection")}
              value={String(settings.collection ?? "")}
              onChange={(v) => setSetting("collection", v)}
            />
            <Field
              label={t("Number of products")}
              value={String(settings.count ?? 8)}
              onChange={(v) => setSetting("count", Number(v) || 1)}
            />
            <Field
              label={t("Layout")}
              value={String(settings.layout ?? "carousel")}
              onChange={(v) => setSetting("layout", v)}
            />
          </div>
        </div>
      )}
      {section.type === "brands" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="mb-4 text-[13px] font-bold text-[#14203a]">{t("Brands selection")}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {brands
              .map((item) => item.name)
              .map((brand) => {
                const selected = ((settings.brands as string[]) ?? []).includes(brand);
                return (
                  <label
                    key={brand}
                    className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-[11px] font-semibold text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() =>
                        setSetting(
                          "brands",
                          selected
                            ? ((settings.brands as string[]) ?? []).filter((x) => x !== brand)
                            : [...((settings.brands as string[]) ?? []), brand],
                        )
                      }
                    />
                    {brand}
                  </label>
                );
              })}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label={t("Layout")}
              value={String(settings.layout ?? "grid")}
              onChange={(v) => setSetting("layout", v)}
            />
            <Field
              label={t("Logo size")}
              value={String(settings.logoSize ?? "medium")}
              onChange={(v) => setSetting("logoSize", v)}
            />
          </div>
        </div>
      )}
      {section.type === "categories" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="mb-4 text-[13px] font-bold text-[#14203a]">
            {t("Categories selection")}
          </div>
          <Field
            label={t("Categories (comma separated)")}
            value={((settings.categories as string[]) ?? []).join(", ")}
            onChange={(v) =>
              setSetting(
                "categories",
                v
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              )
            }
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label={t("Grid columns")}
              value={String(settings.columns ?? 4)}
              onChange={(v) => setSetting("columns", Number(v) || 2)}
            />
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3">
              <span className="text-[11px] font-semibold text-slate-600">
                {t("Horizontal scroll on mobile")}
              </span>
              <Toggle
                checked={Boolean(settings.mobileScroll)}
                onChange={(v) => setSetting("mobileScroll", v)}
              />
            </div>
          </div>
        </div>
      )}
      {section.type === "trust" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="mb-4 text-[13px] font-bold text-[#14203a]">{t("Benefits")}</div>
          <TrustItems section={section} update={update} />
        </div>
      )}
      {section.type === "announcement" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="mb-4 text-[13px] font-bold text-[#14203a]">
            {t("Announcement settings")}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("Icon name")}
              value={String(settings.icon ?? "Zap")}
              onChange={(v) => setSetting("icon", v)}
            />
            <Field
              label={t("Link")}
              value={String(settings.link ?? "#")}
              onChange={(v) => setSetting("link", v)}
            />
            <Field
              label={t("Background")}
              value={String(settings.background ?? "navy")}
              onChange={(v) => setSetting("background", v)}
            />
            <Field
              label={t("Text color")}
              value={String(settings.textColor ?? "light")}
              onChange={(v) => setSetting("textColor", v)}
            />
          </div>
        </div>
      )}
      {section.type === "countdown" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="mb-4 text-[13px] font-bold text-[#14203a]">{t("Countdown settings")}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("Target date and time")}
              value={String(settings.targetDate ?? "")}
              onChange={(v) => setSetting("targetDate", v)}
            />
            <Field
              label={t("Timezone label")}
              value={String(settings.timezone ?? "Local time")}
              onChange={(v) => setSetting("timezone", v)}
            />
          </div>
        </div>
      )}
      {section.type === "video" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="mb-4 text-[13px] font-bold text-[#14203a]">{t("Video settings")}</div>
          <Field
            label={t("Safe video URL")}
            value={String(settings.videoUrl ?? "")}
            onChange={(v) => setSetting("videoUrl", v)}
            placeholder={t("https://video.example.com/...")}
          />
        </div>
      )}
      {section.type === "faq" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          <div className="mb-4 text-[13px] font-bold text-[#14203a]">{t("FAQ items")}</div>
          <FaqItems section={section} update={update} />
        </div>
      )}
    </div>
  );
}

function HomepageSectionRenderer({
  section,
  mode,
}: {
  section: HomepageSection;
  mode: DisplayMode;
}) {
  const { t } = useLanguage();
  const settings = section.settings;
  const isDark = section.background === "navy" || section.background === "purple";
  const align =
    section.alignment === "center"
      ? "text-center items-center"
      : section.alignment === "right"
        ? "text-end items-end"
        : "text-start items-start";
  const [productsToShow, setProductsToShow] = useState<PreviewProduct[]>([]);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const productSection = [
    "product-carousel",
    "featured-products",
    "collection",
    "collection-grid",
  ].includes(section.type);
  useEffect(() => {
    if (!productSection) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError("");
    setProductsToShow([]);
    loadHomepagePreviewProducts(section)
      .then((rows) => {
        if (!cancelled) setProductsToShow(rows);
      })
      .catch(() => {
        if (!cancelled)
          setPreviewError("Unable to load products. Close and reopen the preview to retry.");
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [section, productSection]);
  const media = String(settings.media ?? "");
  if (section.type === "announcement")
    return (
      <div className="bg-[#14203a] px-4 py-2 text-center text-[11px] font-semibold text-white">
        {section.title} <span className="ms-2 text-indigo-200">{section.buttonText}</span>
      </div>
    );
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 ${section.background === "mist" ? "bg-[#f4f6fb]" : section.background === "navy" ? "bg-[#14203a]" : section.background === "purple" ? "bg-gradient-to-br from-[#4a3ba6] to-[#8b54cf]" : "bg-white border border-slate-200"} ${isDark ? "text-white" : "text-[#14203a]"}`}
      style={{
        minHeight: section.type === "hero" || section.type === "promo" ? 210 : undefined,
      }}
    >
      <div
        className={`relative z-10 flex max-w-2xl flex-col ${align} ${section.spacing === "spacious" ? "gap-4 py-8" : section.spacing === "compact" ? "gap-1" : "gap-2"} ${section.type === "image-text" && String(settings.imagePosition ?? "right") === "right" ? "sm:me-[42%]" : ""}`}
      >
        {section.eyebrow && (
          <div
            className={`text-[10px] font-bold uppercase tracking-[.18em] ${isDark ? "text-indigo-200" : "text-indigo-600"}`}
          >
            {section.eyebrow}
          </div>
        )}
        <h3 className="text-[22px] font-bold tracking-[-.04em]">{section.title}</h3>
        {section.subtitle && (
          <div
            className={`text-[12px] font-semibold ${isDark ? "text-indigo-100" : "text-slate-500"}`}
          >
            {section.subtitle}
          </div>
        )}
        <p
          className={`max-w-xl text-[12px] leading-5 ${isDark ? "text-indigo-100/80" : "text-slate-500"}`}
        >
          {section.description}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            className={`rounded-lg px-3 py-2 text-[10px] font-bold ${isDark ? "bg-white text-[#25315c]" : "bg-[#5968ea] text-white"}`}
          >
            {section.buttonText || t("Explore section")}
          </button>
          {section.secondaryButtonText && (
            <button
              className={`rounded-lg border px-3 py-2 text-[10px] font-bold ${isDark ? "border-white/30 text-white" : "border-slate-200 text-slate-600"}`}
            >
              {section.secondaryButtonText}
            </button>
          )}
        </div>
      </div>
      {media && ["hero", "promo", "banner", "image-text"].includes(section.type) && (
        <img
          src={media}
          alt="Section media"
          className={`absolute inset-y-0 h-full w-[42%] object-cover ${section.type === "image-text" && String(settings.imagePosition ?? "right") === "left" ? "start-0" : "end-0"}`}
          style={{ opacity: 0.84 }}
        />
      )}
      {section.type === "brands" && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {((settings.brands as string[]) ?? []).map((brand) => (
            <div
              key={brand}
              className="rounded-xl border border-slate-200 bg-white/80 p-3 text-center text-[11px] font-bold text-slate-600"
            >
              {brand}
            </div>
          ))}
        </div>
      )}
      {["product-carousel", "featured-products", "collection", "collection-grid"].includes(
        section.type,
      ) && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {previewLoading ? (
            <p role="status">{t("Loading products…")}</p>
          ) : previewError ? (
            <p role="alert">{previewError}</p>
          ) : !productsToShow.length ? (
            <p>{t("No matching active products. Choose an existing source.")}</p>
          ) : (
            productsToShow.map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-20 w-full object-contain"
                  />
                ) : (
                  <div className="h-20 p-3 text-xs text-slate-400">{t("No image")}</div>
                )}
                <div className="p-2">
                  <div className="truncate text-[10px] font-bold text-slate-700">
                    {product.name}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {product.currency} {product.price}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {section.type === "categories" && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {((settings.categories as string[]) ?? []).map((category) => (
            <div
              key={category}
              className="rounded-xl bg-[#eef0ff] p-4 text-[11px] font-bold text-indigo-700"
            >
              {category}
            </div>
          ))}
        </div>
      )}
      {section.type === "trust" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {(
            (settings.items as {
              icon: string;
              title: string;
              description: string;
            }[]) ?? []
          ).map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <div className="mb-2 grid size-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <BadgeCheck className="size-4" />
              </div>
              <div className="text-[11px] font-bold text-slate-700">{item.title}</div>
              <div className="mt-1 text-[10px] leading-4 text-slate-400">{item.description}</div>
            </div>
          ))}
        </div>
      )}
      {section.type === "faq" && (
        <div className="mt-5 space-y-2">
          {((settings.items as { question: string; answer: string }[]) ?? []).map((item) => (
            <div key={item.question} className="rounded-xl border border-slate-200 bg-white/70 p-3">
              <div className="text-[11px] font-bold text-slate-700">{item.question}</div>
              <div className="mt-1 text-[10px] text-slate-500">{item.answer}</div>
            </div>
          ))}
        </div>
      )}
      <div className="absolute end-3 top-3 rounded-full bg-black/5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider opacity-70">
        {mode}
      </div>
    </div>
  );
}

const CORE_HOMEPAGE_SECTION_KEYS = new Set([
  "hero",
  "categories",
  "brands",
  "featured_products",
  "trust",
]);

function createHomepageUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function createHomepageSectionKey(type: string, suffix = Date.now()) {
  const base = type.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "section";
  return `${base}_${suffix}`.slice(0, 80);
}

export default function HomepageBuilderPage() {
  const { t, lang } = useLanguage();
  const [brands, setBrands] = useState<DashboardBrand[]>([]);
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [productsReady, setProductsReady] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [persistedIds, setPersistedIds] = useState<Set<string>>(new Set());
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const mutationLock = useRef(false);
  const [dirty, setDirty] = useState(false);
  useDashboardUnsavedChanges(dirty);
  const [mode, setMode] = useState<DisplayMode>("desktop");
  const [showAdd, setShowAdd] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selected = sections.find((section) => section.id === selectedId) ?? sections[0];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    setLoadError("");
    Promise.all([loadDashboardHomepageWorkspace(), listDashboardBrands()])
      .then(([{ sections: liveSections, role }, liveBrands]) => {
        if (cancelled) return;
        setBrands(liveBrands);
        setSections(liveSections);
        setPersistedIds(new Set(liveSections.map((section) => section.id)));
        setSelectedId(liveSections[0]?.id ?? "");
        setCanDelete(role === "admin");
        setDirty(false);
      })
      .catch((cause) => {
        if (!cancelled) {
          setLoadError("Unable to load homepage. Check your connection and retry.");
          toast.error(cause instanceof Error ? cause.message : "Unable to load homepage sections.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reload]);

  const selectedProductSource = selected
    ? String(
        selected.settings.source ??
          (selected.sectionId === "featured_products" ? "best_sellers" : "collection"),
      )
    : "";
  const needsManualProducts =
    Boolean(selected) &&
    ["product-carousel", "featured-products"].includes(selected.type) &&
    selectedProductSource === "manual";

  useEffect(() => {
    if (!needsManualProducts || productsReady) return;

    let cancelled = false;
    setProductsLoading(true);
    setProductsError("");
    listDashboardProducts()
      .then((liveProducts) => {
        if (!cancelled) {
          setProducts(liveProducts);
          setProductsReady(true);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          const message = cause instanceof Error ? cause.message : "Unable to load products.";
          setProductsError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setProductsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [needsManualProducts, productsReady]);

  const retryProducts = async () => {
    if (productsLoading) return;
    setProductsLoading(true);
    setProductsError("");
    try {
      const liveProducts = await listDashboardProducts();
      setProducts(liveProducts);
      setProductsReady(true);
    } catch (cause) {
      setProductsError(cause instanceof Error ? cause.message : "Unable to load products.");
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    const handler = (event: Event) => {
      if (mutationLock.current) return;
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
    if (!selected || mutationLock.current) return;
    setDirty(true);
    setSections((current) =>
      current.map((section) => (section.id === selected.id ? { ...section, ...patch } : section)),
    );
  };

  const move = (id: string, direction: "up" | "down") => {
    if (mutationLock.current) return;
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
    if (mutationLock.current) return;
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
    toast.success(
      `${sectionTypeLabels[type]} added as an unsaved draft. Save changes to persist it.`,
    );
  };

  const duplicate = (section: HomepageSection) => {
    if (mutationLock.current) return;
    const copy: HomepageSection = {
      ...section,
      id: createHomepageUuid(),
      name: `${section.name} copy`,
      sectionId: createHomepageSectionKey(
        section.sectionId
          .slice(0, 48)
          .replace(/[^a-z0-9]+/gi, "_")
          .toLowerCase() || section.type,
      ),
      order: sections.length + 1,
      status: "draft",
      settings: { ...section.settings },
    };
    setSections((current) => [...current, copy]);
    setSelectedId(copy.id);
    setDirty(true);
    toast.success("Section duplicated locally. Save changes to persist it.");
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
    if (mutationLock.current) return;
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

    if (!window.confirm(
      lang === "ar"
        ? `حذف القسم «${section.name}» نهائيًا؟`
        : `Permanently delete “${section.name}”?`,
    )) return;
    mutationLock.current = true;
    setSaving(true);
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
    } finally {
      mutationLock.current = false;
      setSaving(false);
    }
  };

  const persist = async (nextSections: HomepageSection[], message: string) => {
    if (mutationLock.current) return;
    mutationLock.current = true;
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
      mutationLock.current = false;
      setSaving(false);
    }
  };

  const saveChanges = () => persist(sections, "Homepage changes saved to Supabase.");

  const publishAll = async () => {
    if (mutationLock.current) return;
    const next = sections.map((section) => ({
      ...section,
      status: "published" as const,
    }));
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

  if (loadError)
    return (
      <div role="alert" className="rounded-2xl border border-border bg-card p-6 text-foreground">
        <p>{loadError}</p>
        <button
          className="mt-4 rounded-xl border px-4 py-2"
          onClick={() => {
            if (confirmDashboardDiscard()) setReload((n) => n + 1);
          }}
        >
          {t("Retry")}
        </button>
      </div>
    );

  if (loading) {
    return (
      <div role="status" aria-busy="true" className="grid min-h-[460px] place-items-center rounded-2xl border border-border bg-card">
        <div className="text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-[#5968ea]" />
          <div className="mt-3 text-[11px] font-semibold text-slate-400">
            {t("Loading live homepage sections…")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <fieldset disabled={saving} aria-busy={saving} className="m-0 min-w-0 border-0 p-0">
      <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            {t("Store content / Live CMS")}
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">
            {t("Homepage section builder")}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            {t("Manage homepage order, visibility and section content from the Supabase CMS.")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-2 text-[10px] font-bold ${
              dirty ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {saving ? t("Saving…") : dirty ? t("Unsaved changes") : t("Synced to Supabase")}
          </span>
          <button
            onClick={() => void saveChanges()}
            disabled={!dirty || saving}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
            {t("Save changes")}
          </button>
          <button
            onClick={() => void publishAll()}
            disabled={!sections.length || saving}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{" "}
            {t("Publish all")}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-700"
          >
            <Plus className="size-4" /> {t("Add section")}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe2ff] bg-[#f5f6ff] px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#5962b8]">
          <Check className="size-4" />
          {t(
            "Save writes to cms_sections. Published and visible sections are served through public-cms.",
          )}
        </div>
        <button
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#14203a] px-3 py-2 text-[10px] font-bold text-white"
        >
          <Monitor className="size-3.5" /> {t("Draft preview")}
        </button>
      </div>

      {needsManualProducts && productsError ? (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="min-w-0 break-words">
            {lang === "ar" ? "تعذّر تحميل المنتجات للاختيار اليدوي." : "Products could not be loaded for manual selection."} {productsError}
          </span>
          <button type="button" disabled={productsLoading} onClick={() => void retryProducts()} className="min-h-10 rounded-lg border border-current px-3 disabled:opacity-50">
            {t("Retry")}
          </button>
        </div>
      ) : null}

      {!sections.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="text-sm font-bold text-slate-600">
            {t("No homepage CMS sections found.")}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"
          >
            <Plus className="size-4" /> {t("Add first section")}
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
                  if (mutationLock.current) return;
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
              <Editor
                brands={brands}
                products={products}
                productsReady={productsReady}
                section={selected}
                update={updateSelected}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">
                {t("Select a section to edit it.")}
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
                  {t("Add homepage section")}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {t(
                    "New sections start as Draft and are saved to Supabase only after Save changes.",
                  )}
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
                  className="group rounded-2xl border border-slate-200 p-4 text-start transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/30"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Layers3 className="size-4" />
                    </div>
                    <Plus className="size-4 text-slate-300 group-hover:text-indigo-500" />
                  </div>
                  <div className="text-[12px] font-bold text-slate-700">
                    {sectionTypeLabels[type]}
                  </div>
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
                <div className="text-lg font-bold text-[#14203a]">{t("Draft Preview")}</div>
                <div className="text-[11px] text-slate-400">
                  {t(
                    "Preview reflects the current unsaved editor state and device visibility rules.",
                  )}
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
                  {t("No visible sections for this mode.")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
}
