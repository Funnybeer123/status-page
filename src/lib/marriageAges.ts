import { isPartnerRel, type RelRow } from "@/lib/rels";
import { ageAt, formatDate } from "@/lib/dates";

export type MarriageAgeRow = {
  personId: string;
  name: string;
  spouseName: string;
  marriedOn: string;
  age: number | null;
};

export function compileMarriageAges(
  people: { id: string; displayName: string; birthDate?: Date | string | null }[],
  relationships: RelRow[],
  events: { personId: string; otherPersonId?: string | null; kind: string; happenedOn?: Date | string | null }[],
) {
  const byId = new Map(people.map((person) => [person.id, person]));
  const rows: MarriageAgeRow[] = [];
  for (const event of events) {
    if (event.kind !== "marriage" || !event.happenedOn) continue;
    const pair = [event.personId, event.otherPersonId].filter((id): id is string => Boolean(id));
    if (pair.length < 2) {
      const partner = relationships.find(
        (rel) => isPartnerRel(rel.type) && (rel.fromPersonId === event.personId || rel.toPersonId === event.personId),
      );
      if (partner) pair.push(partner.fromPersonId === event.personId ? partner.toPersonId : partner.fromPersonId);
    }
    for (const personId of pair) {
      const person = byId.get(personId);
      if (!person) continue;
      const spouse = pair.map((id) => byId.get(id)).find((item) => item && item.id !== personId);
      rows.push({
        personId,
        name: person.displayName,
        spouseName: spouse?.displayName || "Spouse",
        marriedOn: formatDate(event.happenedOn),
        age: ageAt(person.birthDate, event.happenedOn),
      });
    }
  }
  return rows.sort((a, b) => (a.age ?? 99) - (b.age ?? 99) || a.name.localeCompare(b.name));
}
