import { formatDate, lifespan } from "@/lib/dates";
import { isParentRel, isPartnerRel } from "@/lib/rels";

export type CardPerson = {
  id: string;
  displayName: string;
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
};

export type CardRel = {
  fromPersonId: string;
  toPersonId: string;
  type: string;
};

export function indexCardHeading(name: string) {
  return `Index card for ${name.trim() || "this person"}`;
}

export function indexCardDates(birth?: Date | string | null, death?: Date | string | null) {
  const span = lifespan(birth, death);
  const born = formatDate(birth, "");
  const died = formatDate(death, "");
  if (born && died) return `${span} · ${born} – ${died}`;
  if (born) return `${span} · Born ${born}`;
  if (died) return `${span} · Died ${died}`;
  return span || "Dates unknown";
}

export function namesLine(people: { displayName?: string | null }[], empty: string) {
  const names = people.map((person) => person.displayName?.trim()).filter(Boolean);
  return names.length ? names.join(", ") : empty;
}

export function compileIndexCard(input: {
  person: CardPerson;
  people: CardPerson[];
  relationships: CardRel[];
  hideDates?: boolean;
}) {
  const byId = new Map(input.people.map((person) => [person.id, person]));
  const named = (id: string) => byId.get(id);
  const parents = input.relationships
    .filter((rel) => isParentRel(rel.type) && rel.toPersonId === input.person.id)
    .map((rel) => named(rel.fromPersonId))
    .filter((person): person is CardPerson => Boolean(person))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const children = input.relationships
    .filter((rel) => isParentRel(rel.type) && rel.fromPersonId === input.person.id)
    .map((rel) => named(rel.toPersonId))
    .filter((person): person is CardPerson => Boolean(person))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const spouses = input.relationships
    .filter((rel) => isPartnerRel(rel.type) && (rel.fromPersonId === input.person.id || rel.toPersonId === input.person.id))
    .map((rel) => named(rel.fromPersonId === input.person.id ? rel.toPersonId : rel.fromPersonId))
    .filter((person): person is CardPerson => Boolean(person))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  return {
    name: input.person.displayName,
    dates: input.hideDates ? "Living — dates withheld" : indexCardDates(input.person.birthDate, input.person.deathDate),
    parents,
    spouses,
    children,
    parentLine: namesLine(parents, "Parents unknown"),
    spouseLine: namesLine(spouses, "No spouse recorded"),
    childLine: namesLine(children, "No children recorded"),
  };
}

export function cardsHeading(count: number) {
  if (!count) return "No index cards yet";
  if (count === 1) return "1 index card";
  return `${count} index cards`;
}

export function missingParentsHeading(count: number) {
  if (!count) return "Every index card has parents";
  if (count === 1) return "1 index card still needs parents";
  return `${count} index cards still need parents`;
}

export function noChildrenHeading(count: number) {
  if (!count) return "Every index card lists children";
  if (count === 1) return "1 index card lists no children";
  return `${count} index cards list no children`;
}

export function undatedCardsHeading(count: number) {
  if (!count) return "Every index card has dates";
  if (count === 1) return "1 index card still needs dates";
  return `${count} index cards still need dates`;
}

export function hasCardDates(person: { birthDate?: Date | string | null; deathDate?: Date | string | null }) {
  return Boolean(person.birthDate || person.deathDate);
}
