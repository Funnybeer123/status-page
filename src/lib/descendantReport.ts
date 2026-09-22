import { isPartnerRel, type RelRow } from "@/lib/rels";
import { lifespan } from "@/lib/dates";
import { buildDescendants, type DescendantNode } from "@/lib/descendants";
import type { PedigreePerson } from "@/lib/pedigree";

export type DescendantReportLine = {
  generation: number;
  id: string;
  name: string;
  dates: string;
  spouses: string;
};

function spousesOf(personId: string, people: PedigreePerson[], relationships: RelRow[]) {
  const byId = new Map(people.map((person) => [person.id, person]));
  return relationships
    .filter((rel) => isPartnerRel(rel.type) && (rel.fromPersonId === personId || rel.toPersonId === personId))
    .map((rel) => byId.get(rel.fromPersonId === personId ? rel.toPersonId : rel.fromPersonId))
    .filter((person): person is PedigreePerson => Boolean(person));
}

function walk(node: DescendantNode, people: PedigreePerson[], relationships: RelRow[], lines: DescendantReportLine[]) {
  const spouses = spousesOf(node.person.id, people, relationships);
  lines.push({
    generation: node.generation,
    id: node.person.id,
    name: node.person.displayName,
    dates: lifespan(node.person.birthDate, node.person.deathDate),
    spouses: spouses.map((person) => `${person.displayName}${lifespan(person.birthDate, person.deathDate) ? ` (${lifespan(person.birthDate, person.deathDate)})` : ""}`).join(", "),
  });
  for (const child of node.children) walk(child, people, relationships, lines);
}

export function compileDescendantReport(
  personId: string,
  people: PedigreePerson[],
  relationships: RelRow[],
  depth = 8,
): DescendantReportLine[] {
  const root = buildDescendants(personId, people, relationships, depth);
  if (!root) return [];
  const lines: DescendantReportLine[] = [];
  walk(root, people, relationships, lines);
  return lines;
}
