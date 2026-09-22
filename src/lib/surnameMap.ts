import { groupSurnames, type SurnamePerson } from "@/lib/surnames";
import { lookupCoordinates, type GeoPoint } from "@/lib/geocode";

export type SurnameResidence = {
  personId: string;
  place: {
    name?: string | null;
    locality?: string | null;
    region?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
};

export type SurnameCluster = {
  surname: string;
  place: string;
  count: number;
  people: { id: string; displayName: string }[];
  latitude: number;
  longitude: number;
};

export function surnameMapHeading(count: number) {
  if (!count) return "No surname clusters on the map yet";
  if (count === 1) return "1 surname clustered on the map";
  return `${count} surnames clustered on the map`;
}

export function surnameClusterLine(surname: string, place: string, count: number) {
  const where = place.trim() || "an unknown place";
  if (count === 1) return `1 ${surname} at ${where}`;
  return `${count} ${surname} at ${where}`;
}

function placeName(place: SurnameResidence["place"]) {
  return place.name?.trim() || place.locality?.trim() || [place.locality, place.region].filter(Boolean).join(", ") || "Unknown place";
}

function pointFor(place: SurnameResidence["place"]): GeoPoint | null {
  if (place.latitude != null && place.longitude != null) {
    return { latitude: place.latitude, longitude: place.longitude };
  }
  return lookupCoordinates(place);
}

export function clusterSurnames(people: SurnamePerson[], residences: SurnameResidence[]): SurnameCluster[] {
  const groups = groupSurnames(people);
  const homes = new Map<string, SurnameResidence[]>();
  for (const row of residences) {
    const list = homes.get(row.personId) ?? [];
    list.push(row);
    homes.set(row.personId, list);
  }
  const buckets = new Map<string, SurnameCluster>();
  for (const group of groups) {
    for (const person of group.people) {
      for (const home of homes.get(person.id) ?? []) {
        const point = pointFor(home.place);
        if (!point) continue;
        const place = placeName(home.place);
        const key = `${group.surname.toLowerCase()}|${place.toLowerCase()}|${point.latitude.toFixed(2)}|${point.longitude.toFixed(2)}`;
        const cluster = buckets.get(key) ?? {
          surname: group.surname,
          place,
          count: 0,
          people: [],
          latitude: point.latitude,
          longitude: point.longitude,
        };
        if (!cluster.people.some((item) => item.id === person.id)) {
          cluster.people.push(person);
          cluster.count += 1;
        }
        buckets.set(key, cluster);
      }
    }
  }
  return [...buckets.values()].sort((a, b) => a.surname.localeCompare(b.surname) || a.place.localeCompare(b.place));
}
