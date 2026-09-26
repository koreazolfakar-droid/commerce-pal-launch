import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const STORAGE_KEY = "space-call-compare-v1";
export function compareHandles(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 4) : [];
  } catch { return []; }
}
export function setCompareHandles(handles: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(handles)].slice(0, 4)));
  window.dispatchEvent(new Event("space-call:compare"));
}
export function CompareButton({ handle, compact = false, className = "" }: { handle: string; compact?: boolean; className?: string }) {
  const [handles, setHandles] = useState<string[]>([]);
  useEffect(() => {
    const refresh = () => setHandles(compareHandles());
    refresh();
    window.addEventListener("space-call:compare", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("space-call:compare", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const selected = handles.includes(handle);
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button type="button" className="rounded-lg border border-border px-3 py-2 text-xs font-medium"
        onClick={() => setCompareHandles(selected ? handles.filter((item) => item !== handle) : [...handles, handle])}
        disabled={!selected && handles.length >= 4}
        aria-pressed={selected}>{selected ? "Remove from compare" : "Compare"}</button>
      {!compact && handles.length > 0 && <Link to="/compare" className="text-xs text-primary underline">View comparison ({handles.length})</Link>}
    </div>
  );
}
