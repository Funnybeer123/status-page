import { lookupCoordinates, type GeoPoint } from "@/lib/geocode";

export type CemeteryPin = {
  id: string;
  name: string;
  locality?: string | null;
  region?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  plots?: number;
};

export function cemeteryPoint(cemetery: CemeteryPin): GeoPoint | null {
  if (cemetery.latitude != null && cemetery.longitude != null) {
    return { latitude: cemetery.latitude, longitude: cemetery.longitude };
  }
  return lookupCoordinates({
    name: cemetery.name,
    locality: cemetery.locality,
    region: cemetery.region,
    country: cemetery.country,
  });
}

export function cemeteryMapPoints(cemeteries: CemeteryPin[]) {
  return cemeteries
    .map((cemetery) => {
      const point = cemeteryPoint(cemetery);
      if (!point) return null;
      return { ...cemetery, latitude: point.latitude, longitude: point.longitude };
    })
    .filter((row): row is CemeteryPin & GeoPoint => Boolean(row));
}
