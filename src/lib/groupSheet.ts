import { isParentRel, isPartnerRel, parentsOf, type RelRow } from "@/lib/rels";
import { formatDate, lifespan } from "@/lib/dates";

export type SheetPerson = {
  id: string;
  displayName: string;
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
};

export type GroupSheetChild = {
  person: SheetPerson;
  dates: string;
  spouses: SheetPerson[];
};

export type GroupSheet = {
  personId: string;
  person: SheetPerson;
  parents: SheetPerson[];
  spouses: SheetPerson[];
  spouseParents: { spouseId: string; spouseName: string; parents: SheetPerson[] }[];
  children: GroupSheetChild[];
  marriage?: { date: string; place?: string };
};

export function compileGroupSheet(
  personId: string,
  people: SheetPerson[],
  relationships: RelRow[],
  events: {
    personId: string;
    otherPersonId?: string | null;
    kind: string;
    happenedOn?: Date | string | null;
    place?: { name: string } | null;
    title?: string | null;
  }[] = [],
): GroupSheet | null {
  const byId = new Map(people.map((person) => [person.id, person]));
  const person = byId.get(personId);
  if (!person) return null;
  const spouses = relationships
    .filter((rel) => isPartnerRel(rel.type) && (rel.fromPersonId === personId || rel.toPersonId === personId))
    .map((rel) => byId.get(rel.fromPersonId === personId ? rel.toPersonId : rel.fromPersonId))
    .filter((item): item is SheetPerson => Boolean(item));
  const coupleIds = new Set([personId, ...spouses.map((spouse) => spouse.id)]);
  const parentIds = parentsOf(personId, relationships).map((rel) => rel.fromPersonId);
  const parents = parentIds.map((id) => byId.get(id)).filter((item): item is SheetPerson => Boolean(item));
  const spouseParents = spouses.map((spouse) => ({
    spouseId: spouse.id,
    spouseName: spouse.displayName,
    parents: parentsOf(spouse.id, relationships)
      .map((rel) => byId.get(rel.fromPersonId))
      .filter((item): item is SheetPerson => Boolean(item)),
  }));
  const childIds = relationships
    .filter((rel) => isParentRel(rel.type) && coupleIds.has(rel.fromPersonId))
    .map((rel) => rel.toPersonId);
  const uniqueChildren = [...new Set(childIds)]
    .map((id) => byId.get(id))
    .filter((item): item is SheetPerson => Boolean(item));
  const children = uniqueChildren.map((child) => ({
    person: child,
    dates: lifespan(child.birthDate, child.deathDate),
    spouses: relationships
      .filter((rel) => isPartnerRel(rel.type) && (rel.fromPersonId === child.id || rel.toPersonId === child.id))
      .map((rel) => byId.get(rel.fromPersonId === child.id ? rel.toPersonId : rel.fromPersonId))
      .filter((item): item is SheetPerson => Boolean(item)),
  }));
  const marriageEvent = events.find(
    (event) =>
      event.kind === "marriage" &&
      (event.personId === personId || event.otherPersonId === personId) &&
      (!event.otherPersonId || coupleIds.has(event.otherPersonId) || coupleIds.has(event.personId)),
  );
  return {
    personId,
    person,
    parents,
    spouses,
    spouseParents,
    children,
    marriage: marriageEvent
      ? { date: formatDate(marriageEvent.happenedOn, ""), place: marriageEvent.place?.name || undefined }
      : undefined,
  };
}

export function listCouples(people: SheetPerson[], relationships: RelRow[]) {
  const seen = new Set<string>();
  const couples: { id: string; names: string; personId: string }[] = [];
  for (const rel of relationships) {
    if (!isPartnerRel(rel.type)) continue;
    const key = [rel.fromPersonId, rel.toPersonId].sort().join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    const a = people.find((person) => person.id === rel.fromPersonId);
    const b = people.find((person) => person.id === rel.toPersonId);
    if (!a || !b) continue;
    couples.push({
      id: key,
      names: `${a.displayName} and ${b.displayName}`,
      personId: a.id,
    });
  }
  return couples.sort((left, right) => left.names.localeCompare(right.names));
}
