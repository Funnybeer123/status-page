import { isParentRel, parentsOf, siblingKind, type RelRow } from "@/lib/rels";

export type CousinColumn = {
  siblingId: string;
  siblingName: string;
  children: { id: string; name: string }[];
};

export function cousinWorksheet(
  personId: string,
  people: { id: string; displayName: string }[],
  relationships: RelRow[],
) {
  const names = new Map(people.map((person) => [person.id, person.displayName]));
  const parentIds = parentsOf(personId, relationships).map((rel) => rel.fromPersonId);
  const siblings = people.filter((person) => {
    if (person.id === personId) return true;
    const kind = siblingKind(personId, person.id, relationships);
    return kind === "full" || kind === "half";
  });
  const columns: CousinColumn[] = siblings.map((sibling) => ({
    siblingId: sibling.id,
    siblingName: sibling.displayName,
    children: relationships
      .filter((rel) => isParentRel(rel.type) && rel.fromPersonId === sibling.id)
      .map((rel) => ({ id: rel.toPersonId, name: names.get(rel.toPersonId) || rel.toPersonId }))
      .filter((child, index, list) => list.findIndex((row) => row.id === child.id) === index)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
  return {
    personId,
    personName: names.get(personId) || "Someone",
    parentNames: parentIds.map((id) => names.get(id) || id),
    columns: columns.sort((a, b) => a.siblingName.localeCompare(b.siblingName)),
  };
}

export function cousinWorksheetHeading(name: string) {
  return `Cousin worksheet · ${name}`;
}
