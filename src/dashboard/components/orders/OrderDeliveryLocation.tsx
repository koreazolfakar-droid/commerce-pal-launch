import { Copy, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/dashboard/i18n";
import {
  formatOrderCoordinates,
  orderLocationDirectionsUrl,
  orderLocationMapUrl,
  parseOrderDeliveryLocation,
} from "@/dashboard/lib/orderDeliveryLocation";

export function OrderDeliveryLocation({
  value,
  compact = false,
}: {
  value: unknown;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const coordinates = parseOrderDeliveryLocation(value);

  if (!coordinates) {
    return (
      <p data-testid="order-location-missing" className="text-[11px] text-slate-500">
        {t("Customer did not share a map location.")}
      </p>
    );
  }

  const copyCoordinates = async () => {
    try {
      await navigator.clipboard.writeText(formatOrderCoordinates(coordinates));
      toast.success(t("Coordinates copied."));
    } catch {
      toast.error(t("Could not copy coordinates."));
    }
  };

  return (
    <section data-testid="order-delivery-location" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
          <MapPin className="size-4 text-indigo-600" aria-hidden="true" />
          {t("Delivery pin")}
        </div>
        {coordinates.accuracy !== null ? (
          <span className="text-[10px] text-slate-500">
            {t("Location accuracy")}: ±{Math.round(coordinates.accuracy)} m
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={orderLocationDirectionsUrl(coordinates)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-indigo-700"
          data-testid="order-location-directions"
        >
          <Navigation className="size-3.5" aria-hidden="true" />
          {t("Get directions")}
        </a>
        <button
          type="button"
          onClick={() => void copyCoordinates()}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
          data-testid="order-location-copy"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          {t("Copy coordinates")}
        </button>
      </div>

      <iframe
        src={orderLocationMapUrl(coordinates)}
        title={t("Delivery map")}
        className={`w-full rounded-xl border border-slate-200 ${compact ? "h-40" : "h-56 sm:h-64"}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        allowFullScreen
      />
      <p className="break-all font-mono text-[10px] text-slate-500">
        {formatOrderCoordinates(coordinates)}
      </p>
    </section>
  );
}
