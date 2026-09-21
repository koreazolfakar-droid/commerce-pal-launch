import {
  ExternalLink,
  ImageUp,
  Loader2,
  RefreshCw,
  Save,
  Store,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import ImageOptimizationPreview from "@/dashboard/components/ImageOptimizationPreview";
import { getDashboardRole, type DashboardRole } from "@/dashboard/data/catalog";
import {
  loadDashboardSiteSettings,
  saveDashboardSiteSettings,
  uploadDashboardStoreLogo,
  type DashboardSiteSettings,
} from "@/dashboard/data/settings";
import { SITE_URL } from "@/lib/storeConfig";

type Tab = "identity" | "contact" | "social" | "delivery";

const EMPTY: DashboardSiteSettings = {
  siteName: "",
  logoUrl: "",
  taglineEn: "",
  taglineAr: "",
  whatsappNumber: "",
  storePhone: "",
  storeEmail: "",
  supportEmail: "",
  addressLine: "",
  city: "",
  countryCode: "",
  instagramUrl: "",
  facebookUrl: "",
  xUrl: "",
  youtubeUrl: "",
  tiktokUrl: "",
  deliveryFee: "2.00",
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  dir,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#6974eb] focus:ring-4 focus:ring-[#6974eb]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      />
    </label>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(33,47,82,.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-[13px] font-bold text-[#14203a]">{title}</div>
        {subtitle ? <div className="mt-1 text-[11px] text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("identity");
  const [settings, setSettings] = useState<DashboardSiteSettings>(EMPTY);
  const [saved, setSaved] = useState<DashboardSiteSettings>(EMPTY);
  const [role, setRole] = useState<DashboardRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (manual = false) => {
    if (!manual) setLoading(true);
    try {
      const [next, nextRole] = await Promise.all([
        loadDashboardSiteSettings(),
        getDashboardRole(),
      ]);
      setSettings(next);
      setSaved(next);
      setRole(nextRole);
      if (manual) toast.success("Settings refreshed from Supabase.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(saved),
    [saved, settings],
  );

  const update = (key: keyof DashboardSiteSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const next = await saveDashboardSiteSettings(settings);
      setSettings(next);
      setSaved(next);
      toast.success("Store settings saved to Supabase.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Saving settings failed.");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const url = await uploadDashboardStoreLogo(file);
      update("logoUrl", url);
      toast.success("Logo uploaded. Save changes to publish it.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Logo upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      setPendingLogo(null);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="size-6 animate-spin text-[#5968ea]" />
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "identity", label: "Store identity" },
    { id: "contact", label: "Contact & WhatsApp" },
    { id: "social", label: "Social media" },
    { id: "delivery", label: "Delivery" },
  ];

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6a70e7]">
            <span className="size-1.5 rounded-full bg-[#6a70e7]" />
            System / Live configuration
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.05em] text-[#14203a]">Settings</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Edit the public Space Call identity and contact details stored in Supabase.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void load(true)}
            disabled={saving || uploading}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 disabled:opacity-50"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
          <button
            onClick={() => window.open(SITE_URL, "_blank", "noopener,noreferrer")}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600"
          >
            <ExternalLink className="size-3.5" /> View store
          </button>
          <button
            onClick={() => void save()}
            disabled={!dirty || saving || uploading}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5968ea] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(89,104,234,.22)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe2ff] bg-[#f5f6ff] px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#5962b8]">
          <Store className="size-4" />
          Changes are served to the storefront through public-cms. Reload the storefront to see saved values.
        </div>
        <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
          dirty ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
        }`}>
          {dirty ? "Unsaved changes" : "Saved"}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="h-fit rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_8px_24px_rgba(33,47,82,.04)]">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold transition ${
                tab === item.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          {tab === "identity" ? (
            <>
              <Panel
                title="Brand identity"
                subtitle="Store name and logo are live in the storefront header/footer. Taglines are stored in CMS for supported content surfaces."
              >
                <div className="grid gap-5 p-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold text-slate-600">Store logo</div>
                    <div className="grid min-h-40 place-items-center overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                      {settings.logoUrl ? (
                        <img
                          src={settings.logoUrl}
                          alt={settings.siteName || "Store logo"}
                          className="max-h-28 max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-slate-400">
                          <ImageUp className="mx-auto size-7" />
                          <div className="mt-2 text-[10px]">Default storefront logo</div>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      onChange={(event) => {
                        setPendingLogo(event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                    />
                    {pendingLogo ? (
                      <div className="mt-3">
                        <ImageOptimizationPreview
                          files={[pendingLogo]}
                          resolution="1080"
                          title="Store logo compression preview"
                          compact
                        />
                      </div>
                    ) : null}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-600 disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
                        Upload
                      </button>
                      <button
                        onClick={() => { setPendingLogo(null); update("logoUrl", ""); }}
                        disabled={!settings.logoUrl || uploading}
                        className="h-9 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-500 disabled:opacity-40"
                      >
                        Use default
                      </button>
                    </div>
                    {pendingLogo ? (
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPendingLogo(null)}
                          disabled={uploading}
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-bold text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void uploadLogo(pendingLogo)}
                          disabled={uploading}
                          className="h-8 rounded-lg bg-[#5968ea] px-2.5 text-[9px] font-bold text-white disabled:opacity-50"
                        >
                          Confirm & upload
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid content-start gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field
                        label="Store name"
                        value={settings.siteName}
                        onChange={(value) => update("siteName", value)}
                        placeholder="Space Call"
                      />
                    </div>
                    <Field
                      label="Tagline — English"
                      value={settings.taglineEn}
                      onChange={(value) => update("taglineEn", value)}
                    />
                    <Field
                      label="Tagline — Arabic"
                      value={settings.taglineAr}
                      onChange={(value) => update("taglineAr", value)}
                      dir="rtl"
                    />
                    <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[10px] leading-5 text-slate-500">
                      Production domain: <span className="font-bold text-slate-700">{SITE_URL}</span>.
                      The domain remains deployment configuration and is intentionally not editable from CMS.
                    </div>
                  </div>
                </div>
              </Panel>
            </>
          ) : null}

          {tab === "contact" ? (
            <Panel
              title="Contact & WhatsApp"
              subtitle="WhatsApp is live across storefront contact and checkout surfaces. The other contact fields are stored in CMS for supported contact surfaces."
            >
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field
                  label="WhatsApp number"
                  value={settings.whatsappNumber}
                  onChange={(value) => update("whatsappNumber", value)}
                  placeholder="961..."
                  dir="ltr"
                />
                <Field
                  label="Store phone"
                  value={settings.storePhone}
                  onChange={(value) => update("storePhone", value)}
                  dir="ltr"
                />
                <Field
                  label="Store email"
                  value={settings.storeEmail}
                  onChange={(value) => update("storeEmail", value)}
                  type="email"
                  dir="ltr"
                />
                <Field
                  label="Support email"
                  value={settings.supportEmail}
                  onChange={(value) => update("supportEmail", value)}
                  type="email"
                  dir="ltr"
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Address"
                    value={settings.addressLine}
                    onChange={(value) => update("addressLine", value)}
                  />
                </div>
                <Field
                  label="City"
                  value={settings.city}
                  onChange={(value) => update("city", value)}
                />
                <Field
                  label="Country code"
                  value={settings.countryCode}
                  onChange={(value) => update("countryCode", value)}
                  placeholder="LB"
                  dir="ltr"
                />
              </div>
            </Panel>
          ) : null}

          {tab === "delivery" ? (
            <Panel
              title="Delivery pricing"
              subtitle="This fee is shared by the storefront cart and the secure server-side order flow. Enter 0 for Free Delivery."
            >
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field
                  label="Default delivery fee"
                  value={settings.deliveryFee}
                  onChange={(value) => update("deliveryFee", value)}
                  type="number"
                  dir="ltr"
                  placeholder="2.00"
                  disabled={role !== "admin"}
                />
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-[11px] leading-5 text-slate-500">
                  <div className="font-bold text-slate-700">
                    {Number(settings.deliveryFee || 0) === 0 ? "Free Delivery" : "Paid Delivery"}
                  </div>
                  <div className="mt-1">
                    {role === "admin"
                      ? "The default is USD 2.00 per order. Changes here are reflected in the storefront cart and are enforced server-side for new orders. Staff can still override delivery on an unpaid order."
                      : "Only an admin with MFA or passkey step-up can change the global delivery fee. You can view the current fee, but editing is locked for your role."}
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}

          {tab === "social" ? (
            <Panel
              title="Social media"
              subtitle="Saved social links are consumed by the storefront footer; deployment fallbacks remain available when a CMS value is empty."
            >
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Instagram URL" value={settings.instagramUrl} onChange={(value) => update("instagramUrl", value)} dir="ltr" />
                <Field label="Facebook URL" value={settings.facebookUrl} onChange={(value) => update("facebookUrl", value)} dir="ltr" />
                <Field label="X URL" value={settings.xUrl} onChange={(value) => update("xUrl", value)} dir="ltr" />
                <Field label="YouTube URL" value={settings.youtubeUrl} onChange={(value) => update("youtubeUrl", value)} dir="ltr" />
                <Field label="TikTok URL" value={settings.tiktokUrl} onChange={(value) => update("tiktokUrl", value)} dir="ltr" />
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
