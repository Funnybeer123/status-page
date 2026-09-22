import { RelType } from "@prisma/client";

export type PedigreePerson = {
  id: string;
  displayName: string;
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
  profileUrl?: string | null;
};

export type PedigreeNode = {
  person: PedigreePerson;
  generation: number;
  parents: PedigreeNode[];
};

export function buildPedigree(
  personId: string,
  people: PedigreePerson[],
  relationships: { type: RelType | string; fromPersonId: string; toPersonId: string }[],
  depth = 3,
): PedigreeNode | null {
  const byId = new Map(people.map((person) => [person.id, person]));
  const parentsOf = new Map<string, string[]>();
  for (const rel of relationships) {
    if (rel.type === RelType.parent || rel.type === RelType.adoptive || rel.type === RelType.step || rel.type === "parent" || rel.type === "adoptive" || rel.type === "step") {
      parentsOf.set(rel.toPersonId, [...(parentsOf.get(rel.toPersonId) ?? []), rel.fromPersonId]);
    }
  }

  function walk(id: string, generation: number): PedigreeNode | null {
    const person = byId.get(id);
    if (!person) return null;
    if (generation >= depth) return { person, generation, parents: [] };
    const parents = (parentsOf.get(id) ?? [])
      .map((parentId) => walk(parentId, generation + 1))
      .filter((node): node is PedigreeNode => Boolean(node));
    return { person, generation, parents };
  }

  return walk(personId, 0);
}

export function flattenPedigree(root: PedigreeNode | null) {
  const rows = new Map<number, PedigreePerson[]>();
  function visit(node: PedigreeNode | null) {
    if (!node) return;
    const list = rows.get(node.generation) ?? [];
    if (!list.some((person) => person.id === node.person.id)) list.push(node.person);
    rows.set(node.generation, list);
    node.parents.forEach(visit);
  }
  visit(root);
  return [...rows.entries()].sort((a, b) => a[0] - b[0]);
}

export function ahnentafelOnTree(root: PedigreeNode | null) {
  const numbers = new Map<string, number>();
  function visit(node: PedigreeNode | null, number: number) {
    if (!node) return;
    if (!numbers.has(node.person.id)) numbers.set(node.person.id, number);
    node.parents.forEach((parent, index) => visit(parent, number * 2 + index));
  }
  visit(root, 1);
  return numbers;
}
