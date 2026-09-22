import { RelType } from "@prisma/client";

export type SharedPerson = { id: string; displayName: string };

export type SharedAncestor = {
  id: string;
  displayName: string;
  fromA: number;
  fromB: number;
};

function parentsOf(
  relationships: { type: RelType | string; fromPersonId: string; toPersonId: string }[],
) {
  const map = new Map<string, string[]>();
  for (const rel of relationships) {
    if (rel.type === RelType.parent || rel.type === "parent") {
      map.set(rel.toPersonId, [...(map.get(rel.toPersonId) ?? []), rel.fromPersonId]);
    }
  }
  return map;
}

export function ancestorDistances(
  personId: string,
  relationships: { type: RelType | string; fromPersonId: string; toPersonId: string }[],
  maxGen = 8,
) {
  const parents = parentsOf(relationships);
  const distances = new Map<string, number>();
  const queue: { id: string; distance: number }[] = [{ id: personId, distance: 0 }];
  while (queue.length) {
    const current = queue.shift()!;
    if (distances.has(current.id) || current.distance > maxGen) continue;
    distances.set(current.id, current.distance);
    for (const parentId of parents.get(current.id) ?? []) {
      queue.push({ id: parentId, distance: current.distance + 1 });
    }
  }
  return distances;
}

export function findSharedAncestors(
  fromId: string,
  toId: string,
  people: SharedPerson[],
  relationships: { type: RelType | string; fromPersonId: string; toPersonId: string }[],
): SharedAncestor[] {
  const names = new Map(people.map((person) => [person.id, person.displayName]));
  const from = ancestorDistances(fromId, relationships);
  const to = ancestorDistances(toId, relationships);
  const shared: SharedAncestor[] = [];
  for (const [id, fromA] of from) {
    if (!to.has(id)) continue;
    if (id === fromId || id === toId) continue;
    shared.push({
      id,
      displayName: names.get(id) ?? id,
      fromA,
      fromB: to.get(id)!,
    });
  }
  return shared.sort((a, b) => a.fromA + a.fromB - (b.fromA + b.fromB) || a.displayName.localeCompare(b.displayName));
}
