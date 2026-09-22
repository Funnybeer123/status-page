import { flattenPedigree, type PedigreeNode, type PedigreePerson } from "@/lib/pedigree";

export type FanSlice = {
  id: string;
  name: string;
  generation: number;
  index: number;
  count: number;
};

export function fanSlices(root: PedigreeNode | null): FanSlice[] {
  return flattenPedigree(root).flatMap(([generation, people]) =>
    people.map((person, index) => ({
      id: person.id,
      name: person.displayName,
      generation,
      index,
      count: people.length,
    })),
  );
}

export function fanPoint(slice: FanSlice, width = 720, height = 420) {
  const cx = width / 2;
  const cy = height - 36;
  if (slice.generation === 0) return { x: cx, y: cy - 8, cx, cy };
  const radius = 70 + slice.generation * 78;
  const start = Math.PI;
  const sweep = Math.PI;
  const step = sweep / Math.max(slice.count, 1);
  const angle = start + step * (slice.index + 0.5);
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy - Math.sin(angle) * radius,
    cx,
    cy,
  };
}

export function fanPeople(root: PedigreeNode | null): PedigreePerson[] {
  return flattenPedigree(root).flatMap(([, people]) => people);
}
