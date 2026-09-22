import { placeMapPoint } from "@/lib/placeGps";

export function residenceCompareHeading(a?: string | null, b?: string | null) {
  const left = a?.trim() || "the first person";
  const right = b?.trim() || "the second person";
  return `Residences of ${left} and ${right}`;
}

export function missingResidencesHeading(count: number) {
  if (!count) return "Everyone has a residence to compare";
  if (count === 1) return "1 person still needs a residence";
  return `${count} people still need a residence`;
}

function dateKey(value?: Date | string | null, fallback = "") {
  if (!value) return `~${fallback}`;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

export function sortResidences<T extends { startedAt?: Date | string | null; endedAt?: Date | string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => dateKey(a.startedAt, dateKey(a.endedAt)).localeCompare(dateKey(b.startedAt, dateKey(b.endedAt))));
}

export function residenceMapPoint(place: {
  latitude?: number | string | null;
  longitude?: number | string | null;
  gps?: string | null;
}) {
  const latitude = place.latitude == null || place.latitude === "" ? null : Number(place.latitude);
  const longitude = place.longitude == null || place.longitude === "" ? null : Number(place.longitude);
  return placeMapPoint({
    gps: place.gps,
    latitude: latitude != null && Number.isFinite(latitude) ? latitude : null,
    longitude: longitude != null && Number.isFinite(longitude) ? longitude : null,
  });
}

export function compareResidencePoints<
  T extends {
    personName: string;
    placeName: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    gps?: string | null;
  },
>(rows: T[]) {
  const points: Array<T & { latitude: number; longitude: number; label: string }> = [];
  for (const row of rows) {
    const point = residenceMapPoint(row);
    if (point) points.push({ ...row, latitude: point.latitude, longitude: point.longitude, label: point.label });
  }
  return points;
}

export function addressCardHeading(name: string) {
  return `Address card for ${name.trim() || "this person"}`;
}

export function addressCardLine(name: string, place?: { name?: string | null; locality?: string | null; region?: string | null } | null) {
  const who = name.trim() || "This person";
  const parts = [place?.name, place?.locality, place?.region].map((part) => part?.trim()).filter(Boolean);
  return parts.length ? `${who} · ${parts.join(", ")}` : `${who} · Address unknown`;
}
