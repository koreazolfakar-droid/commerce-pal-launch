import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");
const dialogs: symbol[] = [];

export function useDashboardDialogFocus(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onEscape?: () => void,
) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;
  useEffect(() => {
    if (!open) return;
    const token = Symbol("dashboard-dialog");
    dialogs.push(token);
    const isTop = () => dialogs.at(-1) === token;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitial = () => {
      const container = containerRef.current;
      if (!container || !isTop()) return;
      const autofocus = container.querySelector<HTMLElement>("[autofocus]");
      const first =
        autofocus ?? container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? container;
      first.focus();
    };

    const frame = window.requestAnimationFrame(focusInitial);

    const onKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container || !isTop()) return;

      if (event.key === "Escape" || event.key === "Tab") event.stopImmediatePropagation();

      if (event.key === "Escape" && escapeRef.current) {
        event.preventDefault();
        escapeRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.tabIndex !== -1 &&
          element.getClientRects().length > 0,
      );

      if (!focusable.length) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      const wasTop = isTop();
      const index = dialogs.indexOf(token);
      if (index >= 0) dialogs.splice(index, 1);
      if (wasTop && previous?.isConnected) previous.focus();
    };
  }, [containerRef, open]);
}
