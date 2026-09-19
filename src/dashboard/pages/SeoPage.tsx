import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  deleteDashboardSeoPage,
  loadDashboardSeoWorkspace,
  saveDashboardSeoPage,
  type DashboardSeoInput,
  type DashboardSeoPage,
} from "@/dashboard/data/seo";

const EMPTY: DashboardSeoInput = {
  pageSlug: "",
  title: "",
  titleEn: "",
  titleAr: "",
  description: "",
  descriptionEn: "",
  descriptionAr: "",
  ogImageUrl: "",
  canonicalUrl: "",
  robots: "index,follow",
  jsonLd: {},
  isPublic: true,
};

const LIVE_ROUTES = new Set(["home", "brands"]);

export default function SeoPage() {
  const [pages, setPages] = useState<DashboardSeoPage[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<DashboardSeoPage | null>(null);
  const [draft, setDraft] = useState<DashboardSeoInput>(EMPTY);
  const [jsonText, setJsonText] = useState("{}");
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const workspace = await loadDashboardSeoWorkspace();
      setPages(workspace.pages);
      setCanDelete(workspace.role === "admin");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "SEO load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{void load();},[load]);

  const filtered=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    return !needle?pages:pages.filter((page)=>[page.pageSlug,page.titleEn,page.titleAr,page.descriptionEn].join(" ").toLowerCase().includes(needle));
  },[pages,query]);

  const openCreate=()=>{
    setEditing(null);
    setDraft(EMPTY);
    setJsonText("{}");
    setModalOpen(true);
  };

  const openEdit=(page:DashboardSeoPage)=>{
    setEditing(page);
    setDraft({
      pageSlug:page.pageSlug,title:page.title,titleEn:page.titleEn,titleAr:page.titleAr,
      description:page.description,descriptionEn:page.descriptionEn,descriptionAr:page.descriptionAr,
      ogImageUrl:page.ogImageUrl,canonicalUrl:page.canonicalUrl,robots:page.robots,
      jsonLd:page.jsonLd,isPublic:page.isPublic,
    });
    setJsonText(JSON.stringify(page.jsonLd,null,2));
    setModalOpen(true);
  };

  const save=async()=>{
    if(saving)return;
    let jsonLd:Record<string,unknown>;
    try{
      const parsed=JSON.parse(jsonText||"{}");
      if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)) throw new Error();
      jsonLd=parsed as Record<string,unknown>;
    }catch{
      return toast.error("JSON-LD must be a valid JSON object.");
    }
    setSaving(true);
    try{
      const saved=await saveDashboardSeoPage({...draft,jsonLd});
      setPages((current)=>[...current.filter((page)=>page.pageSlug!==saved.pageSlug),saved].sort((a,b)=>a.pageSlug.localeCompare(b.pageSlug)));
      setModalOpen(false);
      toast.success("SEO metadata saved to Supabase.");
    }catch(cause){
      toast.error(cause instanceof Error?cause.message:"SEO save failed.");
    }finally{setSaving(false);}
  };

  const remove=async(page:DashboardSeoPage)=>{
    if(!canDelete)return toast.error("Only admins can delete SEO pages.");
    if(!window.confirm(`Delete SEO configuration for "${page.pageSlug}"?`))return;
    try{
      await deleteDashboardSeoPage(page.pageSlug);
      setPages((current)=>current.filter((row)=>row.pageSlug!==page.pageSlug));
      toast.success("SEO row deleted.");
    }catch(cause){toast.error(cause instanceof Error?cause.message:"SEO delete failed.");}
  };

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-indigo-500">Marketing / Live CMS</div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">SEO</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">Manage bilingual metadata, canonical URLs, robots and JSON-LD stored in cms_seo_pages.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>void load()} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600"><RefreshCw className="size-3.5" /> Refresh</button>
          <button onClick={openCreate} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white"><Plus className="size-4" /> Add SEO page</button>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-[#dfe2ff] bg-[#f5f6ff] p-4 text-[11px] leading-5 text-[#5962b8]">
        <strong>Live now:</strong> Home and Brands routes consume cms_seo_pages directly. Other page slugs can be prepared here, but only affect routes that explicitly call cmsSeoPage.
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search SEO pages..." className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[12px] outline-none focus:border-indigo-400" /></div></div>
        {loading?<div className="grid min-h-64 place-items-center"><Loader2 className="size-6 animate-spin text-indigo-500" /></div>:(
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-[.1em] text-slate-400"><th className="px-5 py-3">Page</th><th className="px-3 py-3">English title</th><th className="px-3 py-3">Arabic title</th><th className="px-3 py-3">Robots</th><th className="px-3 py-3">Public</th><th className="px-3 py-3">Route use</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody>{filtered.map((page)=>(
                <tr key={page.pageSlug} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-4 text-[12px] font-bold text-indigo-600">{page.pageSlug}</td>
                  <td className="max-w-[260px] truncate px-3 py-4 text-[12px] text-slate-700">{page.titleEn||"—"}</td>
                  <td className="max-w-[260px] truncate px-3 py-4 text-[12px] text-slate-500" dir="rtl">{page.titleAr||"—"}</td>
                  <td className="px-3 py-4 text-[10px] text-slate-500">{page.robots}</td>
                  <td className="px-3 py-4">{page.isPublic?<Eye className="size-4 text-emerald-600" />:<EyeOff className="size-4 text-slate-400" />}</td>
                  <td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${LIVE_ROUTES.has(page.pageSlug)?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{LIVE_ROUTES.has(page.pageSlug)?"Connected":"Prepared"}</span></td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={()=>openEdit(page)} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-50"><Pencil className="size-3.5" /></button>{canDelete&&page.pageSlug!=="home"?<button onClick={()=>void remove(page)} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="size-3.5" /></button>:null}</div></td>
                </tr>
              ))}</tbody>
            </table>
            {!filtered.length?<div className="p-12 text-center text-sm text-slate-400">No SEO pages found.</div>:null}
          </div>
        )}
      </div>

      {modalOpen?(
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/40 p-4 sm:p-8" onClick={()=>setModalOpen(false)}>
          <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl" onClick={(e)=>e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between"><div><div className="text-lg font-bold text-slate-800">{editing?"Edit SEO page":"Add SEO page"}</div><div className="mt-1 text-[11px] text-slate-400">Bilingual metadata served by public-cms.</div></div><button onClick={()=>setModalOpen(false)} className="grid size-8 place-items-center rounded-lg text-slate-400"><X className="size-4" /></button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Page slug" value={draft.pageSlug} onChange={(value)=>setDraft((d)=>({...d,pageSlug:value}))} disabled={Boolean(editing)} placeholder="home / brands" />
              <Field label="Robots" value={draft.robots} onChange={(value)=>setDraft((d)=>({...d,robots:value}))} placeholder="index,follow" />
              <Field label="Title — English" value={draft.titleEn} onChange={(value)=>setDraft((d)=>({...d,titleEn:value,title:d.title||value}))} />
              <Field label="Title — Arabic" value={draft.titleAr} onChange={(value)=>setDraft((d)=>({...d,titleAr:value}))} dir="rtl" />
              <TextArea label="Description — English" value={draft.descriptionEn} onChange={(value)=>setDraft((d)=>({...d,descriptionEn:value,description:d.description||value}))} />
              <TextArea label="Description — Arabic" value={draft.descriptionAr} onChange={(value)=>setDraft((d)=>({...d,descriptionAr:value}))} dir="rtl" />
              <Field label="Open Graph image URL" value={draft.ogImageUrl} onChange={(value)=>setDraft((d)=>({...d,ogImageUrl:value}))} dir="ltr" />
              <Field label="Canonical URL" value={draft.canonicalUrl} onChange={(value)=>setDraft((d)=>({...d,canonicalUrl:value}))} dir="ltr" />
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-[11px] font-semibold text-slate-600 sm:col-span-2"><input type="checkbox" checked={draft.isPublic} onChange={(e)=>setDraft((d)=>({...d,isPublic:e.target.checked}))} /> Public / active SEO configuration</label>
              <label className="block sm:col-span-2"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">JSON-LD object</span><textarea value={jsonText} onChange={(e)=>setJsonText(e.target.value)} rows={8} spellCheck={false} className="w-full rounded-xl border border-slate-200 p-3 font-mono text-[11px] outline-none focus:border-indigo-400" /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={()=>setModalOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600">Cancel</button><button onClick={()=>void save()} disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white disabled:opacity-50">{saving?<Loader2 className="size-4 animate-spin" />:<Save className="size-4" />} Save SEO</button></div>
          </div>
        </div>
      ):null}
    </div>
  );
}

function Field({label,value,onChange,dir,placeholder,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;dir?:"ltr"|"rtl";placeholder?:string;disabled?:boolean}) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span><input value={value} disabled={disabled} dir={dir} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] outline-none focus:border-indigo-400 disabled:bg-slate-50 disabled:text-slate-400" /></label>;
}
function TextArea({label,value,onChange,dir}:{label:string;value:string;onChange:(value:string)=>void;dir?:"ltr"|"rtl"}) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span><textarea value={value} dir={dir} onChange={(e)=>onChange(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 p-3 text-[12px] outline-none focus:border-indigo-400" /></label>;
}
