import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/adminMedia";
import { useDashboardLanguage } from "@/lib/dashboardI18n";

export type EditorFieldType =
  "text" | "textarea" | "number" | "boolean" | "select" | "image" | "json";

export type EditorField = {
  key: string;
  label: string;
  type: EditorFieldType;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
};

type Row = Record<string, unknown>;
const EDITOR_KEY = "__editorKey";
const IS_DRAFT = "__isDraft";

export type CollectionEditorProps = {
  table: string;
  title: string;
  description?: string;
  fields: EditorField[];
  newRow: Row;
  orderBy?: string;
  labelKey: string;
  idKey?: string;
};

function displayJson(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function missingRequired(field: EditorField, value: unknown) {
  if (!field.required) return false;
  if (value === null || value === undefined) return true;
  return typeof value === "string" ? value.trim().length === 0 : false;
}

export function CollectionEditor({
  table,
  title,
  description,
  fields,
  newRow,
  orderBy = "sort_order",
  labelKey,
  idKey = "id",
}: CollectionEditorProps) {
  const { text } = useDashboardLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const client = useMemo(() => supabase, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await client
      .from(table as never)
      .select("*")
      .order(orderBy, { ascending: true });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setRows(
      ((data ?? []) as Row[]).map((row) => ({
        ...row,
        [EDITOR_KEY]: String(row[idKey] ?? ""),
        [IS_DRAFT]: false,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, idKey]);

  const setValue = (editorKey: string, key: string, value: unknown) => {
    setRows((current) =>
      current.map((row) =>
        String(row[EDITOR_KEY]) === editorKey ? { ...row, [key]: value } : row,
      ),
    );
  };

  const addRow = () => {
    const editorKey = `draft-${crypto.randomUUID()}`;
    setRows((current) => [{ ...newRow, [EDITOR_KEY]: editorKey, [IS_DRAFT]: true }, ...current]);
  };

  const buildPayload = (row: Row) => {
    const payload: Row = {};

    for (const field of fields) {
      const value = row[field.key] ?? null;
      if (missingRequired(field, value)) {
        throw new Error(`required:${field.label}`);
      }

      if (field.type === "json" && typeof value === "string") {
        payload[field.key] = JSON.parse(value || "{}");
      } else {
        payload[field.key] = value;
      }
    }

    return payload;
  };

  const saveRow = async (row: Row) => {
    const editorKey = String(row[EDITOR_KEY]);
    let payload: Row;

    try {
      payload = buildPayload(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.startsWith("required:")) {
        toast.error(
          text(
            `الحقل مطلوب: ${message.slice("required:".length)}`,
            `Required field: ${message.slice("required:".length)}`,
          ),
        );
      } else {
        toast.error(text("تحقق من صيغة JSON قبل الحفظ", "Check the JSON format before saving"));
      }
      return;
    }

    setSavingId(editorKey);
    const isDraft = Boolean(row[IS_DRAFT]);

    const result = isDraft
      ? await client
          .from(table as never)
          .insert(payload as never)
          .select("*")
          .single()
      : await client
          .from(table as never)
          .update(payload as never)
          .eq(idKey, editorKey)
          .select("*")
          .single();

    setSavingId(null);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    const saved = result.data as Row;
    const nextEditorKey = String(saved[idKey] ?? row[idKey] ?? editorKey);
    setRows((current) =>
      current.map((item) =>
        String(item[EDITOR_KEY]) === editorKey
          ? { ...saved, [EDITOR_KEY]: nextEditorKey, [IS_DRAFT]: false }
          : item,
      ),
    );
    toast.success(
      isDraft ? text("تمت الإضافة والحفظ", "Item added and saved") : text("تم الحفظ", "Saved"),
    );
  };

  const deleteRow = async (row: Row) => {
    const editorKey = String(row[EDITOR_KEY]);

    if (row[IS_DRAFT]) {
      setRows((current) => current.filter((item) => String(item[EDITOR_KEY]) !== editorKey));
      return;
    }

    if (!window.confirm(text("هل تريد الحذف نهائياً؟", "Delete this item permanently?"))) return;
    const { error } = await client
      .from(table as never)
      .delete()
      .eq(idKey, editorKey);
    if (error) {
      toast.error(error.message);
      return;
    }

    setRows((current) => current.filter((item) => String(item[EDITOR_KEY]) !== editorKey));
    toast.success(text("تم الحذف", "Deleted"));
  };

  const handleUpload = async (row: Row, field: EditorField, file: File) => {
    const editorKey = String(row[EDITOR_KEY]);
    const uploadKey = `${editorKey}:${field.key}`;
    setUploadingKey(uploadKey);
    try {
      const url = await uploadMedia(file, table);
      setValue(editorKey, field.key, url);
      toast.success(text("تم رفع الصورة، اضغط حفظ", "Image uploaded. Click Save."));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : text("تعذّر رفع الصورة", "Image upload failed"),
      );
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">
            {text("إدارة المحتوى", "Content Management")}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <Button
          onClick={addRow}
          size="sm"
          className="min-h-10 rounded-xl bg-foreground px-4 text-background hover:bg-foreground/90"
        >
          <Plus className="me-1.5 size-4" /> {text("إضافة عنصر", "Add item")}
        </Button>
      </header>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {text("جاري التحميل…", "Loading…")}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-bold text-foreground">
            {text("لا توجد عناصر بعد", "No items yet")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {text("اضغط «إضافة عنصر» للبدء.", "Click “Add item” to get started.")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, index) => {
            const editorKey = String(row[EDITOR_KEY]);
            const draft = Boolean(row[IS_DRAFT]);
            return (
              <article
                key={editorKey}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.02)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      {draft ? text("مسودة", "Draft") : `${text("عنصر", "Item")} ${index + 1}`}
                    </p>
                    <h2 className="mt-0.5 truncate text-sm font-black text-foreground">
                      {String(row[labelKey] || text("بدون عنوان", "Untitled"))}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-9 rounded-xl"
                      onClick={() => void saveRow(row)}
                      disabled={savingId === editorKey}
                    >
                      {savingId === editorKey ? (
                        <Loader2 className="me-1.5 size-3.5 animate-spin" />
                      ) : (
                        <Save className="me-1.5 size-3.5" />
                      )}
                      {text("حفظ", "Save")}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void deleteRow(row)}
                      aria-label={
                        draft
                          ? text("إلغاء العنصر الجديد", "Cancel new item")
                          : text("حذف العنصر", "Delete item")
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                  {fields.map((field) => {
                    const value = row[field.key];
                    const inputId = `${editorKey}-${field.key}`;
                    const wide =
                      field.type === "textarea" || field.type === "json" || field.type === "image";
                    return (
                      <div key={field.key} className={wide ? "lg:col-span-2" : undefined}>
                        <Label
                          htmlFor={inputId}
                          className="text-[11px] font-semibold text-muted-foreground"
                        >
                          {field.label}
                          {field.required ? " *" : ""}
                        </Label>

                        {field.type === "boolean" ? (
                          <div className="mt-1.5 flex min-h-11 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3.5">
                            <span className="text-[11px] font-medium text-foreground">
                              {value ? text("مفعّل", "Enabled") : text("غير مفعّل", "Disabled")}
                            </span>
                            <Switch
                              id={inputId}
                              checked={Boolean(value)}
                              onCheckedChange={(checked) => setValue(editorKey, field.key, checked)}
                            />
                          </div>
                        ) : field.type === "textarea" || field.type === "json" ? (
                          <Textarea
                            id={inputId}
                            className="mt-1.5 rounded-xl border-border/70 bg-muted/20 font-mono text-xs focus-visible:bg-background"
                            rows={field.type === "json" ? 6 : 4}
                            value={field.type === "json" ? displayJson(value) : String(value ?? "")}
                            onChange={(event) => setValue(editorKey, field.key, event.target.value)}
                          />
                        ) : field.type === "select" ? (
                          <select
                            id={inputId}
                            className="mt-1.5 h-11 w-full rounded-xl border border-border/70 bg-muted/20 px-3 text-xs font-medium outline-none transition focus:bg-background focus:ring-2 focus:ring-foreground/5"
                            value={String(value ?? "")}
                            onChange={(event) => setValue(editorKey, field.key, event.target.value)}
                          >
                            {(field.options ?? []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "image" ? (
                          <div className="mt-1.5 rounded-2xl border border-dashed border-border bg-muted/15 p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <Input
                                id={inputId}
                                className="h-11 rounded-xl border-border/70 bg-background"
                                value={String(value ?? "")}
                                placeholder={text("رابط الصورة", "Image URL")}
                                onChange={(event) =>
                                  setValue(editorKey, field.key, event.target.value)
                                }
                              />
                              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-bold transition hover:bg-muted">
                                {uploadingKey === `${editorKey}:${field.key}` ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Upload className="size-4" />
                                )}
                                {text("رفع صورة", "Upload image")}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void handleUpload(row, field, file);
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                            {value ? (
                              <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-white p-2">
                                <img
                                  src={String(value)}
                                  alt=""
                                  className="h-28 w-full object-contain"
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <Input
                            id={inputId}
                            className="mt-1.5 h-11 rounded-xl border-border/70 bg-muted/20 text-xs focus-visible:bg-background"
                            type={field.type === "number" ? "number" : "text"}
                            value={String(value ?? "")}
                            placeholder={field.placeholder ?? ""}
                            onChange={(event) =>
                              setValue(
                                editorKey,
                                field.key,
                                field.type === "number"
                                  ? Number(event.target.value)
                                  : event.target.value,
                              )
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
