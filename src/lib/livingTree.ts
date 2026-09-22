import { isLiving } from "@/lib/privacy";

export function livingPeople<T extends { deathDate?: Date | string | null; deletedAt?: Date | string | null }>(
  people: T[],
) {
  return people.filter((person) => !person.deletedAt && isLiving(person));
}

export function livingRelationships<
  P extends { id: string; deathDate?: Date | string | null; deletedAt?: Date | string | null },
  R extends { fromPersonId: string; toPersonId: string },
>(people: P[], relationships: R[]) {
  const livingIds = new Set(livingPeople(people).map((person) => person.id));
  return relationships.filter((rel) => livingIds.has(rel.fromPersonId) && livingIds.has(rel.toPersonId));
}

export function livingTreeHeading(count: number) {
  if (!count) return "No living relatives on the tree";
  if (count === 1) return "1 living relative on the tree";
  return `${count} living relatives on the tree`;
}

export function reunionLivingHeading(title: string, count: number) {
  const name = title.trim() || "the reunion";
  if (!count) return `No living relatives for ${name}`;
  if (count === 1) return `1 living relative for ${name}`;
  return `${count} living relatives for ${name}`;
}

export function reunionLivingListHeading(count: number) {
  if (!count) return "No living guests yet";
  if (count === 1) return "1 living guest";
  return `${count} living guests`;
}
