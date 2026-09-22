import { rangesOverlap } from "@/lib/occupations";
import { formatDate } from "@/lib/dates";

export type ResidenceSpan = {
  id: string;
  personId: string;
  personName: string;
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
};

export function overlappingResidents(rows: ResidenceSpan[]) {
  const pairs: { a: ResidenceSpan; b: ResidenceSpan; line: string }[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      if (!a || !b || a.personId === b.personId) continue;
      if (rangesOverlap(a.startedAt, a.endedAt, b.startedAt, b.endedAt)) {
        pairs.push({ a, b, line: contemporaryLine(a.personName, b.personName) });
      }
    }
  }
  return pairs;
}

export function peopleWhoLivedTogether(rows: ResidenceSpan[]) {
  const ids = new Set<string>();
  for (const pair of overlappingResidents(rows)) {
    ids.add(pair.a.personId);
    ids.add(pair.b.personId);
  }
  return rows.filter((row, index) => ids.has(row.personId) && rows.findIndex((item) => item.personId === row.personId) === index);
}

export function contemporaryLine(first: string, second: string) {
  return `${first.trim() || "Someone"} lived here at the same time as ${second.trim() || "someone else"}`;
}

export function contemporariesHeading(placeName: string, count: number) {
  const where = placeName.trim() || "this place";
  if (!count) return `No overlapping years recorded at ${where}`;
  if (count === 1) return `1 pair lived at ${where} at the same time`;
  return `${count} pairs lived at ${where} at the same time`;
}

export function residenceYears(startedAt?: Date | string | null, endedAt?: Date | string | null) {
  const start = formatDate(startedAt, "");
  const end = formatDate(endedAt, "");
  if (start && end) return `${start} – ${end}`;
  if (start) return `${start} –`;
  if (end) return `– ${end}`;
  return "Years unknown";
}

export function lonelyPlacesHeading(count: number) {
  if (!count) return "Every place with two residences has overlapping years";
  if (count === 1) return "1 place has no overlapping years";
  return `${count} places have no overlapping years`;
}
