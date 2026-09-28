import { useEffect, useId, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import DashboardConfirmDialog from "@/dashboard/components/DashboardConfirmDialog";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  destructive?: boolean;
};

type PromptOptions = ConfirmOptions & {
  placeholder?: string;
  initialValue?: string;
  required?: boolean;
};

function createDialogHost() {
  if (typeof document === "undefined") return null;
  const host = document.createElement("div");
  host.dataset["dashboardDialogHost"] = "true";
  document.body.appendChild(host);
  const root = createRoot(host);

  const dispose = () => {
    window.setTimeout(() => {
      root.unmount();
      host.remove();
    }, 0);
  };

  return { root, dispose };
}

export function confirmDashboardAction(
  description: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  const host = createDialogHost();
  if (!host) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      host.dispose();
      resolve(value);
    };

    host.root.render(
      <DashboardConfirmDialog
        open
        title={options.title ?? "Confirm action"}
        description={description}
        confirmLabel={options.confirmLabel ?? "Confirm"}
        destructive={options.destructive ?? true}
        onClose={() => finish(false)}
        onConfirm={() => finish(true)}
      />,
    );
  });
}

function DashboardPromptDialog({
  description,
  options,
  onResolve,
}: {
  description: string;
  options: PromptOptions;
  onResolve: (value: string | null) => void;
}) {
  const [value, setValue] = useState(options.initialValue ?? "");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onResolve(null);
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onResolve]);

  const submit = () => {
    const normalized = value.trim();
    if (options.required !== false && !normalized) return;
    onResolve(normalized);
  };

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-end bg-slate-950/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onResolve(null);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <h2 id={titleId} className="text-[18px] font-black tracking-[-.03em] text-[#14203a]">
          {options.title ?? "Additional information"}
        </h2>
        <p id={descriptionId} className="mt-2 text-[11px] leading-5 text-slate-500">
          {description}
        </p>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={options.placeholder}
          className="mt-5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onResolve(null)}
            className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={options.required !== false && !value.trim()}
            className={
              "h-10 rounded-xl px-4 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 " +
              (options.destructive ? "bg-rose-600" : "bg-[#5968ea]")
            }
          >
            {options.confirmLabel ?? "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function promptDashboardAction(
  description: string,
  options: PromptOptions = {},
): Promise<string | null> {
  const host = createDialogHost();
  if (!host) return Promise.resolve(null);

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      host.dispose();
      resolve(value);
    };

    host.root.render(
      <DashboardPromptDialog
        description={description}
        options={options}
        onResolve={finish}
      />,
    );
  });
}

export type { ConfirmOptions as DashboardConfirmOptions, PromptOptions as DashboardPromptOptions };
