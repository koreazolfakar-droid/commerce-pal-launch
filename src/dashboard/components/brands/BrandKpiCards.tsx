import { Building2, EyeOff, PackageCheck, Sparkles } from "lucide-react";

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
      <div className="flex items-center gap-3">
        <span className={"grid size-9 shrink-0 place-items-center rounded-xl " + tone}>{icon}</span>
        <div className="min-w-0">
          <div className="truncate text-[10px] font-semibold text-slate-400">{label}</div>
          <div className="mt-0.5 text-xl font-black tracking-[-.03em] text-[#14203a]">
            {value.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrandKpiCards({
  total,
  active,
  featured,
  assignedProducts,
}: {
  total: number;
  active: number;
  featured: number;
  assignedProducts: number;
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        label="Total Brands"
        value={total}
        icon={<Building2 className="size-4.5" />}
        tone="bg-indigo-50 text-indigo-600"
      />
      <Kpi
        label="Active"
        value={active}
        icon={<PackageCheck className="size-4.5" />}
        tone="bg-emerald-50 text-emerald-600"
      />
      <Kpi
        label="Featured"
        value={featured}
        icon={<Sparkles className="size-4.5" />}
        tone="bg-violet-50 text-violet-600"
      />
      <Kpi
        label="Assigned Products"
        value={assignedProducts}
        icon={<EyeOff className="size-4.5" />}
        tone="bg-sky-50 text-sky-600"
      />
    </div>
  );
}
