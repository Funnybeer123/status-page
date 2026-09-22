import { lookupCoordinates, type GeoPoint } from "@/lib/geocode";

export type SchoolRow = {
  id: string;
  school: string;
  place?: string | null;
  person: { id: string; displayName: string };
};

export type SchoolCluster = {
  school: string;
  place: string;
  count: number;
  people: { id: string; displayName: string }[];
  latitude: number;
  longitude: number;
};

export function schoolMapHeading(count: number) {
  if (!count) return "No schools on the map yet";
  if (count === 1) return "1 school on the map";
  return `${count} schools on the map`;
}

export function schoolPinLine(school: string, place: string, count: number) {
  const where = place.trim() || "an unknown place";
  const name = school.trim() || "A school";
  if (count === 1) return `${name} · ${where} · 1 student`;
  return `${name} · ${where} · ${count} students`;
}

export function unmappedSchoolsHeading(count: number) {
  if (!count) return "Every school has a place on the map";
  if (count === 1) return "1 school is still missing a place";
  return `${count} schools are still missing a place`;
}

export function clusterSchools(rows: SchoolRow[]): SchoolCluster[] {
  const buckets = new Map<string, SchoolCluster>();
  for (const row of rows) {
    const place = row.place?.trim() || "";
    const point = pointFor(row.school, place);
    if (!point) continue;
    const school = row.school.trim() || "A school";
    const label = place || "Unknown place";
    const key = `${school.toLowerCase()}|${label.toLowerCase()}|${point.latitude.toFixed(2)}|${point.longitude.toFixed(2)}`;
    const cluster = buckets.get(key) ?? {
      school,
      place: label,
      count: 0,
      people: [],
      latitude: point.latitude,
      longitude: point.longitude,
    };
    if (!cluster.people.some((person) => person.id === row.person.id)) {
      cluster.people.push(row.person);
      cluster.count += 1;
    }
    buckets.set(key, cluster);
  }
  return [...buckets.values()].sort((a, b) => a.school.localeCompare(b.school) || a.place.localeCompare(b.place));
}

function pointFor(school: string, place: string): GeoPoint | null {
  return lookupCoordinates({ name: school, locality: place }) || lookupCoordinates({ name: place, locality: place });
}
