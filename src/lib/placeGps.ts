export function parseGps(value?: string | null) {
  if (!value) return null;
  const text = value.trim();
  if (!text) return null;
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*([NnSs])?\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*([EeWw])?/);
  if (!match) return null;
  let latitude = Number(match[1]);
  let longitude = Number(match[3]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if ((match[2] || "").toLowerCase() === "s") latitude = -Math.abs(latitude);
  if ((match[2] || "").toLowerCase() === "n") latitude = Math.abs(latitude);
  if ((match[4] || "").toLowerCase() === "w") longitude = -Math.abs(longitude);
  if ((match[4] || "").toLowerCase() === "e") longitude = Math.abs(longitude);
  return { latitude, longitude, label: gpsLabel(latitude, longitude) };
}

export function gpsLabel(latitude: number, longitude: number) {
  const ns = latitude >= 0 ? "N" : "S";
  const ew = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(4)}° ${ns}, ${Math.abs(longitude).toFixed(4)}° ${ew}`;
}

export function placeGpsHeading(name: string) {
  return `GPS for ${name.trim() || "this place"}`;
}

export function missingGpsHeading(count: number) {
  if (!count) return "Every place has a GPS field";
  if (count === 1) return "1 place still needs a GPS field";
  return `${count} places still need a GPS field`;
}

export function hasGps(place: { gps?: string | null; latitude?: number | null; longitude?: number | null }) {
  return Boolean(place.gps?.trim() || (place.latitude != null && place.longitude != null));
}

export function placeMapPoint(place: { gps?: string | null; latitude?: number | null; longitude?: number | null }) {
  const parsed = parseGps(place.gps);
  if (parsed) return parsed;
  if (place.latitude != null && place.longitude != null) {
    return { latitude: place.latitude, longitude: place.longitude, label: gpsLabel(place.latitude, place.longitude) };
  }
  return null;
}

export function hasGpsField(place: { gps?: string | null }) {
  return Boolean(place.gps?.trim());
}
