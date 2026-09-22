import { RelType } from "@prisma/client";
import type { PedigreePerson } from "@/lib/pedigree";

export type DescendantNode = {
  person: PedigreePerson;
  generation: number;
  children: DescendantNode[];
};

export function buildDescendants(
  personId: string,
  people: PedigreePerson[],
  relationships: { type: RelType | string; fromPersonId: string; toPersonId: string }[],
  depth = 4,
): DescendantNode | null {
  const byId = new Map(people.map((person) => [person.id, person]));
  const childrenOf = new Map<string, string[]>();
  for (const rel of relationships) {
    if (rel.type === RelType.parent || rel.type === "parent") {
      childrenOf.set(rel.fromPersonId, [...(childrenOf.get(rel.fromPersonId) ?? []), rel.toPersonId]);
    }
  }

  function walk(id: string, generation: number, seen: Set<string>): DescendantNode | null {
    const person = byId.get(id);
    if (!person || seen.has(id)) return null;
    if (generation >= depth) return { person, generation, children: [] };
    const next = new Set(seen);
    next.add(id);
    const children = (childrenOf.get(id) ?? [])
      .map((childId) => walk(childId, generation + 1, next))
      .filter((node): node is DescendantNode => Boolean(node));
    return { person, generation, children };
  }

  return walk(personId, 0, new Set());
}

export function flattenDescendants(root: DescendantNode | null) {
  const rows = new Map<number, PedigreePerson[]>();
  function visit(node: DescendantNode | null) {
    if (!node) return;
    const list = rows.get(node.generation) ?? [];
    if (!list.some((person) => person.id === node.person.id)) list.push(node.person);
    rows.set(node.generation, list);
    node.children.forEach(visit);
  }
  visit(root);
  return [...rows.entries()].sort((a, b) => a[0] - b[0]);
}

export function countDescendants(root: DescendantNode | null) {
  const rows = flattenDescendants(root);
  return rows.reduce((sum, [, people]) => sum + people.length, 0) - (root ? 1 : 0);
}
