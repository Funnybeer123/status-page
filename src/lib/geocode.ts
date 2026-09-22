export type GeoPoint = { latitude: number; longitude: number };

const KNOWN: { test: RegExp; point: GeoPoint }[] = [
  { test: /market street/i, point: { latitude: 42.529, longitude: -92.446 } },
  { test: /north farm|grange hall/i, point: { latitude: 42.54, longitude: -92.452 } },
  { test: /iowa city/i, point: { latitude: 41.6611, longitude: -91.5302 } },
  { test: /cedar falls/i, point: { latitude: 42.5278, longitude: -92.4453 } },
];

export function lookupCoordinates(input: {
  name?: string | null;
  locality?: string | null;
  region?: string | null;
  country?: string | null;
}): GeoPoint | null {
  const blob = [input.name, input.locality, input.region, input.country].filter(Boolean).join(" ");
  if (!blob) return null;
  const hit = KNOWN.find((item) => item.test.test(blob));
  return hit?.point ?? null;
}

export function parseCoord(value?: string | number | null) {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function mapBounds(points: GeoPoint[]) {
  if (!points.length) return null;
  const lats = points.map((point) => point.latitude);
  const lngs = points.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 0.08;
  return {
    minLng: minLng - pad,
    minLat: minLat - pad,
    maxLng: maxLng + pad,
    maxLat: maxLat + pad,
    center: { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2 },
  };
}

export type MapBounds = NonNullable<ReturnType<typeof mapBounds>>;

export function projectPoint(point: GeoPoint, bounds: MapBounds, width: number, height: number) {
  const xPad = 36;
  const yPad = 28;
  const x = xPad + ((point.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (width - xPad * 2);
  const y = yPad + ((bounds.maxLat - point.latitude) / (bounds.maxLat - bounds.minLat)) * (height - yPad * 2);
  return { x, y };
}

export function osmEmbedUrl(points: GeoPoint[]) {
  const bounds = mapBounds(points);
  if (!bounds) return null;
  const { minLng, minLat, maxLng, maxLat, center } = bounds;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${center.latitude}%2C${center.longitude}`;
}

export function osmBrowseUrl(points: GeoPoint[]) {
  const bounds = mapBounds(points);
  if (!bounds) return null;
  return `https://www.openstreetmap.org/?mlat=${bounds.center.latitude}&mlon=${bounds.center.longitude}#map=10/${bounds.center.latitude}/${bounds.center.longitude}`;
}
