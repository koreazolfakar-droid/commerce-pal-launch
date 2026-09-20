import { MoreHorizontal, Trash2, type LucideIcon } from "lucide-react";
import { useState } from "react";

export type CatalogRowAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
};

export default function CatalogRowActions({
  entityName,
  entityType,
  actions,
  onDelete,
}: {
  entityName: string;
  entityType: "Brand" | "Category";
  actions: CatalogRowAction[];
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Actions for ${entityName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="grid size-10 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 active:scale-95 sm:size-9"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={`Close ${entityType.toLowerCase()} actions`}
            className="fixed inset-0 z-[55] cursor-default bg-slate-950/20 sm:z-40 sm:bg-transparent"
            onClick={() => setOpen(false)}
          />

          <div
            role="menu"
            aria-label={`Actions for ${entityName}`}
            className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] max-h-[70dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:end-0 sm:top-11 sm:z-50 sm:max-h-none sm:w-48 sm:max-w-[calc(100vw-2rem)] sm:overflow-hidden sm:rounded-xl sm:p-1.5 sm:shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-2.5 pb-2 pt-1 sm:hidden">
              <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-slate-200" />
              <div className="truncate text-[12px] font-black text-slate-700">{entityName}</div>
              <div className="mt-0.5 text-[9px] text-slate-400">{entityType} actions</div>
            </div>

            {actions.map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={() => run(onClick)}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 active:bg-slate-100 sm:min-h-10 sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2 sm:text-[10px]"
              >
                <Icon className="size-4 shrink-0 text-slate-400 sm:size-3.5" />
                <span className="truncate">{label}</span>
              </button>
            ))}

            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => run(onDelete)}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 active:bg-rose-100 sm:min-h-10 sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2 sm:text-[10px]"
            >
              <Trash2 className="size-4 shrink-0 sm:size-3.5" />
              Delete
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
