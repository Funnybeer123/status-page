import { isPartnerRel } from "@/lib/rels";

export type MarriedPerson = {
  id: string;
  displayName: string;
  deathDate?: Date | string | null;
};

export type MarriedRel = {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  type: string;
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
};

export type MarriedRow = {
  id: string;
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  startedOn: string;
  years: number;
  line: string;
};

function utcParts(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return { y: date.getUTCFullYear(), m: date.getUTCMonth(), d: date.getUTCDate() };
}

export function isoDayKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export function yearsBetween(start: Date | string, end: Date | string) {
  const a = utcParts(start);
  const b = utcParts(end);
  let years = b.y - a.y;
  if (b.m < a.m || (b.m === a.m && b.d < a.d)) years -= 1;
  return years >= 0 ? years : 0;
}

export function marriageEndDate(
  rel: { endedAt?: Date | string | null },
  a?: { deathDate?: Date | string | null },
  b?: { deathDate?: Date | string | null },
  asOf: Date | string = new Date(),
) {
  if (rel.endedAt) return rel.endedAt;
  const deaths = [a?.deathDate, b?.deathDate].filter((value): value is Date | string => Boolean(value));
  if (!deaths.length) return asOf;
  return [...deaths].sort((left, right) => isoDayKey(left).localeCompare(isoDayKey(right)))[0]!;
}

export function yearsMarried(
  startedAt?: Date | string | null,
  endedAt?: Date | string | null,
  asOf: Date | string = new Date(),
) {
  if (!startedAt) return null;
  return yearsBetween(startedAt, endedAt || asOf);
}

export function yearsMarriedLabel(years: number) {
  if (years <= 0) return "married this year";
  if (years === 1) return "1 year married";
  return `${years} years married`;
}

export function marriedLine(a?: string | null, b?: string | null, years?: number | null) {
  const left = a?.trim() || "A spouse";
  const right = b?.trim() || "A spouse";
  if (years == null) return `${left} and ${right}`;
  return `${left} and ${right} · ${yearsMarriedLabel(years)}`;
}

export function marriedHeading(count: number) {
  if (!count) return "No wedding years yet";
  if (count === 1) return "1 couple on the wedding-year roll";
  return `${count} couples on the wedding-year roll`;
}

export function missingMarriedHeading(count: number) {
  if (!count) return "Every couple already has a wedding date";
  if (count === 1) return "1 couple still needs a wedding date";
  return `${count} couples still need a wedding date`;
}

export function longestMarriageHeading(row?: { aName?: string; bName?: string; years?: number } | null) {
  if (!row) return "No longest marriage yet";
  return `Longest marriage · ${marriedLine(row.aName, row.bName, row.years)}`;
}

export function compileYearsMarried(
  people: MarriedPerson[],
  relationships: MarriedRel[],
  asOf: Date | string = new Date(),
) {
  const byId = new Map(people.map((person) => [person.id, person]));
  const rows: MarriedRow[] = [];
  for (const rel of relationships) {
    if (!isPartnerRel(rel.type) || !rel.startedAt) continue;
    const a = byId.get(rel.fromPersonId);
    const b = byId.get(rel.toPersonId);
    if (!a || !b) continue;
    const [left, right] = [a, b].sort((x, y) => x.displayName.localeCompare(y.displayName));
    const end = marriageEndDate(rel, a, b, asOf);
    const years = yearsBetween(rel.startedAt, end);
    rows.push({
      id: rel.id,
      aId: left.id,
      bId: right.id,
      aName: left.displayName,
      bName: right.displayName,
      startedOn: isoDayKey(rel.startedAt),
      years,
      line: marriedLine(left.displayName, right.displayName, years),
    });
  }
  return rows.sort((a, b) => b.years - a.years || a.aName.localeCompare(b.aName) || a.bName.localeCompare(b.bName));
}

export function compileMissingMarried(people: MarriedPerson[], relationships: MarriedRel[]) {
  const byId = new Map(people.map((person) => [person.id, person]));
  return relationships
    .filter((rel) => isPartnerRel(rel.type) && !rel.startedAt)
    .map((rel) => {
      const a = byId.get(rel.fromPersonId);
      const b = byId.get(rel.toPersonId);
      return {
        id: rel.id,
        line: marriedLine(a?.displayName, b?.displayName),
        aId: rel.fromPersonId,
        bId: rel.toPersonId,
      };
    })
    .sort((a, b) => a.line.localeCompare(b.line));
}
