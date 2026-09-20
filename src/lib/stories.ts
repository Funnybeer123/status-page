import { DocKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { replaceChunks } from "@/lib/chunk";

export async function createStoryRecord(input: {
  familyId: string;
  title: string;
  body: string;
  recordedAt?: Date | null;
  tellerPersonId?: string | null;
  personIds?: string[];
}) {
  const personIds = [...new Set(input.personIds?.filter(Boolean) ?? [])];
  const document = await prisma.document.create({
    data: {
      familyId: input.familyId,
      title: input.title,
      kind: DocKind.story,
      transcript: input.body,
      writtenAt: input.recordedAt ?? null,
      people: personIds.length ? { create: personIds.map((personId) => ({ personId })) } : undefined,
    },
  });
  await replaceChunks({
    familyId: input.familyId,
    documentId: document.id,
    personId: input.tellerPersonId ?? personIds[0],
    transcript: input.body,
  });
  const story = await prisma.story.create({
    data: {
      familyId: input.familyId,
      title: input.title,
      body: input.body,
      recordedAt: input.recordedAt ?? null,
      tellerPersonId: input.tellerPersonId ?? null,
      documentId: document.id,
      people: personIds.length ? { create: personIds.map((personId) => ({ personId })) } : undefined,
    },
    include: {
      teller: true,
      people: { include: { person: true } },
      document: true,
      citations: true,
    },
  });
  return story;
}
