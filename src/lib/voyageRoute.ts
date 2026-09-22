import { lookupCoordinates, type GeoPoint } from "@/lib/geocode";

export type VoyageRoute = {
  from: GeoPoint & { name: string };
  to: GeoPoint & { name: string };
  label: string;
};

export function voyageRoute(voyage?: { departedFrom?: string | null; arrivedAt?: string | null } | null): VoyageRoute | null {
  if (!voyage?.departedFrom || !voyage.arrivedAt) return null;
  const from = lookupCoordinates({ name: voyage.departedFrom });
  const to = lookupCoordinates({ name: voyage.arrivedAt });
  if (!from || !to) return null;
  return {
    from: { ...from, name: voyage.departedFrom },
    to: { ...to, name: voyage.arrivedAt },
    label: `${voyage.departedFrom} to ${voyage.arrivedAt}`,
  };
}

export function voyageRouteHeading(ship: string, from?: string | null, to?: string | null) {
  const vessel = ship.trim() || "This voyage";
  if (from && to) return `${vessel} · ${from} to ${to}`;
  return `${vessel} route`;
}

export function voyageRouteLine(from: string, to: string) {
  return `${from} → ${to}`;
}

export function voyageRoutePoints(route: VoyageRoute) {
  return [route.from, route.to];
}
