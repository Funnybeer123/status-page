import { formatYear } from "@/lib/dates";
import { placeMapPoint } from "@/lib/placeGps";

export function thenNowMapHeading(place?: string | null) {
  const name = place?.trim();
  return name ? `Then and now · ${name}` : "Then and now on the map";
}

export function thenNowYearLine(thenWhen?: Date | string | null, nowWhen?: Date | string | null) {
  const thenYear = formatYear(thenWhen) || "Then";
  const nowYear = formatYear(nowWhen) || "Now";
  return `${thenYear} and ${nowYear}`;
}

export function missingThenNowHeading(count: number) {
  if (!count) return "Every then-and-now pair sits on the map";
  if (count === 1) return "1 then-and-now pair still needs a place";
  return `${count} then-and-now pairs still need a place`;
}

export function compileThenNowMap<
  T extends {
    id: string;
    title: string;
    place?: { id: string; name: string; gps?: string | null; latitude?: number | null; longitude?: number | null } | null;
    thenAsset?: { capturedAt?: Date | string | null; title?: string | null; place?: T["place"] } | null;
    nowAsset?: { capturedAt?: Date | string | null; title?: string | null; place?: T["place"] } | null;
  },
>(pairs: T[]) {
  return pairs
    .map((pair) => {
      const place = pair.place || pair.thenAsset?.place || pair.nowAsset?.place || null;
      const point = place ? placeMapPoint(place) : null;
      if (!place || !point) return null;
      return {
        id: pair.id,
        title: pair.title,
        placeId: place.id,
        placeName: place.name,
        heading: thenNowMapHeading(place.name),
        years: thenNowYearLine(pair.thenAsset?.capturedAt, pair.nowAsset?.capturedAt),
        thenTitle: pair.thenAsset?.title || "Then",
        nowTitle: pair.nowAsset?.title || "Now",
        latitude: point.latitude,
        longitude: point.longitude,
        href: `/map/then-now?placeId=${place.id}`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}
