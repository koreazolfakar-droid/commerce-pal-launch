import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

type Coordinates = {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  placeId?: string;
  areaStreet?: string;
};

type LatLngLike = {
  lat: () => number;
  lng: () => number;
};

type GoogleMapInstance = {
  setCenter: (position: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
};

type GoogleMarkerInstance = {
  setPosition: (position: { lat: number; lng: number }) => void;
  getPosition: () => LatLngLike | null;
  addListener: (event: string, handler: () => void) => unknown;
};

type GoogleGeocoderResult = {
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location?: LatLngLike;
  };
  address_components?: Array<{
    long_name?: string;
    types?: string[];
  }>;
};

type GoogleGeocoderInstance = {
  geocode: (
    request: Record<string, unknown>,
    callback: (results: GoogleGeocoderResult[] | null, status: string) => void,
  ) => void;
};

type GoogleMapsNamespace = {
  Map: new (
    element: HTMLElement,
    options: {
      center: { lat: number; lng: number };
      zoom: number;
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      gestureHandling?: string;
      clickableIcons?: boolean;
    },
  ) => GoogleMapInstance;
  Marker: new (options: {
    map: GoogleMapInstance;
    position: { lat: number; lng: number };
    draggable: boolean;
    animation?: unknown;
  }) => GoogleMarkerInstance;
  Geocoder: new () => GoogleGeocoderInstance;
  Animation?: { DROP?: unknown };
};

declare global {
  interface Window {
    google?: {
      maps?: GoogleMapsNamespace;
    };
    __spaceCallGoogleMapsPromise?: Promise<GoogleMapsNamespace>;
  }
}

const DEFAULT_LEBANON_CENTER = { latitude: 33.8938, longitude: 35.5018 };

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__spaceCallGoogleMapsPromise) return window.__spaceCallGoogleMapsPromise;

  window.__spaceCallGoogleMapsPromise = new Promise<GoogleMapsNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-space-call-google-maps="true"]',
    );
    const finish = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error("Google Maps failed to initialize"));
    };

    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google Maps failed to load")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      encodeURIComponent(apiKey) +
      "&v=weekly&loading=async";
    script.async = true;
    script.defer = true;
    script.dataset.spaceCallGoogleMaps = "true";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Google Maps failed to load")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return window.__spaceCallGoogleMapsPromise;
}

function areaStreetFromResult(result: GoogleGeocoderResult | undefined) {
  if (!result?.address_components) return "";
  const find = (...types: string[]) =>
    result.address_components?.find((component) =>
      component.types?.some((type) => types.includes(type)),
    )?.long_name || "";

  const route = find("route");
  const locality = find(
    "sublocality",
    "sublocality_level_1",
    "locality",
    "administrative_area_level_2",
  );
  return [locality, route].filter(Boolean).join(", ");
}

function positionFromResult(result: GoogleGeocoderResult | undefined) {
  const location = result?.geometry?.location;
  if (!location) return null;
  return { latitude: location.lat(), longitude: location.lng() };
}

