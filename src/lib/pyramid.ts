import { ageAt } from "@/lib/dates";

export const PYRAMID_BANDS = [
  { key: "0-17", label: "Under 18", min: 0, max: 17 },
  { key: "18-29", label: "18 to 29", min: 18, max: 29 },
  { key: "30-44", label: "30 to 44", min: 30, max: 44 },
  { key: "45-59", label: "45 to 59", min: 45, max: 59 },
  { key: "60-74", label: "60 to 74", min: 60, max: 74 },
  { key: "75+", label: "75 and older", min: 75, max: 200 },
] as const;

export type PyramidPerson = {
  id: string;
  displayName: string;
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
  deletedAt?: Date | string | null;
};

export type PyramidBand = {
  key: string;
  label: string;
  count: number;
  people: { id: string; displayName: string; age: number | null }[];
};

export function pyramidHeading(count: number) {
  if (!count) return "No living relatives to chart yet";
  if (count === 1) return "1 living relative on the age pyramid";
  return `${count} living relatives on the age pyramid`;
}

export function pyramidBandLine(label: string, count: number) {
  if (!count) return `${label} · none`;
  if (count === 1) return `${label} · 1 person`;
  return `${label} · ${count} people`;
}

export function buildAgePyramid(people: PyramidPerson[], on = new Date()): { bands: PyramidBand[]; unknown: PyramidBand; heading: string } {
  const living = people.filter((person) => !person.deletedAt && !person.deathDate);
  const bands: PyramidBand[] = PYRAMID_BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    count: 0,
    people: [],
  }));
  const unknown: PyramidBand = { key: "unknown", label: "Age unknown", count: 0, people: [] };
  for (const person of living) {
    const age = ageAt(person.birthDate, on);
    const row = { id: person.id, displayName: person.displayName, age };
    if (age == null) {
      unknown.people.push(row);
      unknown.count += 1;
      continue;
    }
    const band = bands.find((item, index) => {
      const spec = PYRAMID_BANDS[index];
      return spec && age >= spec.min && age <= spec.max;
    });
    if (band) {
      band.people.push(row);
      band.count += 1;
    } else {
      unknown.people.push(row);
      unknown.count += 1;
    }
  }
  for (const band of bands) {
    band.people.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
  unknown.people.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { bands, unknown, heading: pyramidHeading(living.length) };
}
