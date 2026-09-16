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

/**
 * Reusable dashboard editor: lists, creates, updates and deletes rows for one
 * content table. Access is enforced by the database policies, not the UI.
 */
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
    if (error) toast.error(error.message);
    setRows(
      ((data ?? []) as Row[]).map((row) => ({
        ...row,
        [EDITOR_KEY]: String(row[idKey] ?? ""),
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

  const saveRow = async (row: Row) => {
    const editorKey = String(row[EDITOR_KEY]);
    const payload: Row = {};

    try {
      for (const field of fields) {
        const value = row[field.key] ?? null;
        payload[field.key] =
          field.type === "json" && typeof value === "string" ? JSON.parse(value || "{}") : value;
      }
    } catch {
      toast.error("تحقق من صيغة JSON قبل الحفظ");
      return;
    }

    setSavingId(editorKey);
    const { error } = await client
      .from(table as never)
      .update(payload as never)
      .eq(idKey, editorKey);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }

    const nextKey = String(row[idKey] ?? editorKey);
    setRows((current) =>
      current.map((item) =>
        String(item[EDITOR_KEY]) === editorKey ? { ...item, [EDITOR_KEY]: nextKey } : item,
      ),
    );
    toast.success("تم الحفظ");
  };

  const addRow = async () => {
    const { error } = await client.from(table as never).insert(newRow as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تمت الإضافة");
    await load();
  };

  const deleteRow = async (row: Row) => {
    if (!window.confirm("هل تريد الحذف نهائياً؟")) return;
    const editorKey = String(row[EDITOR_KEY]);
    const { error } = await client
      .from(table as never)
      .delete()
      .eq(idKey, editorKey);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((current) => current.filter((item) => String(item[EDITOR_KEY]) !== editorKey));
    toast.success("تم الحذف");
  };

  const handleUpload = async (row: Row, field: EditorField, file: File) => {
    const editorKey = String(row[EDITOR_KEY]);
    const uploadKey = `${editorKey}:${field.key}`;
    setUploadingKey(uploadKey);
    try {
      const url = await uploadMedia(file, table);
      setValue(editorKey, field.key, url);
      toast.success("تم رفع الصورة، اضغط حفظ");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر رفع الصورة");
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Content Management</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button
          onClick={() => void addRow()}
          size="sm"
          className="min-h-10 rounded-xl bg-foreground px-4 text-background hover:bg-foreground/90"
        >
          <Plus className="me-1.5 size-4" /> إضافة عنصر
        </Button>
      </header>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> جاري التحميل…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-bold text-foreground">لا توجد عناصر بعد</p>
          <p className="mt-1 text-xs text-muted-foreground">اضغط «إضافة عنصر» للبدء.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, index) => {
            const editorKey = String(row[EDITOR_KEY]);
            return (
              <article
                key={editorKey}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.02)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground">Item {index + 1}</p>
                    <h2 className="mt-0.5 truncate text-sm font-black text-foreground">
                      {String(row[labelKey] ?? "بدون عنوان")}
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
                      حفظ
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void deleteRow(row)}
                      aria-label="حذف العنصر"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                  {fields.map((field) => {
                    const value = row[field.key];
                    const inputId = `${editorKey}-${field.key}`;
                    const wide = field.type === "textarea" || field.type === "json" || field.type === "image";
                    return (
                      <div key={field.key} className={wide ? "lg:col-span-2" : undefined}>
                        <Label htmlFor={inputId} className="text-[11px] font-semibold text-muted-foreground">
                          {field.label}
                        </Label>

                        {field.type === "boolean" ? (
                          <div className="mt-1.5 flex min-h-11 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3.5">
                            <span className="text-[11px] font-medium text-foreground">
                              {Boolean(value) ? "مفعّل" : "غير مفعّل"}
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
                                placeholder="رابط الصورة"
                                onChange={(event) => setValue(editorKey, field.key, event.target.value)}
                              />
                              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-bold transition hover:bg-muted">
                                {uploadingKey === `${editorKey}:${field.key}` ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Upload className="size-4" />
                                )}
                                رفع صورة
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
