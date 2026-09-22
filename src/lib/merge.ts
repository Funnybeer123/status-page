import { prisma } from "@/lib/prisma";

export async function mergePeople(input: { familyId: string; keepId: string; dropId: string }) {
  if (input.keepId === input.dropId) {
    throw new Error("Choose two different people to merge.");
  }
  const [keep, drop] = await Promise.all([
    prisma.person.findFirst({ where: { id: input.keepId, familyId: input.familyId } }),
    prisma.person.findFirst({ where: { id: input.dropId, familyId: input.familyId } }),
  ]);
  if (!keep || !drop) throw new Error("Both people must belong to this family.");

  await prisma.$transaction(async (tx) => {
    const rels = await tx.relationship.findMany({
      where: { familyId: input.familyId, OR: [{ fromPersonId: drop.id }, { toPersonId: drop.id }] },
    });
    for (const rel of rels) {
      const fromPersonId = rel.fromPersonId === drop.id ? keep.id : rel.fromPersonId;
      const toPersonId = rel.toPersonId === drop.id ? keep.id : rel.toPersonId;
      if (fromPersonId === toPersonId) {
        await tx.relationship.delete({ where: { id: rel.id } });
        continue;
      }
      const exists = await tx.relationship.findFirst({
        where: { familyId: input.familyId, type: rel.type, fromPersonId, toPersonId },
      });
      if (exists) await tx.relationship.delete({ where: { id: rel.id } });
      else await tx.relationship.update({ where: { id: rel.id }, data: { fromPersonId, toPersonId } });
    }

    await tx.personName.updateMany({ where: { personId: drop.id }, data: { personId: keep.id } });
    await tx.residence.updateMany({ where: { personId: drop.id }, data: { personId: keep.id } });
    await tx.lifeEvent.updateMany({ where: { personId: drop.id }, data: { personId: keep.id } });
    await tx.lifeEvent.updateMany({ where: { otherPersonId: drop.id }, data: { otherPersonId: keep.id } });
    await tx.citation.updateMany({ where: { personId: drop.id }, data: { personId: keep.id } });
    await tx.story.updateMany({ where: { tellerPersonId: drop.id }, data: { tellerPersonId: keep.id } });
    await tx.chunk.updateMany({ where: { personId: drop.id }, data: { personId: keep.id } });

    const tags = await tx.personTag.findMany({ where: { personId: drop.id } });
    for (const tag of tags) {
      const exists = await tx.personTag.findFirst({ where: { assetId: tag.assetId, personId: keep.id } });
      if (exists) await tx.personTag.delete({ where: { id: tag.id } });
      else await tx.personTag.update({ where: { id: tag.id }, data: { personId: keep.id } });
    }

    const docs = await tx.documentPerson.findMany({ where: { personId: drop.id } });
    for (const link of docs) {
      const exists = await tx.documentPerson.findFirst({
        where: { documentId: link.documentId, personId: keep.id },
      });
      if (exists) await tx.documentPerson.delete({ where: { documentId_personId: { documentId: link.documentId, personId: drop.id } } });
      else {
        await tx.documentPerson.delete({ where: { documentId_personId: { documentId: link.documentId, personId: drop.id } } });
        await tx.documentPerson.create({ data: { documentId: link.documentId, personId: keep.id } });
      }
    }

    const stories = await tx.storyPerson.findMany({ where: { personId: drop.id } });
    for (const link of stories) {
      const exists = await tx.storyPerson.findFirst({ where: { storyId: link.storyId, personId: keep.id } });
      if (exists) await tx.storyPerson.delete({ where: { storyId_personId: { storyId: link.storyId, personId: drop.id } } });
      else {
        await tx.storyPerson.delete({ where: { storyId_personId: { storyId: link.storyId, personId: drop.id } } });
        await tx.storyPerson.create({ data: { storyId: link.storyId, personId: keep.id } });
      }
    }

    await tx.person.update({
      where: { id: keep.id },
      data: {
        givenName: keep.givenName || drop.givenName,
        familyName: keep.familyName || drop.familyName,
        birthDate: keep.birthDate || drop.birthDate,
        deathDate: keep.deathDate || drop.deathDate,
        notes: [keep.notes, drop.notes].filter(Boolean).join("\n\n") || null,
        sex: keep.sex || drop.sex,
        profileAssetId: keep.profileAssetId || drop.profileAssetId,
        favoriteAssetId: keep.favoriteAssetId || drop.favoriteAssetId,
      },
    });
    await tx.person.delete({ where: { id: drop.id } });
  });

  return prisma.person.findFirstOrThrow({ where: { id: keep.id } });
}

