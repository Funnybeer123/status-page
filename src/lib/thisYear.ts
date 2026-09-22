export type YearItem = {
  id: string;
  kind: "birth" | "death" | "story" | "photo" | "letter" | "event";
  title: string;
  href: string;
  date?: Date | string | null;
};

export function yearOf(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

export function compileThisYear(input: {
  year: number;
  people: { id: string; displayName: string; birthDate?: Date | string | null; deathDate?: Date | string | null }[];
  stories: { id: string; title: string; recordedAt?: Date | string | null }[];
  photos: { id: string; title?: string | null; capturedAt?: Date | string | null }[];
  letters?: { id: string; title: string; writtenAt?: Date | string | null }[];
  events?: { id: string; title: string; personId: string; happenedOn?: Date | string | null }[];
}): YearItem[] {
  const items: YearItem[] = [];
  for (const person of input.people) {
    if (yearOf(person.birthDate) === input.year) {
      items.push({ id: `birth-${person.id}`, kind: "birth", title: `${person.displayName} was born`, href: `/people/${person.id}`, date: person.birthDate });
    }
    if (yearOf(person.deathDate) === input.year) {
      items.push({ id: `death-${person.id}`, kind: "death", title: `${person.displayName} died`, href: `/people/${person.id}`, date: person.deathDate });
    }
  }
  for (const story of input.stories) {
    if (yearOf(story.recordedAt) === input.year) {
      items.push({ id: story.id, kind: "story", title: story.title, href: `/stories/${story.id}`, date: story.recordedAt });
    }
  }
  for (const photo of input.photos) {
    if (yearOf(photo.capturedAt) === input.year) {
      items.push({ id: photo.id, kind: "photo", title: photo.title || "A photograph", href: `/archive/${photo.id}`, date: photo.capturedAt });
    }
  }
  for (const letter of input.letters ?? []) {
    if (yearOf(letter.writtenAt) === input.year) {
      items.push({ id: letter.id, kind: "letter", title: letter.title, href: `/letters/${letter.id}`, date: letter.writtenAt });
    }
  }
  for (const event of input.events ?? []) {
    if (yearOf(event.happenedOn) === input.year) {
      items.push({ id: event.id, kind: "event", title: event.title, href: `/people/${event.personId}`, date: event.happenedOn });
    }
  }
  return items.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
}

export function thisYearHeading(year: number, count: number) {
  if (!count) return `Nothing yet in ${year}`;
  if (count === 1) return `1 thing from ${year}`;
  return `${count} things from ${year}`;
}

export function yearbookHeading(year: number, count: number) {
  if (!count) return `No photographs from ${year}`;
  if (count === 1) return `1 photograph from ${year}`;
  return `${count} photographs from ${year}`;
}
