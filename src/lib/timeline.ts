import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hideEventFromViewer, shouldHideLivingFacts } from "@/lib/privacy";

export type TimelineEntry = {
  id: string;
  source: "event" | "letter" | "asset" | "story";
  kind: string;
  title: string;
  summary: string | null;
  happenedOn: string | null;
  href: string;
  people: { id: string; displayName: string }[];
  place: string | null;
};

export async function familyTimeline(familyId: string, role: Role, personId?: string | null) {
  const [events, documents, assets, stories] = await Promise.all([
    prisma.lifeEvent.findMany({
      where: {
        familyId,
        ...(personId
          ? { OR: [{ personId }, { otherPersonId: personId }] }
          : {}),
      },
      include: { person: true, otherPerson: true, place: true },
      orderBy: { happenedOn: "asc" },
    }),
    prisma.document.findMany({
      where: {
        familyId,
        kind: { in: ["letter", "note"] },
        ...(personId ? { people: { some: { personId } } } : {}),
      },
      include: { people: { include: { person: true } } },
    }),
    prisma.asset.findMany({
      where: {
        familyId,
        capturedAt: { not: null },
        kind: { not: "letter" },
        document: { is: null },
        ...(personId ? { tags: { some: { personId } } } : {}),
      },
      include: { tags: { include: { person: true } } },
    }),
    prisma.story.findMany({
      where: {
        familyId,
        ...(personId
          ? { OR: [{ tellerPersonId: personId }, { people: { some: { personId } } }] }
          : {}),
      },
      include: { people: { include: { person: true } }, teller: true },
    }),
  ]);

  const entries: TimelineEntry[] = [];

  for (const event of events) {
    if (hideEventFromViewer(role, event)) continue;
    entries.push({
      id: event.id,
      source: "event",
      kind: event.kind,
      title: event.title,
      summary: shouldHideLivingFacts(role, event.person) && event.kind === "birth" ? null : event.summary,
      happenedOn: event.happenedOn ? event.happenedOn.toISOString().slice(0, 10) : null,
      href: `/people/${event.personId}`,
      people: [
        { id: event.person.id, displayName: event.person.displayName },
        ...(event.otherPerson ? [{ id: event.otherPerson.id, displayName: event.otherPerson.displayName }] : []),
      ],
      place: event.place?.name ?? null,
    });
  }

  for (const document of documents) {
    entries.push({
      id: document.id,
      source: "letter",
      kind: document.kind,
      title: document.title,
      summary: document.transcript.slice(0, 180),
      happenedOn: document.writtenAt ? document.writtenAt.toISOString().slice(0, 10) : null,
      href: `/letters/${document.id}`,
      people: document.people.map((item) => ({ id: item.person.id, displayName: item.person.displayName })),
      place: null,
    });
  }

  for (const asset of assets) {
    entries.push({
      id: asset.id,
      source: "asset",
      kind: asset.kind,
      title: asset.title || "Archive item",
      summary: null,
      happenedOn: asset.capturedAt ? asset.capturedAt.toISOString().slice(0, 10) : null,
      href: "/archive",
      people: asset.tags.map((tag) => ({ id: tag.person.id, displayName: tag.person.displayName })),
      place: null,
    });
  }

  for (const story of stories) {
    entries.push({
      id: story.id,
      source: "story",
      kind: "story",
      title: story.title,
      summary: story.body.slice(0, 180),
      happenedOn: story.recordedAt ? story.recordedAt.toISOString().slice(0, 10) : null,
      href: `/stories/${story.id}`,
      people: [
        ...(story.teller ? [{ id: story.teller.id, displayName: story.teller.displayName }] : []),
        ...story.people.map((item) => ({ id: item.person.id, displayName: item.person.displayName })),
      ],
      place: null,
    });
  }

  entries.sort((a, b) => {
    if (!a.happenedOn && !b.happenedOn) return a.title.localeCompare(b.title);
    if (!a.happenedOn) return 1;
    if (!b.happenedOn) return -1;
    return a.happenedOn.localeCompare(b.happenedOn) || a.title.localeCompare(b.title);
  });

  return entries;
}
