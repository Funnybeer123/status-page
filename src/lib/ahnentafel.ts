import { RelType } from "@prisma/client";
import type { PedigreePerson } from "@/lib/pedigree";

export type AhnentafelRow = {
  number: number;
  person: PedigreePerson;
};

export function buildAhnentafel(
  personId: string,
  people: PedigreePerson[],
  relationships: { type: RelType | string; fromPersonId: string; toPersonId: string }[],
  maxNumber = 31,
): AhnentafelRow[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  const parentsOf = new Map<string, string[]>();
  for (const rel of relationships) {
    if (rel.type === RelType.parent || rel.type === RelType.adoptive || rel.type === RelType.step || rel.type === "parent" || rel.type === "adoptive" || rel.type === "step") {
      parentsOf.set(rel.toPersonId, [...(parentsOf.get(rel.toPersonId) ?? []), rel.fromPersonId]);
    }
  }

  const root = byId.get(personId);
  if (!root) return [];
  const rows: AhnentafelRow[] = [{ number: 1, person: root }];
  const queue: { id: string; number: number }[] = [{ id: personId, number: 1 }];
  const used = new Set<string>([personId]);

  while (queue.length) {
    const current = queue.shift()!;
    if (current.number * 2 > maxNumber) continue;
    const parents = [...(parentsOf.get(current.id) ?? [])];
    parents.sort((a, b) => {
      const sexA = (byId.get(a) as PedigreePerson & { sex?: string | null })?.sex ?? "";
      const sexB = (byId.get(b) as PedigreePerson & { sex?: string | null })?.sex ?? "";
      if (sexA === "M" && sexB !== "M") return -1;
      if (sexB === "M" && sexA !== "M") return 1;
      return 0;
    });
    parents.slice(0, 2).forEach((parentId, index) => {
      const person = byId.get(parentId);
      if (!person || used.has(`${current.number}-${index}`)) return;
      const number = current.number * 2 + index;
      if (number > maxNumber) return;
      rows.push({ number, person });
      used.add(`${current.number}-${index}`);
      queue.push({ id: parentId, number });
    });
  }

  return rows.sort((a, b) => a.number - b.number);
}
