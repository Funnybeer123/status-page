import { formatDate, formatYear } from "@/lib/dates";
import { shouldHideLivingFacts } from "@/lib/privacy";
import { Role } from "@prisma/client";

export type OnThisDayItem = {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  happenedOn: string;
  year: string;
  href: string;
  personId?: string;
};

function monthDay(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function sameMonthDay(value: Date | string | null | undefined, from: Date) {
  if (!value) return false;
  const left = monthDay(value);
  const right = monthDay(from);
  return Boolean(left && right && left === right);
}

export function collectOnThisDay(
  input: {
    people: { id: string; displayName: string; birthDate: Date | string | null; deathDate: Date | string | null }[];
    events: { id: string; kind: string; title: string; summary: string | null; happenedOn: Date | string | null; personId: string }[];
    documents: { id: string; title: string; kind: string; writtenAt: Date | string | null }[];
    assets: { id: string; title: string | null; kind: string; capturedAt: Date | string | null }[];
    stories: { id: string; title: string; body: string; recordedAt: Date | string | null }[];
    role: Role;
  },
  from = new Date(),
): OnThisDayItem[] {
  const items: OnThisDayItem[] = [];
  const people = new Map(input.people.map((person) => [person.id, person]));

  for (const person of input.people) {
    if (sameMonthDay(person.birthDate, from)) {
      if (shouldHideLivingFacts(input.role, person)) {
        items.push({
          id: `birth-${person.id}`,
          kind: "birthday",
          title: `${person.displayName}'s birthday`,
          summary: "A living relative. The year is withheld.",
          happenedOn: new Date(person.birthDate!).toISOString().slice(0, 10),
          year: "",
          href: `/people/${person.id}`,
          personId: person.id,
        });
      } else {
        items.push({
          id: `birth-${person.id}`,
          kind: "birthday",
          title: `${person.displayName} was born`,
          summary: null,
          happenedOn: new Date(person.birthDate!).toISOString().slice(0, 10),
          year: formatYear(person.birthDate),
          href: `/people/${person.id}`,
          personId: person.id,
        });
      }
    }
    if (sameMonthDay(person.deathDate, from)) {
      items.push({
        id: `death-${person.id}`,
        kind: "anniversary",
        title: `${person.displayName} died`,
        summary: null,
        happenedOn: new Date(person.deathDate!).toISOString().slice(0, 10),
        year: formatYear(person.deathDate),
        href: `/people/${person.id}`,
        personId: person.id,
      });
    }
  }

  for (const event of input.events) {
    if (!sameMonthDay(event.happenedOn, from)) continue;
    if (event.kind === "birth" || event.kind === "death") continue;
    const person = people.get(event.personId);
    if (person && shouldHideLivingFacts(input.role, person) && event.kind !== "marriage") continue;
    items.push({
      id: `event-${event.id}`,
      kind: event.kind,
      title: event.title,
      summary: event.summary,
      happenedOn: new Date(event.happenedOn!).toISOString().slice(0, 10),
      year: formatYear(event.happenedOn),
      href: `/timeline#event-${event.id}`,
      personId: event.personId,
    });
  }

  for (const document of input.documents) {
    if (!sameMonthDay(document.writtenAt, from)) continue;
    items.push({
      id: `doc-${document.id}`,
      kind: document.kind,
      title: document.title,
      summary: `A ${document.kind} written on this day.`,
      happenedOn: new Date(document.writtenAt!).toISOString().slice(0, 10),
      year: formatYear(document.writtenAt),
      href: `/letters/${document.id}`,
    });
  }

  for (const asset of input.assets) {
    if (!sameMonthDay(asset.capturedAt, from)) continue;
    items.push({
      id: `asset-${asset.id}`,
      kind: asset.kind,
      title: asset.title || (asset.kind === "audio" ? "Oral history" : "Photograph"),
      summary: "Captured on this day.",
      happenedOn: new Date(asset.capturedAt!).toISOString().slice(0, 10),
      year: formatYear(asset.capturedAt),
      href: `/archive/${asset.id}`,
    });
  }

  for (const story of input.stories) {
    if (!sameMonthDay(story.recordedAt, from)) continue;
    items.push({
      id: `story-${story.id}`,
      kind: "story",
      title: story.title,
      summary: story.body.slice(0, 180),
      happenedOn: new Date(story.recordedAt!).toISOString().slice(0, 10),
      year: formatYear(story.recordedAt),
      href: `/stories/${story.id}`,
    });
  }

  return items.sort((a, b) => a.happenedOn.localeCompare(b.happenedOn) || a.title.localeCompare(b.title));
}

export function onThisDayHeading(from = new Date()) {
  return formatDate(from.toISOString().slice(0, 10)).replace(/ \d{4}$/, "");
}
