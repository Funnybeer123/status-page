import { buildGenerations, TreePerson } from "@/lib/tree";
import { Relationship } from "@prisma/client";

export function generationDepthHeading(count: number) {
  if (!count) return "No generations on the chart yet";
  if (count === 1) return "1 generation on the chart";
  return `${count} generations on the chart`;
}

export function generationRowLabel(generation: number, count: number) {
  const gen = `Generation ${generation + 1}`;
  if (!count) return `${gen} · no one yet`;
  if (count === 1) return `${gen} · 1 person`;
  return `${gen} · ${count} people`;
}

export function generationDepth(people: TreePerson[], relationships: Relationship[]) {
  const built = buildGenerations(people, relationships);
  const rows = [...built.rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([generation, groups]) => {
      const names = groups.flat();
      const unique = [...new Map(names.map((person) => [person.id, person])).values()];
      return {
        generation,
        count: unique.length,
        label: generationRowLabel(generation, unique.length),
        people: unique,
      };
    });
  return {
    rows,
    heading: generationDepthHeading(rows.length),
    deepest: rows.length ? rows[rows.length - 1]!.generation : 0,
  };
}
