/** Immutable delivery coordinates recorded on the order at checkout. */
export type OrderDeliveryCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export function parseOrderDeliveryLocation(value: unknown): OrderDeliveryCoordinates | null {
  // Older records can contain serialized JSON rather than a native JSON object.
  if (typeof value === "string") {
    if (!value.trim() || value.length > 4096) return null;
    try {
      return parseOrderDeliveryLocation(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const point = value as Record<string, unknown>;
  const { latitude, longitude, accuracy } = point;

  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  if (
    accuracy != null &&
    (typeof accuracy !== "number" ||
      !Number.isFinite(accuracy) ||
      accuracy < 0 ||
      accuracy > 100_000)
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    // A saved pin has accuracy=0 (unknown), which must not be advertised as GPS precision.
    accuracy: typeof accuracy === "number" && accuracy > 0 ? accuracy : null,
  };
}

export function orderLocationMapUrl(location: OrderDeliveryCoordinates): string {
  return `https://maps.google.com/maps?q=${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}&z=17&output=embed`;
}

export function orderLocationDirectionsUrl(location: OrderDeliveryCoordinates): string {
  const destination = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function formatOrderCoordinates(location: OrderDeliveryCoordinates): string {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
}
