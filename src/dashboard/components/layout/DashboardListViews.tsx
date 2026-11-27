import { useEffect, useId, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { BookmarkPlus, X } from "lucide-react";
import { useLanguage } from "@/dashboard/i18n";
import { readPreference, writePreference } from "@/dashboard/lib/preferenceStorage";

type View = { name: string; query: string };
export default function DashboardListViews({
  scope,
  keys,
  presets,
}: {
  scope: string;
  keys: readonly string[];
  presets: View[];
}) {
  const { t } = useLanguage();
  const [path, navigate] = useLocation();
  const search = useSearch();
  const [saved, setSaved] = useState<View[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const id = useId();
  const storageKey = `spacecall-list-views:${scope}`;
  useEffect(() => {
    try {
      const parsed: unknown = JSON.parse(readPreference(storageKey) || "[]");
      setSaved(
        Array.isArray(parsed)
          ? parsed
              .filter(
                (row): row is View =>
                  row &&
                  typeof row.name === "string" &&
                  row.name.length <= 60 &&
                  typeof row.query === "string" &&
                  row.query.length <= 1500,
              )
              .slice(0, 5)
          : [],
      );
    } catch {
      setSaved([]);
    }
  }, [storageKey]);
  const params = new URLSearchParams(search);
  const filterQuery = new URLSearchParams(
    [...params].filter(([key]) => keys.includes(key)),
  ).toString();
  const persist = (views: View[]) => {
    setSaved(views);
    writePreference(storageKey, JSON.stringify(views));
  };
  const apply = (view: View) => {
    const next = new URLSearchParams(window.location.search);
    keys.forEach((key) => next.delete(key));
    next.delete("page");
    for (const [key, value] of new URLSearchParams(view.query))
      if (keys.includes(key)) next.set(key, value);
    navigate(`${path}${next.size ? `?${next}` : ""}`, { replace: true });
  };
  const active = (view: View) => {
    const candidate = new URLSearchParams(view.query);
    return keys.every((key) => (candidate.get(key) || "") === (params.get(key) || ""));
  };
  return (
    <section className="dashboard-list-views" aria-label={t("List views")}>
      <span className="text-xs font-semibold text-muted-foreground">{t("Views")}</span>
      {[...presets, ...saved].map((view, index) => (
        <div
          key={`${index}-${view.name}`}
          className={`dashboard-view ${active(view) ? "is-active" : ""}`}
        >
          <button type="button" onClick={() => apply(view)} aria-pressed={active(view)}>
            {index < presets.length ? t(view.name) : view.name}
          </button>
          {index >= presets.length && (
            <button
              type="button"
              onClick={() => persist(saved.filter((_, i) => i !== index - presets.length))}
              aria-label={`${t("Remove view")} ${view.name}`}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="dashboard-save-view"
        disabled={!filterQuery || saved.length >= 5}
        onClick={() => {
          setName("");
          setEditing(true);
        }}
      >
        <BookmarkPlus className="size-3.5" />
        {t("Save view")}
      </button>
      {editing && (
        <form
          className="dashboard-view-form"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = name.trim();
            if (!trimmed || !filterQuery) return;
            persist(
              [
                ...saved.filter((view) => view.name !== trimmed),
                { name: trimmed, query: filterQuery },
              ].slice(-5),
            );
            setEditing(false);
          }}
        >
          <label className="text-xs font-semibold" htmlFor={id}>
            {t("View name")}
          </label>
          <input
            id={id}
            autoFocus
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
          />
          <button className="dashboard-button" disabled={!name.trim()} type="submit">
            {t("Save")}
          </button>
          <button type="button" className="dashboard-button" onClick={() => setEditing(false)}>
            {t("Cancel")}
          </button>
        </form>
      )}
    </section>
  );
}
