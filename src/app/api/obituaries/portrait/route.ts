import { NextResponse } from "next/server";
import { DocKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { obituaryPortraitHeading, obituaryPortraitLine } from "@/lib/obituaryPortrait";

const schema = z.object({
  documentId: z.string(),
  personId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose an obituary and the person it remembers." }, { status: 400 });
  const [document, person] = await Promise.all([
    prisma.document.findFirst({
      where: { id: body.data.documentId, familyId: ctx.family.id, kind: DocKind.obituary, deletedAt: null },
    }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!document) return NextResponse.json({ error: "Obituary not found." }, { status: 404 });
  if (!person || !person.deathDate) return NextResponse.json({ error: "Link the clipping to someone who has a memorial." }, { status: 400 });
  const updated = await prisma.document.update({
    where: { id: document.id },
    data: { memorialPersonId: person.id },
    include: { memorialPerson: true, people: { include: { person: true } } },
  });
  await prisma.documentPerson.upsert({
    where: { documentId_personId: { documentId: document.id, personId: person.id } },
    create: { documentId: document.id, personId: person.id },
    update: {},
  });
  const portrait = person.profileAssetId
    ? await prisma.asset.findFirst({ where: { id: person.profileAssetId, familyId: ctx.family.id, deletedAt: null } })
    : null;
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "linked",
    entityType: "obituary",
    entityId: document.id,
    title: obituaryPortraitLine(document.title, person.displayName),
  });
  return NextResponse.json({
    document: updated,
    heading: obituaryPortraitHeading(person.displayName),
    line: obituaryPortraitLine(document.title, person.displayName),
    portraitUrl: portrait ? `/api/media/${portrait.storagePath}` : null,
  });
}
