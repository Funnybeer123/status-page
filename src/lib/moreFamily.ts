import { ageAt } from "@/lib/dates";
import { isParentRel, parentsOf, siblingKind, type RelRow } from "@/lib/rels";

export function longevityRows(
  people: {
    id: string;
    displayName: string;
    birthDate?: Date | string | null;
    deathDate?: Date | string | null;
    deletedAt?: Date | string | null;
  }[],
) {
  return people
    .filter((person) => !person.deletedAt && person.birthDate && person.deathDate)
    .map((person) => ({
      id: person.id,
      displayName: person.displayName,
      years: ageAt(person.birthDate, person.deathDate),
      birthDate: person.birthDate,
      deathDate: person.deathDate,
    }))
    .filter((row) => row.years != null)
    .sort((a, b) => (b.years ?? 0) - (a.years ?? 0));
}

export function cousinsOf(
  personId: string,
  people: { id: string; displayName: string }[],
  relationships: RelRow[],
) {
  const parentIds = parentsOf(personId, relationships).map((rel) => rel.fromPersonId);
  const names = new Map(people.map((person) => [person.id, person.displayName]));
  const auntUncleIds = new Set<string>();
  for (const parentId of parentIds) {
    for (const person of people) {
      const kind = siblingKind(parentId, person.id, relationships);
      if (kind === "full" || kind === "half") auntUncleIds.add(person.id);
    }
  }
  const cousins: { id: string; displayName: string; via: string }[] = [];
  for (const auntId of auntUncleIds) {
    for (const rel of relationships) {
      if (!isParentRel(rel.type) || rel.fromPersonId !== auntId) continue;
      if (rel.toPersonId === personId || parentIds.includes(rel.toPersonId)) continue;
      if (siblingKind(personId, rel.toPersonId, relationships)) continue;
      if (cousins.some((cousin) => cousin.id === rel.toPersonId)) continue;
      const name = names.get(rel.toPersonId);
      if (!name) continue;
      cousins.push({ id: rel.toPersonId, displayName: name, via: names.get(auntId) || "" });
    }
  }
  return cousins.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function photographedCounts(
  people: { id: string; displayName: string }[],
  tags: { personId: string }[],
) {
  const counts = new Map<string, number>();
  for (const tag of tags) counts.set(tag.personId, (counts.get(tag.personId) ?? 0) + 1);
  return people
    .map((person) => ({ ...person, photos: counts.get(person.id) ?? 0 }))
    .sort((a, b) => b.photos - a.photos || a.displayName.localeCompare(b.displayName));
}

export function unidentifiedPhotos<T extends { tags?: unknown[]; deletedAt?: Date | string | null; kind?: string }>(
  assets: T[],
) {
  return assets.filter((asset) => !asset.deletedAt && (!asset.tags || asset.tags.length === 0));
}

export function groupByYear<T extends { writtenAt?: Date | string | null; capturedAt?: Date | string | null }>(
  items: T[],
  field: "writtenAt" | "capturedAt" = "writtenAt",
) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const raw = item[field];
    const year = raw ? String(new Date(raw).getUTCFullYear()) : "Undated";
    groups.set(year, [...(groups.get(year) ?? []), item]);
  }
  return [...groups.entries()].sort((a, b) => {
    if (a[0] === "Undated") return 1;
    if (b[0] === "Undated") return -1;
    return b[0].localeCompare(a[0]);
  });
}

export function livingPeople<T extends { deathDate?: Date | string | null; deletedAt?: Date | string | null }>(
  people: T[],
) {
  return people.filter((person) => !person.deletedAt && !person.deathDate);
}

export function directoryRows(
  people: {
    id: string;
    displayName: string;
    familyName?: string | null;
    birthDate?: Date | string | null;
    deathDate?: Date | string | null;
    deletedAt?: Date | string | null;
  }[],
  claims: { personId: string | null; userName: string }[],
) {
  const claimed = new Map(
    claims.filter((claim) => claim.personId).map((claim) => [claim.personId as string, claim.userName]),
  );
  return people
    .filter((person) => !person.deletedAt)
    .map((person) => ({
      id: person.id,
      displayName: person.displayName,
      familyName: person.familyName || "",
      living: !person.deathDate,
      claimedBy: claimed.get(person.id) || null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function qualifyDate(
  formatted: string,
  precision?: string | null,
  fallback = "Date unknown",
) {
  if (!formatted || formatted === fallback) return formatted;
  if (precision === "circa") return `about ${formatted}`;
  if (precision === "before") return `before ${formatted}`;
  if (precision === "after") return `after ${formatted}`;
  return formatted;
}