export function GoogleDeliveryMap({
  value,
  onChange,
  autoLocateToken,
  initialQuery,
}: {
  value: Coordinates | null;
  onChange: (next: Coordinates) => void;
  autoLocateToken?: number;
  initialQuery?: string;
}) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markerRef = useRef<GoogleMarkerInstance | null>(null);
  const geocoderRef = useRef<GoogleGeocoderInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const lastAutoLocate = useRef<number | undefined>(undefined);
  const lastInitialSearch = useRef("");
  const [query, setQuery] = useState(initialQuery?.trim() || "");
  const [mapReady, setMapReady] = useState(false);
  const [loadingMap, setLoadingMap] = useState(Boolean(apiKey));
  const [mapError, setMapError] = useState("");
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const reverseGeocode = useCallback((latitude: number, longitude: number) => {
    const geocoder = geocoderRef.current;
    if (!geocoder) {
      onChangeRef.current({ latitude, longitude });
      return;
    }

    geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
      const first = status === "OK" && results?.length ? results[0] : undefined;
      onChangeRef.current({
        latitude,
        longitude,
        formattedAddress: first?.formatted_address || "",
        placeId: first?.place_id || "",
        areaStreet: areaStreetFromResult(first),
      });
    });
  }, []);

  useEffect(() => {
    if (!apiKey || !containerRef.current || mapRef.current) {
      if (!apiKey) setLoadingMap(false);
      return;
    }

    let cancelled = false;
    void loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const center = value
          ? { lat: value.latitude, lng: value.longitude }
          : {
              lat: DEFAULT_LEBANON_CENTER.latitude,
              lng: DEFAULT_LEBANON_CENTER.longitude,
            };

        const map = new maps.Map(containerRef.current, {
          center,
          zoom: value ? 17 : 11,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        const marker = new maps.Marker({
          map,
          position: center,
          draggable: true,
          animation: maps.Animation?.DROP,
        });
        const geocoder = new maps.Geocoder();

        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = geocoder;
        marker.addListener("dragend", () => {
          const position = marker.getPosition();
          if (!position) return;
          reverseGeocode(position.lat(), position.lng());
        });
        setMapReady(true);
        setLoadingMap(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadingMap(false);
        setMapError(
          ar
            ? "تعذر تحميل الخريطة. يمكنك إعادة المحاولة أو استخدام موقعك الحالي."
            : "The map could not load. Retry or use your current location.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, ar, reverseGeocode, value?.latitude, value?.longitude]);

  useEffect(() => {
    if (!value || !mapRef.current || !markerRef.current) return;
    const position = { lat: value.latitude, lng: value.longitude };
    markerRef.current.setPosition(position);
    mapRef.current.setCenter(position);
    mapRef.current.setZoom(17);
  }, [value?.latitude, value?.longitude]);

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMapError(ar ? "المتصفح لا يدعم تحديد الموقع." : "Location is not supported.");
      return;
    }
    setLocating(true);
    setMapError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        reverseGeocode(latitude, longitude);
        const point = { lat: latitude, lng: longitude };
        markerRef.current?.setPosition(point);
        mapRef.current?.setCenter(point);
        mapRef.current?.setZoom(18);
      },
      () => {
        setLocating(false);
        setMapError(
          ar
            ? "لم نتمكن من الوصول إلى موقعك. فعّل صلاحية الموقع ثم حاول مجددًا."
            : "We could not access your location. Enable location permission and try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, [ar, reverseGeocode]);

  useEffect(() => {
    if (!autoLocateToken || lastAutoLocate.current === autoLocateToken) return;
    lastAutoLocate.current = autoLocateToken;
    useCurrentLocation();
  }, [autoLocateToken, useCurrentLocation]);

  const geocodeQuery = useCallback(
    (rawQuery: string) => {
      const nextQuery = rawQuery.trim();
      if (!nextQuery) return;

      const geocoder = geocoderRef.current;
      if (!geocoder) {
        setMapError(
          ar
            ? "البحث عن الشوارع غير متاح الآن. استخدم موقعك الحالي أو أدخل العنوان يدويًا."
            : "Street search is not available right now. Use your current location or enter the address manually.",
        );
        return;
      }

      setSearching(true);
      setMapError("");
      geocoder.geocode({ address: nextQuery, region: "LB" }, (results, status) => {
        setSearching(false);
        const first = status === "OK" && results?.length ? results[0] : undefined;
        const point = positionFromResult(first);
        if (!first || !point) {
          setMapError(
            ar
              ? "لم نجد هذا المكان. جرّب اسم شارع أو منطقة أخرى."
              : "Place not found. Try another area or street.",
          );
          return;
        }
        const position = { lat: point.latitude, lng: point.longitude };
        markerRef.current?.setPosition(position);
        mapRef.current?.setCenter(position);
        mapRef.current?.setZoom(17);
        onChangeRef.current({
          ...point,
          formattedAddress: first.formatted_address || nextQuery,
          placeId: first.place_id || "",
          areaStreet: areaStreetFromResult(first),
        });
      });
    },
    [ar],
  );

  useEffect(() => {
    const nextInitialQuery = initialQuery?.trim() || "";
    if (!nextInitialQuery || !mapReady || lastInitialSearch.current === nextInitialQuery) return;
    lastInitialSearch.current = nextInitialQuery;
    setQuery(nextInitialQuery);
    geocodeQuery(nextInitialQuery);
  }, [geocodeQuery, initialQuery, mapReady]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    geocodeQuery(query);
  };

  const fallback = value || DEFAULT_LEBANON_CENTER;
  const embedUrl =
    "https://maps.google.com/maps?q=" +
    fallback.latitude.toFixed(6) +
    "," +
    fallback.longitude.toFixed(6) +
    "&z=16&output=embed";

  return (
    <div className="relative min-h-[55dvh] overflow-hidden bg-muted/30">
      <form
        onSubmit={search}
        className="absolute inset-x-4 top-4 z-20 flex h-14 items-center gap-2 rounded-2xl border border-border/70 bg-background/95 px-4 shadow-lg backdrop-blur"
      >
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ar ? "ابحث عن منطقة أو اسم شارع..." : "Search for area, street name..."}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
          aria-label={ar ? "بحث عن موقع" : "Search for a location"}
        />
        {searching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      </form>

      {apiKey ? (
        <div
          ref={containerRef}
          className="absolute inset-0"
          data-testid="customer-delivery-map"
        />
      ) : (
        <iframe
          title={ar ? "خريطة موقع التوصيل" : "Delivery location map"}
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}

      {loadingMap ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-background/60">
          <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
        </div>
      ) : null}

      <div className="absolute inset-x-4 bottom-4 z-20 space-y-2">
        {mapError ? (
          <div role="status" className="rounded-xl bg-background/95 px-4 py-3 text-sm shadow-lg">
            {mapError}
          </div>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="h-12 w-full rounded-2xl bg-background/95 font-bold shadow-lg hover:bg-background"
          onClick={useCurrentLocation}
          disabled={locating}
        >
          {locating ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair className="me-2 h-4 w-4" aria-hidden="true" />
          )}
          {locating
            ? ar
              ? "جارٍ تحديد موقعك..."
              : "Locating you..."
            : ar
              ? "استخدام موقعي الحالي"
              : "Use current location"}
        </Button>
      </div>

      {value ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-[3.25rem] rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background shadow-lg">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {ar ? "سيتم التوصيل هنا" : "Your order will be delivered here"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
