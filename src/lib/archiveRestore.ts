import { DocKind, EventKind, NameKind, RelType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDate } from "@/lib/parse";

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asId(value: unknown) {
  return typeof value === "string" && value ? value : "";
}

export async function restoreFamilyArchive(input: {
  familyId: string;
  archive: Record<string, unknown>;
  createdById: string;
}) {
  const people = Array.isArray(input.archive.people) ? input.archive.people : [];
  const places = Array.isArray(input.archive.places) ? input.archive.places : [];
  const names = Array.isArray(input.archive.names) ? input.archive.names : [];
  const residences = Array.isArray(input.archive.residences) ? input.archive.residences : [];
  const events = Array.isArray(input.archive.events) ? input.archive.events : [];
  const relationships = Array.isArray(input.archive.relationships) ? input.archive.relationships : [];
  const documents = Array.isArray(input.archive.documents) ? input.archive.documents : [];
  const stories = Array.isArray(input.archive.stories) ? input.archive.stories : [];
  const albums = Array.isArray(input.archive.albums) ? input.archive.albums : [];
  const heirlooms = Array.isArray(input.archive.heirlooms) ? input.archive.heirlooms : [];
  const traditions = Array.isArray(input.archive.traditions) ? input.archive.traditions : [];
  const tasks = Array.isArray(input.archive.tasks) ? input.archive.tasks : [];

  const personIds = new Map<string, string>();
  const placeIds = new Map<string, string>();
  const documentIds = new Map<string, string>();
  const storyIds = new Map<string, string>();

  for (const raw of people) {
    const row = raw as Record<string, unknown>;
    const created = await prisma.person.create({
      data: {
        familyId: input.familyId,
        displayName: asString(row.displayName) || "Unknown",
        givenName: asString(row.givenName) || null,
        familyName: asString(row.familyName) || null,
        birthDate: parseDate(asString(row.birthDate)),
        deathDate: parseDate(asString(row.deathDate)),
        notes: asString(row.notes) || null,
        sex: asString(row.sex) || null,
      },
    });
    if (asId(row.id)) personIds.set(asId(row.id), created.id);
  }

  for (const raw of places) {
    const row = raw as Record<string, unknown>;
    const created = await prisma.place.create({
      data: {
        familyId: input.familyId,
        name: asString(row.name) || "Place",
        locality: asString(row.locality) || null,
        region: asString(row.region) || null,
        country: asString(row.country) || null,
        latitude: typeof row.latitude === "number" ? row.latitude : null,
        longitude: typeof row.longitude === "number" ? row.longitude : null,
      },
    });
    if (asId(row.id)) placeIds.set(asId(row.id), created.id);
  }

  for (const raw of names) {
    const row = raw as Record<string, unknown>;
    const personId = personIds.get(asId(row.personId));
    if (!personId || !asString(row.name)) continue;
    const kind = Object.values(NameKind).includes(row.kind as NameKind) ? (row.kind as NameKind) : NameKind.aka;
    await prisma.personName.create({
      data: {
        familyId: input.familyId,
        personId,
        kind,
        name: asString(row.name),
        startedAt: parseDate(asString(row.startedAt)),
        endedAt: parseDate(asString(row.endedAt)),
      },
    });
  }

  for (const raw of residences) {
    const row = raw as Record<string, unknown>;
    const personId = personIds.get(asId(row.personId));
    const placeId = placeIds.get(asId(row.placeId)) || placeIds.get(asId((row.place as { id?: string } | undefined)?.id));
    if (!personId || !placeId) continue;
    await prisma.residence.create({
      data: {
        familyId: input.familyId,
        personId,
        placeId,
        startedAt: parseDate(asString(row.startedAt)),
        endedAt: parseDate(asString(row.endedAt)),
        notes: asString(row.notes) || null,
      },
    });
  }

  for (const raw of events) {
    const row = raw as Record<string, unknown>;
    const personId = personIds.get(asId(row.personId));
    if (!personId || !asString(row.title)) continue;
    const kind = Object.values(EventKind).includes(row.kind as EventKind) ? (row.kind as EventKind) : EventKind.other;
    await prisma.lifeEvent.create({
      data: {
        familyId: input.familyId,
        personId,
        otherPersonId: personIds.get(asId(row.otherPersonId)) || null,
        placeId: placeIds.get(asId(row.placeId)) || null,
        kind,
        title: asString(row.title),
        summary: asString(row.summary) || null,
        happenedOn: parseDate(asString(row.happenedOn)),
      },
    });
  }

  for (const raw of relationships) {
    const row = raw as Record<string, unknown>;
    const fromPersonId = personIds.get(asId(row.fromPersonId));
    const toPersonId = personIds.get(asId(row.toPersonId));
    if (!fromPersonId || !toPersonId) continue;
    const type = row.type === "parent" ? RelType.parent : RelType.partner;
    await prisma.relationship.create({
      data: {
        familyId: input.familyId,
        fromPersonId,
        toPersonId,
        type,
        startedAt: parseDate(asString(row.startedAt)),
        endedAt: parseDate(asString(row.endedAt)),
      },
    });
  }

  for (const raw of documents) {
    const row = raw as Record<string, unknown>;
    const kind = Object.values(DocKind).includes(row.kind as DocKind) ? (row.kind as DocKind) : DocKind.note;
    const created = await prisma.document.create({
      data: {
        familyId: input.familyId,
        title: asString(row.title) || "Untitled",
        kind,
        transcript: asString(row.transcript),
        writtenAt: parseDate(asString(row.writtenAt)),
      },
    });
    if (asId(row.id)) documentIds.set(asId(row.id), created.id);
    const personIdsOn = Array.isArray(row.personIds) ? row.personIds : [];
    for (const oldId of personIdsOn) {
      const personId = personIds.get(asId(oldId));
      if (!personId) continue;
      await prisma.documentPerson.create({ data: { documentId: created.id, personId } });
    }
  }

  for (const raw of stories) {
    const row = raw as Record<string, unknown>;
    const created = await prisma.story.create({
      data: {
        familyId: input.familyId,
        title: asString(row.title) || "Story",
        body: asString(row.body),
        recordedAt: parseDate(asString(row.recordedAt)),
        tellerPersonId: personIds.get(asId(row.tellerPersonId)) || null,
      },
    });
    if (asId(row.id)) storyIds.set(asId(row.id), created.id);
    const personIdsOn = Array.isArray(row.personIds) ? row.personIds : [];
    for (const oldId of personIdsOn) {
      const personId = personIds.get(asId(oldId));
      if (!personId) continue;
      await prisma.storyPerson.create({ data: { storyId: created.id, personId } });
    }
  }

  for (const raw of albums) {
    const row = raw as Record<string, unknown>;
    if (!asString(row.title)) continue;
    const created = await prisma.album.create({
      data: {
        familyId: input.familyId,
        title: asString(row.title),
        summary: asString(row.summary) || null,
        createdById: input.createdById,
      },
    });
    const items = Array.isArray(row.items) ? row.items : [];
    for (const item of items) {
      const rowItem = item as Record<string, unknown>;
      const documentId = documentIds.get(asId(rowItem.documentId));
      const storyId = storyIds.get(asId(rowItem.storyId));
      if (!documentId && !storyId) continue;
      await prisma.albumItem.create({
        data: { albumId: created.id, documentId: documentId || null, storyId: storyId || null },
      });
    }
  }

  for (const raw of heirlooms) {
    const row = raw as Record<string, unknown>;
    if (!asString(row.title)) continue;
    await prisma.heirloom.create({
      data: {
        familyId: input.familyId,
        personId: personIds.get(asId(row.personId)) || null,
        title: asString(row.title),
        summary: asString(row.summary) || null,
        acquiredAt: parseDate(asString(row.acquiredAt)),
      },
    });
  }

  for (const raw of traditions) {
    const row = raw as Record<string, unknown>;
    if (!asString(row.title)) continue;
    await prisma.tradition.create({
      data: {
        familyId: input.familyId,
        personId: personIds.get(asId(row.personId)) || null,
        title: asString(row.title),
        summary: asString(row.summary) || null,
        season: asString(row.season) || null,
      },
    });
  }

  for (const raw of tasks) {
    const row = raw as Record<string, unknown>;
    if (!asString(row.title)) continue;
    await prisma.researchTask.create({
      data: {
        familyId: input.familyId,
        personId: personIds.get(asId(row.personId)) || null,
        title: asString(row.title),
        body: asString(row.body) || null,
        doneAt: parseDate(asString(row.doneAt)),
        createdById: input.createdById,
      },
    });
  }

  return {
    people: personIds.size,
    places: placeIds.size,
    documents: documentIds.size,
    stories: storyIds.size,
  };
}