export async function mergePlaces(input: { familyId: string; keepId: string; dropId: string }) {
  if (input.keepId === input.dropId) {
    throw new Error("Choose two different places to merge.");
  }
  const [keep, drop] = await Promise.all([
    prisma.place.findFirst({ where: { id: input.keepId, familyId: input.familyId } }),
    prisma.place.findFirst({ where: { id: input.dropId, familyId: input.familyId } }),
  ]);
  if (!keep || !drop) throw new Error("Both places must belong to this family.");

  await prisma.$transaction(async (tx) => {
    await tx.residence.updateMany({ where: { placeId: drop.id }, data: { placeId: keep.id } });
    await tx.lifeEvent.updateMany({ where: { placeId: drop.id }, data: { placeId: keep.id } });
    await tx.familyHome.updateMany({ where: { placeId: drop.id }, data: { placeId: keep.id } });
    await tx.asset.updateMany({ where: { placeId: drop.id }, data: { placeId: keep.id } });
    await tx.place.update({
      where: { id: keep.id },
      data: {
        locality: keep.locality || drop.locality,
        region: keep.region || drop.region,
        country: keep.country || drop.country,
        latitude: keep.latitude ?? drop.latitude,
        longitude: keep.longitude ?? drop.longitude,
      },
    });
    await tx.place.delete({ where: { id: drop.id } });
  });

  return prisma.place.findFirstOrThrow({ where: { id: keep.id } });
}

function earlier(a?: Date | null, b?: Date | null) {
  if (!a) return b ?? null;
  if (!b) return a;
  return a.getTime() <= b.getTime() ? a : b;
}

function later(a?: Date | null, b?: Date | null) {
  if (!a) return b ?? null;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

export async function mergeHomes(input: { familyId: string; keepId: string; dropId: string }) {
  if (input.keepId === input.dropId) {
    throw new Error("Choose two different houses to merge.");
  }
  const [keep, drop] = await Promise.all([
    prisma.familyHome.findFirst({ where: { id: input.keepId, familyId: input.familyId } }),
    prisma.familyHome.findFirst({ where: { id: input.dropId, familyId: input.familyId } }),
  ]);
  if (!keep || !drop) throw new Error("Both houses must belong to this family.");

  await prisma.$transaction(async (tx) => {
    await tx.familyHomePhoto.updateMany({ where: { homeId: drop.id }, data: { homeId: keep.id } });
    await tx.landRecord.updateMany({ where: { homeId: drop.id }, data: { homeId: keep.id } });
    await tx.familyFarm.updateMany({ where: { homeId: drop.id }, data: { homeId: keep.id } });

    const residents = await tx.familyHomeResident.findMany({ where: { homeId: drop.id } });
    for (const row of residents) {
      const exists = await tx.familyHomeResident.findUnique({
        where: { homeId_personId: { homeId: keep.id, personId: row.personId } },
      });
      if (exists) {
        await tx.familyHomeResident.update({
          where: { homeId_personId: { homeId: keep.id, personId: row.personId } },
          data: {
            startedOn: earlier(exists.startedOn, row.startedOn),
            endedOn: later(exists.endedOn, row.endedOn),
          },
        });
        await tx.familyHomeResident.delete({
          where: { homeId_personId: { homeId: drop.id, personId: row.personId } },
        });
      } else {
        await tx.familyHomeResident.delete({
          where: { homeId_personId: { homeId: drop.id, personId: row.personId } },
        });
        await tx.familyHomeResident.create({
          data: {
            homeId: keep.id,
            personId: row.personId,
            startedOn: row.startedOn,
            endedOn: row.endedOn,
          },
        });
      }
    }

    await tx.familyHome.update({
      where: { id: keep.id },
      data: {
        line: keep.line || drop.line,
        locality: keep.locality || drop.locality,
        region: keep.region || drop.region,
        notes: [keep.notes, drop.notes].filter(Boolean).join("\n\n") || null,
        placeId: keep.placeId || drop.placeId,
      },
    });
    await tx.familyHome.delete({ where: { id: drop.id } });
  });

  return prisma.familyHome.findFirstOrThrow({
    where: { id: keep.id },
    include: { photos: true, residents: { include: { person: true } }, landRecords: true, farms: true },
  });
}
