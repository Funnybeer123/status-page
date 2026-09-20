import { EventKind, RelType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function syncVitalEvents(input: {
  familyId: string;
  personId: string;
  displayName: string;
  birthDate?: Date | null;
  deathDate?: Date | null;
}) {
  await upsertVital({
    familyId: input.familyId,
    personId: input.personId,
    kind: EventKind.birth,
    title: `${input.displayName} born`,
    happenedOn: input.birthDate ?? null,
  });
  await upsertVital({
    familyId: input.familyId,
    personId: input.personId,
    kind: EventKind.death,
    title: `${input.displayName} died`,
    happenedOn: input.deathDate ?? null,
  });
}

async function upsertVital(input: {
  familyId: string;
  personId: string;
  kind: EventKind;
  title: string;
  happenedOn: Date | null;
}) {
  const existing = await prisma.lifeEvent.findFirst({
    where: { familyId: input.familyId, personId: input.personId, kind: input.kind, otherPersonId: null },
  });
  if (!input.happenedOn) {
    if (existing && (input.kind === EventKind.birth || input.kind === EventKind.death)) {
      await prisma.lifeEvent.delete({ where: { id: existing.id } });
    }
    return null;
  }
  if (existing) {
    return prisma.lifeEvent.update({
      where: { id: existing.id },
      data: { title: input.title, happenedOn: input.happenedOn },
    });
  }
  return prisma.lifeEvent.create({
    data: {
      familyId: input.familyId,
      personId: input.personId,
      kind: input.kind,
      title: input.title,
      happenedOn: input.happenedOn,
    },
  });
}

export async function recordMarriageEvent(input: {
  familyId: string;
  fromPersonId: string;
  toPersonId: string;
  startedAt?: Date | null;
  fromName: string;
  toName: string;
}) {
  const existing = await prisma.lifeEvent.findFirst({
    where: {
      familyId: input.familyId,
      kind: EventKind.marriage,
      OR: [
        { personId: input.fromPersonId, otherPersonId: input.toPersonId },
        { personId: input.toPersonId, otherPersonId: input.fromPersonId },
      ],
    },
  });
  const title = `${input.fromName} and ${input.toName} married`;
  if (existing) {
    return prisma.lifeEvent.update({
      where: { id: existing.id },
      data: { title, happenedOn: input.startedAt ?? existing.happenedOn },
    });
  }
  return prisma.lifeEvent.create({
    data: {
      familyId: input.familyId,
      personId: input.fromPersonId,
      otherPersonId: input.toPersonId,
      kind: EventKind.marriage,
      title,
      happenedOn: input.startedAt ?? null,
    },
  });
}

export async function recordResidenceEvent(input: {
  familyId: string;
  personId: string;
  placeName: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
  placeId?: string | null;
}) {
  const title = input.endedAt
    ? `Lived in ${input.placeName}`
    : `Moved to ${input.placeName}`;
  return prisma.lifeEvent.create({
    data: {
      familyId: input.familyId,
      personId: input.personId,
      placeId: input.placeId ?? null,
      kind: EventKind.residence,
      title,
      happenedOn: input.startedAt ?? null,
      summary: input.endedAt ? `Until ${input.endedAt.toISOString().slice(0, 10)}` : null,
    },
  });
}

export function isPartnerRel(type: RelType | string) {
  return type === RelType.partner || type === "partner";
}
