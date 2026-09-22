import { buildGenerations, type TreePerson } from "@/lib/tree";
import type { Relationship } from "@prisma/client";

export function portraitAssetId(
  person: { id: string; profileAssetId?: string | null },
  tagged: { personId: string; assetId: string }[],
) {
  if (person.profileAssetId) return person.profileAssetId;
  return tagged.find((tag) => tag.personId === person.id)?.assetId ?? null;
}

export function generationHeading(gen: number, count: number) {
  const names = ["The eldest generation", "Their children", "Grandchildren", "Great-grandchildren"];
  const label = names[gen] || `Generation ${gen + 1}`;
  if (!count) return `${label} · no portraits yet`;
  if (count === 1) return `${label} · 1 portrait`;
  return `${label} · ${count} portraits`;
}

export function portraitWallHeading(count: number) {
  if (!count) return "No portraits on the wall yet";
  if (count === 1) return "1 portrait on the wall";
  return `${count} portraits on the wall`;
}

export function hangPortraitLine(name: string) {
  return `Portrait hung for ${name.trim() || "this person"}`;
}

export function missingPortraitsHeading(count: number) {
  if (!count) return "Everyone has a portrait";
  if (count === 1) return "1 person still needs a portrait";
  return `${count} people still need a portrait`;
}

export type PortraitRow = {
  generation: number;
  heading: string;
  people: { id: string; displayName: string; assetId: string | null; profileUrl: string | null }[];
};

export function buildPortraitWall(
  people: TreePerson[],
  relationships: Relationship[],
  tagged: { personId: string; assetId: string }[],
  assetPath: Map<string, string>,
) {
  const { generation } = buildGenerations(people, relationships);
  const gens = [...new Set([...generation.values()])].sort((a, b) => a - b);
  const rows: PortraitRow[] = [];
  for (const gen of gens) {
    const members = people
      .filter((person) => generation.get(person.id) === gen)
      .map((person) => {
        const assetId = portraitAssetId(person, tagged);
        return {
          id: person.id,
          displayName: person.displayName,
          assetId,
          profileUrl: assetId && assetPath.get(assetId) ? `/api/media/${assetPath.get(assetId)}` : null,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    rows.push({
      generation: gen,
      heading: generationHeading(gen, members.filter((person) => person.assetId).length),
      people: members,
    });
  }
  const portraits = rows.reduce((sum, row) => sum + row.people.filter((person) => person.assetId).length, 0);
  const missing = rows.flatMap((row) => row.people.filter((person) => !person.assetId));
  return { rows, portraits, missing, heading: portraitWallHeading(portraits) };
}
