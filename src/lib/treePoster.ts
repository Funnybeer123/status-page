import { buildGenerations, type TreePerson } from "@/lib/tree";
import type { Relationship } from "@prisma/client";

export function posterHeading(familyName: string) {
  return `${familyName} tree poster`;
}

export function posterRows(people: TreePerson[], relationships: Relationship[]) {
  const { rows } = buildGenerations(people, relationships);
  return [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([generation, groups]) => ({
      generation,
      label: generation === 0 ? "Oldest generation" : `Generation ${generation + 1}`,
      groups: groups.map((group) => group.map((person) => ({ id: person.id, name: person.displayName }))),
    }));
}

export function posterGroupLine(names: string[]) {
  return names.join(" & ");
}
