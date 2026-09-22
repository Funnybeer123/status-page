import { RelType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { hideEventFromViewer, hideResidenceForViewer, shouldHideLivingFacts } from "@/lib/privacy";
import { buildGenerations } from "@/lib/tree";
import { placeLabel } from "@/lib/places";

export const GAP_YEARS = 5;

export type TimelinePerson = { id: string; displayName: string; generation: number };

export type TimelineEntry = {
  id: string;
  source: "event" | "letter" | "note" | "photo" | "video" | "story" | "audio";
  kind: string;
  title: string;
  summary: string | null;
  happenedOn: string | null;
  href: string;
  people: TimelinePerson[];
  generations: number[];
  place: string | null;
  mediaUrl: string | null;
  mimeType: string | null;
};

export type TimelineGap = {
  id: string;
  after: string;
  before: string;
  years: number;
  title: string;
  summary: string;
};

export type TimelineMissing = {
  id: string;
  kind: "birth" | "marriage" | "undated";
  title: string;
  summary: string;
  personId?: string;
  href: string;
};

export type TimelineCounts = {
  events: number;
  letters: number;
  notes: number;
  photos: number;
  videos: number;
  stories: number;
  audio: number;
};

export type TimelineHistory = {
  entries: TimelineEntry[];
  gaps: TimelineGap[];
  missing: TimelineMissing[];
  counts: TimelineCounts;
  people: TimelinePerson[];
  generations: { generation: number; label: string; count: number }[];
};

export type TimelineRow =
  | { type: "decade"; year: number; label: string }
  | { type: "entry"; entry: TimelineEntry }
  | { type: "gap"; gap: TimelineGap };

function iso(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function uniquePeople(people: TimelinePerson[]) {
  const seen = new Set<string>();
  const out: TimelinePerson[] = [];
  for (const person of people) {
    if (seen.has(person.id)) continue;
    seen.add(person.id);
    out.push(person);
  }
  return out;
}

export function countBySource(entries: TimelineEntry[]): TimelineCounts {
  return {
    events: entries.filter((entry) => entry.source === "event").length,
    letters: entries.filter((entry) => entry.source === "letter").length,
    notes: entries.filter((entry) => entry.source === "note").length,
    photos: entries.filter((entry) => entry.source === "photo").length,
    videos: entries.filter((entry) => entry.source === "video").length,
    stories: entries.filter((entry) => entry.source === "story").length,
    audio: entries.filter((entry) => entry.source === "audio").length,
  };
}

export function kindLabel(kind: string, source?: TimelineEntry["source"]) {
  const labels: Record<string, string> = {
    birth: "Birth",
    death: "Death",
    marriage: "Marriage",
    residence: "Move",
    immigration: "Immigration",
    occupation: "Occupation",
    education: "Education",
    military: "Military",
    census: "Census",
    burial: "Burial",
    religion: "Religion",
    reunion: "Reunion",
    naturalization: "Naturalization",
    probate: "Probate",
    divorce: "Divorce",
    separation: "Separation",
    baptism: "Baptism",
    clipping: "Newspaper",
    recipe: "Recipe",
    obituary: "Obituary",
    will: "Will",
    audio: "Oral history",
    letter: "Letter",
    note: "Oral note",
    photo: "Photograph",
    video: "Film",
    story: "Story",
    other: "Event",
  };
  return labels[kind] ?? (source ? labels[source] : undefined) ?? kind;
}

export function filterHistory(
  entries: TimelineEntry[],
  opts: { personId?: string | null; generation?: number | null },
) {
  return entries.filter((entry) => {
    if (opts.personId && !entry.people.some((person) => person.id === opts.personId)) return false;
    if (opts.generation != null && !Number.isNaN(opts.generation) && !entry.generations.includes(opts.generation)) {
      return false;
    }
    return true;
  });
}

export function filterMissing(
  missing: TimelineMissing[],
  people: TimelinePerson[],
  opts: { personId?: string | null; generation?: number | null },
) {
  const generation = new Map(people.map((person) => [person.id, person.generation]));
  return missing.filter((item) => {
    if (opts.personId) {
      if (!item.personId || item.personId !== opts.personId) return false;
    }
    if (opts.generation != null && !Number.isNaN(opts.generation)) {
      if (!item.personId) return false;
      if ((generation.get(item.personId) ?? 0) !== opts.generation) return false;
    }
    return true;
  });
}

export function computeGaps(entries: Pick<TimelineEntry, "id" | "happenedOn" | "title">[], minYears = GAP_YEARS) {
  const dated = entries
    .filter((entry) => entry.happenedOn)
    .sort((a, b) => a.happenedOn!.localeCompare(b.happenedOn!) || a.title.localeCompare(b.title));
  const gaps: TimelineGap[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < dated.length - 1; i += 1) {
    const current = dated[i];
    const next = dated.slice(i + 1).find((entry) => entry.happenedOn! > current.happenedOn!);
    if (!next) continue;
    const key = `${current.happenedOn}:${next.happenedOn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const years = (new Date(next.happenedOn!).getTime() - new Date(current.happenedOn!).getTime()) / (365.25 * 86_400_000);
    if (years < minYears) continue;
    const whole = Math.floor(years);
    gaps.push({
      id: `gap-${current.happenedOn}-${next.happenedOn}`,
      after: current.happenedOn!,
      before: next.happenedOn!,
      years: whole,
      title: `${whole} unrecorded ${whole === 1 ? "year" : "years"}`,
      summary: `Nothing dated between ${formatDate(current.happenedOn)} and ${formatDate(next.happenedOn)}.`,
    });
  }
  return gaps;
}

export function buildTimelineRows(entries: TimelineEntry[], gaps: TimelineGap[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let lastDecade: number | "undated" | null = null;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (entry.happenedOn) {
      const decade = Math.floor(Number(entry.happenedOn.slice(0, 4)) / 10) * 10;
      if (decade !== lastDecade) {
        rows.push({ type: "decade", year: decade, label: `${decade}s` });
        lastDecade = decade;
      }
    } else if (lastDecade !== "undated") {
      rows.push({ type: "decade", year: 0, label: "Undated" });
      lastDecade = "undated";
    }
    rows.push({ type: "entry", entry });
    const nextDated = entries.slice(i + 1).find((item) => item.happenedOn);
    if (entry.happenedOn && nextDated?.happenedOn && nextDated.happenedOn > entry.happenedOn) {
      const gap = gaps.find((item) => item.after === entry.happenedOn && item.before === nextDated.happenedOn);
      if (gap) rows.push({ type: "gap", gap });
    }
  }
  return rows;
}

export function findMissingFacts(input: {
  people: { id: string; displayName: string; birthDate: Date | string | null; deathDate: Date | string | null }[];
  relationships: { type: RelType | string; fromPersonId: string; toPersonId: string; startedAt: Date | string | null }[];
  events: { kind: string; personId: string; otherPersonId: string | null; happenedOn: Date | string | null }[];
  entries: TimelineEntry[];
  role: Role;
}) {
  const names = new Map(input.people.map((person) => [person.id, person.displayName]));
  const missing: TimelineMissing[] = [];

  for (const person of input.people) {
    if (person.birthDate) continue;
    if (shouldHideLivingFacts(input.role, person)) continue;
    const birthEvent = input.events.some((event) => event.kind === "birth" && event.personId === person.id && event.happenedOn);
    if (birthEvent) continue;
    missing.push({
      id: `missing-birth-${person.id}`,
      kind: "birth",
      title: `No birth date for ${person.displayName}`,
      summary: "A vital is missing. Add the birth from the timeline.",
      personId: person.id,
      href: `/timeline?personId=${person.id}#add-event`,
    });
  }

  for (const rel of input.relationships) {
    if (rel.type !== RelType.partner && rel.type !== "partner") continue;
    if (rel.startedAt) continue;
    const dated = input.events.some((event) => {
      if (event.kind !== "marriage" || !event.happenedOn) return false;
      return (
        (event.personId === rel.fromPersonId && event.otherPersonId === rel.toPersonId) ||
        (event.personId === rel.toPersonId && event.otherPersonId === rel.fromPersonId)
      );
    });
    if (dated) continue;
    const fromName = names.get(rel.fromPersonId) ?? "Someone";
    const toName = names.get(rel.toPersonId) ?? "someone";
    missing.push({
      id: `missing-marriage-${rel.fromPersonId}-${rel.toPersonId}`,
      kind: "marriage",
      title: `No marriage date for ${fromName} and ${toName}`,
      summary: "They are partners on the tree, but the wedding day is still blank.",
      personId: rel.fromPersonId,
      href: `/timeline?personId=${rel.fromPersonId}#add-event`,
    });
  }

  for (const entry of input.entries) {
    if (entry.happenedOn) continue;
    if (entry.source === "event" || entry.source === "note") continue;
    missing.push({
      id: `missing-date-${entry.source}-${entry.id}`,
      kind: "undated",
      title: `${entry.title} has no date`,
      summary: "It is on the history, but not yet in order.",
      personId: entry.people[0]?.id,
      href: entry.href,
    });
  }

  return missing;
}

