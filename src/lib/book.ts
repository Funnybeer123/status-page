import { formatDate } from "@/lib/dates";
import { dateRange } from "@/lib/dateRange";
import { placeLabel } from "@/lib/places";
import { kindLabel } from "@/lib/timeline";

export type BookChapter = {
  id: string;
  title: string;
  subtitle: string;
  sections: { heading: string; body: string; date?: string }[];
};

export function compileLifeStory(input: {
  person: { id: string; displayName: string; birthDate: Date | string | null; deathDate: Date | string | null; notes: string | null };
  names: { kind: string; name: string }[];
  residences: { place: { name: string; locality?: string | null; region?: string | null; country?: string | null }; startedAt: Date | string | null; endedAt: Date | string | null; notes: string | null }[];
  events: { kind: string; title: string; summary: string | null; happenedOn: Date | string | null; rangeEnd?: Date | string | null; precision?: string | null; place?: { name: string } | null }[];
  letters: { title: string; writtenAt: Date | string | null; transcript: string }[];
  stories: { title: string; recordedAt: Date | string | null; body: string }[];
}) {
  const sections: BookChapter["sections"] = [];
  sections.push({
    heading: "Vital dates",
    body: `Born ${formatDate(input.person.birthDate, "date unknown")}${
      input.person.deathDate ? `. Died ${formatDate(input.person.deathDate)}.` : ". Living."
    }`,
  });
  if (input.names.length) {
    sections.push({
      heading: "Names",
      body: input.names.map((name) => `${name.kind}: ${name.name}`).join(" · "),
    });
  }
  if (input.person.notes) {
    sections.push({ heading: "What the family wrote", body: input.person.notes });
  }
  for (const home of input.residences) {
    sections.push({
      heading: `Lived in ${placeLabel(home.place)}`,
      date: formatDate(home.startedAt, ""),
      body: [home.notes, home.endedAt ? `Until ${formatDate(home.endedAt)}` : ""].filter(Boolean).join(" "),
    });
  }
  for (const event of input.events) {
    sections.push({
      heading: `${kindLabel(event.kind)} · ${event.title}`,
      date: dateRange(event.happenedOn, event.precision, event.rangeEnd, "").label,
      body: [event.summary, event.place ? event.place.name : ""].filter(Boolean).join(" "),
    });
  }
  for (const letter of input.letters) {
    sections.push({
      heading: letter.title,
      date: formatDate(letter.writtenAt, "Undated"),
      body: letter.transcript.slice(0, 1200),
    });
  }
  for (const story of input.stories) {
    sections.push({
      heading: story.title,
      date: formatDate(story.recordedAt, "Undated"),
      body: story.body,
    });
  }
  return {
    id: input.person.id,
    title: input.person.displayName,
    subtitle: `${formatDate(input.person.birthDate, "")}${input.person.deathDate ? ` – ${formatDate(input.person.deathDate)}` : ""}`.trim(),
    sections,
  } satisfies BookChapter;
}

export type NameIndexEntry = { name: string; href: string; chapter: string };

export function compileNameIndex(
  people: { id: string; displayName: string; names?: { name: string }[] }[],
): NameIndexEntry[] {
  const seen = new Set<string>();
  const entries: NameIndexEntry[] = [];
  for (const person of people) {
    const names = [person.displayName, ...(person.names?.map((item) => item.name) ?? [])];
    for (const name of names) {
      const key = name.trim().toLowerCase();
      if (!key || seen.has(`${key}:${person.id}`)) continue;
      seen.add(`${key}:${person.id}`);
      entries.push({
        name: name.trim(),
        href: `#chapter-${person.id}`,
        chapter: person.displayName,
      });
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name) || a.chapter.localeCompare(b.chapter));
}
