import { isParentRel, isPartnerRel, type RelRow } from "@/lib/rels";
import { formatDate, formatYear } from "@/lib/dates";

export type FamilyFirst = {
  id: string;
  title: string;
  name: string;
  href: string;
  when: string;
};

export function compileFamilyFirsts(input: {
  people: { id: string; displayName: string; birthDate?: Date | string | null; deathDate?: Date | string | null }[];
  relationships: RelRow[];
  events: { id: string; kind: string; title: string; personId: string; happenedOn?: Date | string | null }[];
  letters: { id: string; title: string; writtenAt?: Date | string | null }[];
  photos: { id: string; title?: string | null; capturedAt?: Date | string | null }[];
}) {
  const firsts: FamilyFirst[] = [];
  const byBirth = [...input.people].filter((person) => person.birthDate).sort((a, b) => String(a.birthDate).localeCompare(String(b.birthDate)));
  if (byBirth[0]) {
    firsts.push({
      id: `birth-${byBirth[0].id}`,
      title: "Earliest birth on the tree",
      name: byBirth[0].displayName,
      href: `/people/${byBirth[0].id}`,
      when: formatDate(byBirth[0].birthDate),
    });
  }
  const marriage = [...input.events]
    .filter((event) => event.kind === "marriage" && event.happenedOn)
    .sort((a, b) => String(a.happenedOn).localeCompare(String(b.happenedOn)))[0];
  if (marriage) {
    const person = input.people.find((item) => item.id === marriage.personId);
    firsts.push({
      id: `marriage-${marriage.id}`,
      title: "First dated wedding",
      name: person?.displayName || marriage.title,
      href: `/people/${marriage.personId}`,
      when: formatDate(marriage.happenedOn),
    });
  }
  const firstChildRel = input.relationships.find((rel) => isParentRel(rel.type));
  if (firstChildRel) {
    const child = input.people.find((person) => person.id === firstChildRel.toPersonId);
    if (child) {
      firsts.push({
        id: `child-${child.id}`,
        title: "A first recorded child",
        name: child.displayName,
        href: `/people/${child.id}`,
        when: formatYear(child.birthDate) || "",
      });
    }
  }
  const letter = [...input.letters]
    .filter((item) => item.writtenAt)
    .sort((a, b) => String(a.writtenAt).localeCompare(String(b.writtenAt)))[0];
  if (letter) {
    firsts.push({
      id: `letter-${letter.id}`,
      title: "Earliest letter",
      name: letter.title,
      href: `/letters/${letter.id}`,
      when: formatDate(letter.writtenAt),
    });
  }
  const photo = [...input.photos]
    .filter((item) => item.capturedAt)
    .sort((a, b) => String(a.capturedAt).localeCompare(String(b.capturedAt)))[0];
  if (photo) {
    firsts.push({
      id: `photo-${photo.id}`,
      title: "Earliest photograph",
      name: photo.title || "A family photograph",
      href: `/archive/${photo.id}`,
      when: formatDate(photo.capturedAt),
    });
  }
  const partners = input.relationships.filter((rel) => isPartnerRel(rel.type));
  if (partners[0]) {
    const person = input.people.find((item) => item.id === partners[0].fromPersonId);
    if (person) {
      firsts.push({
        id: `partner-${person.id}`,
        title: "A first recorded partnership",
        name: person.displayName,
        href: `/people/${person.id}`,
        when: "",
      });
    }
  }
  return firsts;
}