function attachPeople(
  raw: { id: string; displayName: string }[],
  generation: Map<string, number>,
) {
  return uniquePeople(
    raw.map((person) => ({
      id: person.id,
      displayName: person.displayName,
      generation: generation.get(person.id) ?? 0,
    })),
  );
}

export async function familyHistory(
  familyId: string,
  role: Role,
  opts: { personId?: string | null; generation?: number | null } = {},
): Promise<TimelineHistory> {
  const [people, relationships, events, documents, assets, stories, residences] = await Promise.all([
    prisma.person.findMany({ where: { familyId, deletedAt: null } }),
    prisma.relationship.findMany({ where: { familyId } }),
    prisma.lifeEvent.findMany({
      where: { familyId },
      include: { person: true, otherPerson: true, place: true },
    }),
    prisma.document.findMany({
      where: { familyId, deletedAt: null, kind: { in: ["letter", "note", "clipping", "recipe", "obituary", "will"] } },
      include: { people: { include: { person: true } }, asset: true },
    }),
    prisma.asset.findMany({
      where: { familyId, deletedAt: null, kind: { in: ["photo", "video", "audio"] }, document: { is: null } },
      include: { tags: { include: { person: true } } },
    }),
    prisma.story.findMany({
      where: { familyId },
      include: { people: { include: { person: true } }, teller: true },
    }),
    prisma.residence.findMany({
      where: { familyId },
      include: { person: true, place: true },
    }),
  ]);

  const treePeople = people.map((person) => ({ ...person, profileUrl: null }));
  const { generation } = buildGenerations(treePeople, relationships);
  const personRef = (id: string, displayName: string) => ({
    id,
    displayName,
    generation: generation.get(id) ?? 0,
  });

  const entries: TimelineEntry[] = [];

  for (const event of events) {
    if (hideEventFromViewer(role, event)) continue;
    const peopleOn = attachPeople(
      [
        { id: event.person.id, displayName: event.person.displayName },
        ...(event.otherPerson ? [{ id: event.otherPerson.id, displayName: event.otherPerson.displayName }] : []),
      ],
      generation,
    );
    entries.push({
      id: event.id,
      source: "event",
      kind: kindLabel(event.kind, "event"),
      title: event.title,
      summary: shouldHideLivingFacts(role, event.person) && event.kind === "birth" ? null : event.summary,
      happenedOn: iso(event.happenedOn),
      href: `/people/${event.personId}`,
      people: peopleOn,
      generations: [...new Set(peopleOn.map((person) => person.generation))],
      place: event.place ? placeLabel(event.place) : null,
      mediaUrl: null,
      mimeType: null,
    });
  }

  for (const residence of residences) {
    if (hideResidenceForViewer(role, residence.person)) continue;
    const covered = events.some(
      (event) =>
        event.kind === "residence" &&
        event.personId === residence.personId &&
        (event.placeId === residence.placeId || event.title.includes(residence.place.name)),
    );
    if (covered) continue;
    const peopleOn = attachPeople([{ id: residence.person.id, displayName: residence.person.displayName }], generation);
    entries.push({
      id: residence.id,
      source: "event",
      kind: kindLabel("residence", "event"),
      title: `Lived in ${residence.place.name}`,
      summary: residence.notes,
      happenedOn: iso(residence.startedAt),
      href: `/people/${residence.personId}`,
      people: peopleOn,
      generations: peopleOn.map((person) => person.generation),
      place: placeLabel(residence.place),
      mediaUrl: null,
      mimeType: null,
    });
  }

  for (const document of documents) {
    const peopleOn = attachPeople(
      document.people.map((item) => ({ id: item.person.id, displayName: item.person.displayName })),
      generation,
    );
    entries.push({
      id: document.id,
      source: document.kind === "note" ? "note" : "letter",
      kind: kindLabel(document.kind, document.kind === "note" ? "note" : "letter"),
      title: document.title,
      summary: document.transcript.slice(0, 220),
      happenedOn: iso(document.writtenAt),
      href: `/letters/${document.id}`,
      people: peopleOn,
      generations: [...new Set(peopleOn.map((person) => person.generation))],
      place: null,
      mediaUrl: document.asset ? `/api/media/${document.asset.storagePath}` : null,
      mimeType: document.asset?.mimeType ?? null,
    });
  }

  for (const asset of assets) {
    const peopleOn = attachPeople(
      asset.tags.map((tag) => ({ id: tag.person.id, displayName: tag.person.displayName })),
      generation,
    );
    entries.push({
      id: asset.id,
      source: asset.kind === "video" ? "video" : asset.kind === "audio" ? "audio" : "photo",
      kind: kindLabel(asset.kind, asset.kind === "video" ? "video" : asset.kind === "audio" ? "audio" : "photo"),
      title: asset.title || (asset.kind === "video" ? "Home movie" : asset.kind === "audio" ? "Oral history" : "Photograph"),
      summary: null,
      happenedOn: iso(asset.capturedAt),
      href: "/archive",
      people: peopleOn,
      generations: [...new Set(peopleOn.map((person) => person.generation))],
      place: null,
      mediaUrl: `/api/media/${asset.storagePath}`,
      mimeType: asset.mimeType,
    });
  }

  for (const story of stories) {
    const peopleOn = attachPeople(
      [
        ...(story.teller ? [{ id: story.teller.id, displayName: story.teller.displayName }] : []),
        ...story.people.map((item) => ({ id: item.person.id, displayName: item.person.displayName })),
      ],
      generation,
    );
    entries.push({
      id: story.id,
      source: "story",
      kind: kindLabel("story", "story"),
      title: story.title,
      summary: story.body.slice(0, 220),
      happenedOn: iso(story.recordedAt),
      href: `/stories/${story.id}`,
      people: peopleOn,
      generations: [...new Set(peopleOn.map((person) => person.generation))],
      place: null,
      mediaUrl: null,
      mimeType: null,
    });
  }

  entries.sort((a, b) => {
    if (!a.happenedOn && !b.happenedOn) return a.title.localeCompare(b.title);
    if (!a.happenedOn) return 1;
    if (!b.happenedOn) return -1;
    return a.happenedOn.localeCompare(b.happenedOn) || a.title.localeCompare(b.title);
  });

  const filtered = filterHistory(entries, opts);
  const gaps = computeGaps(filtered);
  const peopleOut = people
    .map((person) => personRef(person.id, person.displayName))
    .sort((a, b) => a.generation - b.generation || a.displayName.localeCompare(b.displayName));
  const missing = filterMissing(
    findMissingFacts({
      people,
      relationships,
      events,
      entries: filtered,
      role,
    }),
    peopleOut,
    opts,
  );
  const genCounts = new Map<number, number>();
  for (const person of peopleOut) {
    genCounts.set(person.generation, (genCounts.get(person.generation) ?? 0) + 1);
  }

  return {
    entries: filtered,
    gaps,
    missing,
    counts: countBySource(filtered),
    people: peopleOut,
    generations: [...genCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([generation, count]) => ({
        generation,
        label: `Generation ${generation + 1}`,
        count,
      })),
  };
}

export async function familyTimeline(familyId: string, role: Role, personId?: string | null) {
  const history = await familyHistory(familyId, role, { personId });
  return history.entries;
}
