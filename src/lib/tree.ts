import { Person, Relationship, RelType } from "@prisma/client";

export type TreePerson = Person & { profileUrl: string | null };

export type TreeCouple = {
  id: string;
  people: TreePerson[];
  children: TreeCouple[];
};

export function buildGenerations(people: TreePerson[], relationships: Relationship[]) {
  const byId = new Map(people.map((person) => [person.id, person]));
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const partnersOf = new Map<string, string[]>();

  for (const rel of relationships) {
    if (rel.type === RelType.parent) {
      parentsOf.set(rel.toPersonId, [...(parentsOf.get(rel.toPersonId) ?? []), rel.fromPersonId]);
      childrenOf.set(rel.fromPersonId, [...(childrenOf.get(rel.fromPersonId) ?? []), rel.toPersonId]);
    } else {
      partnersOf.set(rel.fromPersonId, [...(partnersOf.get(rel.fromPersonId) ?? []), rel.toPersonId]);
      partnersOf.set(rel.toPersonId, [...(partnersOf.get(rel.toPersonId) ?? []), rel.fromPersonId]);
    }
  }

  const generation = new Map<string, number>();
  const pending = [...people.map((person) => person.id)];
  for (let i = 0; i < 12 && pending.length; i += 1) {
    for (const id of [...pending]) {
      const parentIds = parentsOf.get(id) ?? [];
      if (!parentIds.length) {
        generation.set(id, generation.get(id) ?? 0);
        pending.splice(pending.indexOf(id), 1);
        continue;
      }
      if (parentIds.every((parentId) => generation.has(parentId))) {
        generation.set(id, Math.max(...parentIds.map((parentId) => generation.get(parentId) ?? 0)) + 1);
        pending.splice(pending.indexOf(id), 1);
      }
    }
  }
  for (const person of people) {
    if (!generation.has(person.id)) generation.set(person.id, 0);
  }
  for (const person of people) {
    const partnerGens = (partnersOf.get(person.id) ?? [])
      .map((id) => generation.get(id))
      .filter((value): value is number => value !== undefined);
    if (partnerGens.length) {
      generation.set(person.id, Math.max(generation.get(person.id) ?? 0, ...partnerGens));
    }
  }

  const used = new Set<string>();
  const rows = new Map<number, TreePerson[][]>();
  const gens = [...generation.values()];
  const maxGen = gens.length ? Math.max(...gens) : 0;

  for (let gen = 0; gen <= maxGen; gen += 1) {
    const ids = people.filter((person) => generation.get(person.id) === gen).map((person) => person.id);
    const groups: TreePerson[][] = [];
    for (const id of ids) {
      if (used.has(id)) continue;
      const groupIds = [id, ...(partnersOf.get(id) ?? []).filter((partnerId) => generation.get(partnerId) === gen)];
      const unique = [...new Set(groupIds)].filter((memberId) => !used.has(memberId));
      unique.forEach((memberId) => used.add(memberId));
      groups.push(unique.map((memberId) => byId.get(memberId)!).filter(Boolean));
    }
    rows.set(gen, groups);
  }

  return { rows, parentsOf, childrenOf, partnersOf, generation };
}
